import { ConvexError, v } from "convex/values";

import type { Doc, Id } from "./_generated/dataModel";
import { query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { getGameContext, getLobbyPlayers } from "./lib/game_context";
import { computeValidIndexRange, isPlacementCorrect } from "./lib/game_logic";
import type { TimelineEntry } from "./lib/game_logic";
import { createNextRound, shuffleArray } from "./lib/round_management";
import { mutationWithSession } from "./lib/sessions";

const getLobbyOrThrow = async (ctx: MutationCtx, lobbyId: Id<"lobbies">) => {
  const lobby = await ctx.db.get(lobbyId);

  if (!lobby) {
    throw new ConvexError("Lobby not found");
  }

  return lobby;
};

const assertHostSession = (lobby: Doc<"lobbies">, sessionId: string, message: string) => {
  if (lobby.hostSessionId !== sessionId) {
    throw new ConvexError(message);
  }
};

const assertLobbyStatus = (
  lobby: Doc<"lobbies">,
  status: Doc<"lobbies">["status"],
  message: string,
) => {
  if (lobby.status !== status) {
    throw new ConvexError(message);
  }
};

/**
 * Loads the lobby and asserts the caller's session is its host. Shared
 * preamble of every host-only mutation; `hostErrorMessage` preserves each
 * action-specific access error.
 */
const getHostLobbyOrThrow = async (
  ctx: MutationCtx,
  lobbyId: Id<"lobbies">,
  sessionId: string,
  hostErrorMessage: string,
): Promise<Doc<"lobbies">> => {
  const lobby = await getLobbyOrThrow(ctx, lobbyId);
  assertHostSession(lobby, sessionId, hostErrorMessage);
  return lobby;
};

const assertGameActive = (game: Doc<"games">) => {
  if (game.status !== "active") {
    throw new ConvexError("Game is not active");
  }
};

const createTimelineUpdates = (players: Doc<"players">[]) => {
  const updates = new Map<
    Id<"players">,
    { newTimeline: TimelineEntry[]; newTimelineSize: number }
  >();
  for (const player of players) {
    updates.set(player._id, {
      newTimeline: [...player.timeline],
      newTimelineSize: player.timelineSize,
    });
  }
  return updates;
};

const ensureAllNonTurnPlayersActed = (
  players: Doc<"players">[],
  turnPlayerId: Id<"players">,
  lockedBets: Doc<"roundBets">[],
  declinedBets: Doc<"roundBets">[],
) => {
  const nonTurnPlayers = players.filter((player) => player._id !== turnPlayerId);

  const allNonTurnPlayersActed = nonTurnPlayers.every(
    (player) =>
      lockedBets.some((bet) => bet.playerId === player._id) ||
      declinedBets.some((bet) => bet.playerId === player._id),
  );

  if (!allNonTurnPlayersActed) {
    throw new ConvexError("Not all players have placed bets or declined");
  }
};

const applyTurnPlayerPlacement = (
  timelineUpdates: Map<Id<"players">, { newTimeline: TimelineEntry[]; newTimelineSize: number }>,
  turnPlayerId: Id<"players">,
  track: Doc<"tracks">,
  roundNumber: number,
  proposedIndex: number,
  turnPlayerWasCorrect: boolean,
) => {
  const awardedPlayerIds: Id<"players">[] = [];

  if (turnPlayerWasCorrect) {
    const turnPlayerUpdate = timelineUpdates.get(turnPlayerId);

    if (!turnPlayerUpdate) {
      return awardedPlayerIds;
    }

    turnPlayerUpdate.newTimeline.splice(proposedIndex, 0, {
      earnedAtRoundNumber: roundNumber,
      earnedBy: "placement",
      trackId: track._id,
      year: track.year,
    });

    turnPlayerUpdate.newTimelineSize += 1;
    awardedPlayerIds.push(turnPlayerId);
  }

  return awardedPlayerIds;
};

const applyLockedBets = async (
  ctx: MutationCtx,
  lockedBets: Doc<"roundBets">[],
  timelineUpdates: Map<Id<"players">, { newTimeline: TimelineEntry[]; newTimelineSize: number }>,
  track: Doc<"tracks">,
  roundNumber: number,
  validRange: { min: number; max: number },
  turnPlayerWasCorrect: boolean,
) => {
  const awardedPlayerIds: Id<"players">[] = [];
  const coinDeltas: { playerId: Id<"players">; delta: number }[] = [];
  const betStatuses: { betId: Id<"roundBets">; status: "lost" | "won" }[] = [];

  /* Synchronous pass: resolve outcomes and splice shared timeline state in
     bet order. Each patch below touches a different document, so the writes
     run in parallel afterwards. */
  for (const bet of lockedBets) {
    const bettorWasCorrect = isPlacementCorrect(bet.proposedIndex, validRange);

    if (turnPlayerWasCorrect || !bettorWasCorrect) {
      coinDeltas.push({ delta: 0, playerId: bet.playerId });
      betStatuses.push({ betId: bet._id, status: "lost" });
      continue;
    }

    const bettorUpdate = timelineUpdates.get(bet.playerId);
    if (!bettorUpdate) {
      coinDeltas.push({ delta: 0, playerId: bet.playerId });
      betStatuses.push({ betId: bet._id, status: "lost" });
      continue;
    }

    bettorUpdate.newTimeline.splice(bet.proposedIndex, 0, {
      earnedAtRoundNumber: roundNumber,
      earnedBy: "bet",
      trackId: track._id,
      year: track.year,
    });

    bettorUpdate.newTimelineSize += 1;
    awardedPlayerIds.push(bet.playerId);
    coinDeltas.push({ delta: 0, playerId: bet.playerId });
    betStatuses.push({ betId: bet._id, status: "won" });
  }

  await Promise.all(
    betStatuses.map((betStatus) => ctx.db.patch(betStatus.betId, { status: betStatus.status })),
  );

  return { awardedPlayerIds, coinDeltas };
};

const applyDeclinedBets = async (ctx: MutationCtx, declinedBets: Doc<"roundBets">[]) => {
  await Promise.all(declinedBets.map((bet) => ctx.db.patch(bet._id, { status: "lost" })));
};

// fallow-ignore-next-line code-duplication -- Convex handler scaffolding is idiomatic; these near-clone spans pair unrelated handlers.
const persistTimelineUpdates = async (
  ctx: MutationCtx,
  timelineUpdates: Map<Id<"players">, { newTimeline: TimelineEntry[]; newTimelineSize: number }>,
) => {
  await Promise.all(
    Array.from(timelineUpdates.entries(), ([playerId, update]) =>
      ctx.db.patch(playerId, {
        timeline: update.newTimeline,
        timelineSize: update.newTimelineSize,
      }),
    ),
  );
};

export const start = mutationWithSession({
  args: { lobbyId: v.id("lobbies") },
  handler: async (ctx, args) => {
    const { lobbyId } = args;
    const { sessionId } = ctx;

    const lobby = await getHostLobbyOrThrow(
      ctx,
      lobbyId,
      sessionId,
      "Only the host can start the game",
    );

    assertLobbyStatus(lobby, "lobby", "Game has already started");

    const players = await getLobbyPlayers(ctx, lobbyId);

    if (players.length < 2) {
      throw new ConvexError("At least 2 players are required to start a game");
    }

    await Promise.all(
      players.map((player) => ctx.db.patch(player._id, { coins: lobby.settings.startingCoins })),
    );

    const turnOrder = shuffleArray(players.map((p) => p._id));

    // The game record and the track pool are independent reads/writes.
    const [gameId, tracks] = await Promise.all([
      ctx.db.insert("games", {
        currentRoundNumber: 1,
        lobbyId,
        startedAt: Date.now(),
        status: "active",
        turnOrder,
        turnPlayerId: turnOrder[0],
      }),
      ctx.db
        .query("tracks")
        .filter((q) =>
          q.and(
            q.gte(q.field("year"), lobby.settings.minYear),
            q.lte(q.field("year"), lobby.settings.maxYear),
          ),
        )
        .collect(),
    ]);

    if (tracks.length < players.length) {
      throw new ConvexError(
        `Not enough tracks for all players. Have ${tracks.length} tracks but need at least ${players.length} tracks (one per player)`,
      );
    }

    const usedTrackIds = new Set<Id<"tracks">>();
    const playerInitialTracks = new Map<Id<"players">, { trackId: Id<"tracks">; year: number }>();

    /* Synchronous pass: each player claims a unique track in order. The
       patches below touch different player documents, so the writes run in
       parallel afterwards. */
    const initialTimelines: {
      playerId: Id<"players">;
      timeline: TimelineEntry[];
      timelineSize: number;
    }[] = [];

    for (const player of players) {
      const availableTracks = tracks.filter((t) => !usedTrackIds.has(t._id));

      if (availableTracks.length === 0) {
        throw new ConvexError("Not enough unique tracks for all players");
      }

      const randomIndex = Math.floor(Math.random() * availableTracks.length);
      // oxlint-disable-next-line typescript/no-non-null-assertion, typescript/no-unnecessary-type-assertion
      const selectedTrack = availableTracks[randomIndex]!;

      usedTrackIds.add(selectedTrack._id);
      playerInitialTracks.set(player._id, {
        trackId: selectedTrack._id,
        year: selectedTrack.year,
      });

      initialTimelines.push({
        playerId: player._id,
        timeline: [
          {
            earnedAtRoundNumber: 0,
            earnedBy: "placement",
            trackId: selectedTrack._id,
            year: selectedTrack.year,
          },
        ],
        timelineSize: 1,
      });
    }

    await Promise.all(
      initialTimelines.map((initialTimeline) =>
        ctx.db.patch(initialTimeline.playerId, {
          timeline: initialTimeline.timeline,
          timelineSize: initialTimeline.timelineSize,
        }),
      ),
    );

    let startingPlayerId: Id<"players"> | null = null;
    let oldestYear = Number.POSITIVE_INFINITY;

    for (const player of players) {
      const initialTrack = playerInitialTracks.get(player._id);

      if (initialTrack && initialTrack.year < oldestYear) {
        oldestYear = initialTrack.year;
        startingPlayerId = player._id;
      }
    }

    if (!startingPlayerId) {
      throw new ConvexError("Could not determine starting player");
    }

    await ctx.db.patch(gameId, {
      turnPlayerId: startingPlayerId,
    });

    const usedTrackIdsForRounds = new Set(usedTrackIds);
    const availableRoundTracks = tracks.filter((t) => !usedTrackIdsForRounds.has(t._id));

    if (availableRoundTracks.length === 0) {
      throw new ConvexError("No tracks available for the first round");
    }

    const randomIndex = Math.floor(Math.random() * availableRoundTracks.length);
    // oxlint-disable-next-line typescript/no-non-null-assertion, typescript/no-unnecessary-type-assertion
    const firstTrack = availableRoundTracks[randomIndex]!;

    const roundId = await ctx.db.insert("rounds", {
      gameId,
      phase: "placing",
      roundNumber: 1,
      startedAt: Date.now(),
      trackId: firstTrack._id,
      turnPlayerId: startingPlayerId,
    });

    await ctx.db.patch(gameId, { currentRoundId: roundId });

    await ctx.db.patch(lobbyId, {
      activeGameId: gameId,
      status: "in_game",
    });

    return { gameId, roundId };
  },
});

export const getCurrent = query({
  args: { lobbyId: v.id("lobbies") },
  handler: async (ctx, args) => {
    const lobby = await ctx.db.get(args.lobbyId);

    if (!lobby?.activeGameId) {
      return null;
    }

    return await ctx.db.get(lobby.activeGameId);
  },
});

export const skipTurn = mutationWithSession({
  args: { lobbyId: v.id("lobbies") },
  handler: async (ctx, args) => {
    const { lobbyId } = args;
    const { sessionId } = ctx;

    // Host check and game load are independent reads.
    const [lobby, { game }] = await Promise.all([
      getHostLobbyOrThrow(ctx, lobbyId, sessionId, "Only the host can skip a turn"),
      getGameContext(ctx, lobbyId),
    ]);

    assertGameActive(game);

    const result = await createNextRound(ctx, game, lobby);

    if ("gameEnded" in result) {
      return { gameEnded: true, noTracksAvailable: true, winnerPlayerId: null };
    }

    // fallow-ignore-next-line code-duplication -- resolveAndNext's result shape is unique to this handler; the matched span is scaffolding only.
    return {
      gameEnded: false,
      nextRoundId: result.nextRoundId,
      nextTurnPlayerId: result.nextTurnPlayerId,
      winnerPlayerId: null,
    };
  },
});

export const resolveAndNext = mutationWithSession({
  args: { lobbyId: v.id("lobbies") },
  handler: async (ctx, args) => {
    const { lobbyId } = args;
    const { sessionId } = ctx;

    // Host check and game/round load are independent reads.
    const [lobby, { game, round }] = await Promise.all([
      getHostLobbyOrThrow(ctx, lobbyId, sessionId, "Only the host can start the next round"),
      getGameContext(ctx, lobbyId),
    ]);

    assertGameActive(game);

    if (!round) {
      throw new ConvexError("No current round in this game");
    }

    if (round.phase !== "resolved") {
      throw new ConvexError("Can only start next round when round is resolved");
    }

    if (!round.placement) {
      throw new ConvexError("Round placement has not been submitted");
    }

    if (!round.resolution) {
      throw new ConvexError("Round has not been resolved");
    }

    const result = await createNextRound(ctx, game, lobby);

    if ("gameEnded" in result) {
      return {
        gameEnded: true,
        nextRoundId: null,
        nextTurnPlayerId: null,
        noTracksAvailable: true,
        winnerPlayerId: null,
      };
    }

    return {
      gameEnded: false,
      nextRoundId: result.nextRoundId,
      nextTurnPlayerId: result.nextTurnPlayerId,
      winnerPlayerId: null,
    };
  },
});

export const resolveRound = mutationWithSession({
  args: { lobbyId: v.id("lobbies") },
  handler: async (ctx, args) => {
    const { lobbyId } = args;
    const { sessionId } = ctx;

    await getHostLobbyOrThrow(ctx, lobbyId, sessionId, "Only the host can resolve the round");

    const { game, round } = await getGameContext(ctx, lobbyId);

    assertGameActive(game);

    if (!round || round.phase !== "betting" || !round.placement) {
      throw new ConvexError("Cannot resolve round");
    }

    const track = await ctx.db.get(round.trackId);

    if (!track) {
      throw new ConvexError("Track not found");
    }

    const players = await getLobbyPlayers(ctx, lobbyId);
    const turnPlayer = players.find((player) => player._id === round.turnPlayerId);

    if (!turnPlayer) {
      throw new ConvexError("Turn player not found");
    }

    const allBets = await ctx.db
      .query("roundBets")
      .withIndex("by_round", (q) => q.eq("roundId", round._id))
      .collect();

    const lockedBets = allBets.filter((bet) => bet.lockedIn);
    const declinedBets = allBets.filter((bet) => bet.declinedToBet);

    ensureAllNonTurnPlayersActed(players, round.turnPlayerId, lockedBets, declinedBets);

    const validRange = computeValidIndexRange(turnPlayer.timeline, track.year);
    const turnPlayerWasCorrect = isPlacementCorrect(round.placement.proposedIndex, validRange);

    const timelineUpdates = createTimelineUpdates(players);
    const awardedPlayerIds = applyTurnPlayerPlacement(
      timelineUpdates,
      round.turnPlayerId,
      track,
      round.roundNumber,
      round.placement.proposedIndex,
      turnPlayerWasCorrect,
    );

    const lockedBetResults = await applyLockedBets(
      ctx,
      lockedBets,
      timelineUpdates,
      track,
      round.roundNumber,
      validRange,
      turnPlayerWasCorrect,
    );

    awardedPlayerIds.push(...lockedBetResults.awardedPlayerIds);

    await applyDeclinedBets(ctx, declinedBets);
    await persistTimelineUpdates(ctx, timelineUpdates);

    await ctx.db.patch(round._id, {
      phase: "resolved",
      resolution: {
        awardedPlayerIds,
        coinDeltas: lockedBetResults.coinDeltas,
        resolvedAt: Date.now(),
        turnPlayerWasCorrect,
        validIndexMax: validRange.max,
        validIndexMin: validRange.min,
      },
    });

    return {
      awardedPlayerIds,
      success: true,
      turnPlayerWasCorrect,
    };
  },
});

/** Loads the finished game for a lobby, or null when none exists. */
const getFinishedGame = async (ctx: QueryCtx, lobbyId: Id<"lobbies">) => {
  const lobby = await ctx.db.get(lobbyId);

  if (!lobby?.activeGameId) {
    return null;
  }

  return ctx.db.get(lobby.activeGameId);
};

const toRoundWithTrack = async (ctx: QueryCtx, round: Doc<"rounds">) => {
  const track = await ctx.db.get(round.trackId);

  return {
    ...round,
    track: track
      ? {
          _id: track._id,
          artist: track.artist,
          title: track.title,
          year: track.year,
        }
      : null,
  };
};

const toPlayerSummary = (player: Doc<"players">) => ({
  _id: player._id,
  coins: player.coins,
  displayName: player.displayName,
  isHost: player.isHost,
  timeline: player.timeline,
  timelineSize: player.timelineSize,
});

const toGameSummary = (game: Doc<"games">) => ({
  _id: game._id,
  currentRoundNumber: game.currentRoundNumber,
  endedAt: game.endedAt,
  startedAt: game.startedAt,
  status: game.status,
  winnerPlayerId: game.winnerPlayerId,
});

// fallow-ignore-next-line code-duplication -- getResults is a read-model query; its handler preamble mirrors mutations by Convex convention, not shared logic.
export const getResults = query({
  args: { lobbyId: v.id("lobbies") },
  handler: async (ctx, args) => {
    const game = await getFinishedGame(ctx, args.lobbyId);

    if (!game) {
      return null;
    }

    // Player list and round history are independent reads.
    const [players, rounds] = await Promise.all([
      getLobbyPlayers(ctx, args.lobbyId),
      ctx.db
        .query("rounds")
        .withIndex("by_game", (q) => q.eq("gameId", game._id))
        .collect(),
    ]);

    const roundsWithTracks = await Promise.all(rounds.map((round) => toRoundWithTrack(ctx, round)));

    return {
      game: toGameSummary(game),
      players: players.map(toPlayerSummary),
      rounds: roundsWithTracks,
    };
  },
});

export const playAgain = mutationWithSession({
  args: { lobbyId: v.id("lobbies") },
  handler: async (ctx, args) => {
    const { lobbyId } = args;
    const { sessionId } = ctx;

    const lobby = await getHostLobbyOrThrow(
      ctx,
      lobbyId,
      sessionId,
      "Only the host can restart the game",
    );

    assertLobbyStatus(lobby, "finished", "Game is not finished");

    await ctx.db.patch(lobbyId, {
      activeGameId: undefined,
      status: "lobby",
    });

    const players = await getLobbyPlayers(ctx, lobbyId);

    await Promise.all(
      players.map((player) =>
        ctx.db.patch(player._id, {
          coins: lobby.settings.startingCoins,
          timeline: [],
          timelineSize: 0,
        }),
      ),
    );

    if (lobby.activeGameId) {
      const rounds = await ctx.db
        .query("rounds")
        .filter((q) => q.eq(q.field("gameId"), lobby.activeGameId))
        .collect();

      await Promise.all(rounds.map((round) => ctx.db.delete(round._id)));

      const game = await ctx.db.get(lobby.activeGameId);

      if (game) {
        await ctx.db.delete(game._id);
      }
    }

    return { success: true };
  },
});
