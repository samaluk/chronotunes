import { ConvexError, v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { computeValidIndexRange, isPlacementCorrect, type TimelineEntry } from "./lib/gameLogic";
import { selectTrackForRound } from "./lib/trackSelection";

function shuffleArray<T>(array: readonly T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i >= 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = shuffled[i]!;
    shuffled[i] = shuffled[j]!;
    shuffled[j] = temp;
  }
  return shuffled;
}

export const start = mutation({
  args: { lobbyId: v.id("lobbies"), sessionId: v.string() },
  handler: async (ctx, args) => {
    const { lobbyId, sessionId } = args;

    const lobby = await ctx.db.get(lobbyId);

    if (!lobby) {
      throw new ConvexError("Lobby not found");
    }

    if (lobby.hostSessionId !== sessionId) {
      throw new ConvexError("Only the host can start the game");
    }

    if (lobby.status !== "lobby") {
      throw new ConvexError("Game has already started");
    }

    const players = await ctx.db
      .query("players")
      .filter((q) => q.eq(q.field("lobbyId"), lobbyId))
      .collect();

    if (players.length < 2) {
      throw new ConvexError("At least 2 players are required to start a game");
    }

    const turnOrder = shuffleArray(players.map((p) => p._id));
    const firstTurnPlayerId = turnOrder[0]!;

    const gameId = await ctx.db.insert("games", {
      lobbyId,
      status: "active",
      startedAt: Date.now(),
      currentRoundNumber: 1,
      turnOrder,
      turnPlayerId: firstTurnPlayerId,
    });

    const tracks = await ctx.db
      .query("tracks")
      .filter((q) =>
        q.and(
          q.gte(q.field("year"), lobby.settings.minYear),
          q.lte(q.field("year"), lobby.settings.maxYear),
        ),
      )
      .collect();

    let trackId: Id<"tracks">;
    if (tracks.length > 0) {
      const randomIndex = Math.floor(Math.random() * tracks.length);
      const randomTrack = tracks[randomIndex]!;
      trackId = randomTrack._id;
    } else {
      throw new ConvexError("No tracks available for the selected year range");
    }

    const roundId = await ctx.db.insert("rounds", {
      gameId,
      roundNumber: 1,
      turnPlayerId: firstTurnPlayerId,
      trackId,
      phase: "placing",
      startedAt: Date.now(),
    });

    await ctx.db.patch(gameId, { currentRoundId: roundId });

    await ctx.db.patch(lobbyId, {
      status: "in_game",
      activeGameId: gameId,
    });

    return { gameId, roundId };
  },
});

export const getCurrent = query({
  args: { lobbyId: v.id("lobbies") },
  handler: async (ctx, args) => {
    const { lobbyId } = args;

    const lobby = await ctx.db.get(lobbyId);

    if (!lobby || !lobby.activeGameId) {
      return null;
    }

    const game = await ctx.db.get(lobby.activeGameId);

    return game;
  },
});

export const skipTurn = mutation({
  args: { lobbyId: v.id("lobbies"), sessionId: v.string() },
  handler: async (ctx, args) => {
    const { lobbyId, sessionId } = args;

    const lobby = await ctx.db.get(lobbyId);

    if (!lobby) {
      throw new ConvexError("Lobby not found");
    }

    if (!lobby.activeGameId) {
      throw new ConvexError("No active game in this lobby");
    }

    if (lobby.hostSessionId !== sessionId) {
      throw new ConvexError("Only the host can skip a turn");
    }

    const game = await ctx.db.get(lobby.activeGameId);

    if (!game) {
      throw new ConvexError("Game not found");
    }

    if (game.status !== "active") {
      throw new ConvexError("Game is not active");
    }

    const currentTurnIndex = game.turnOrder.indexOf(game.turnPlayerId!);
    const nextTurnIndex = (currentTurnIndex + 1) % game.turnOrder.length;
    const nextTurnPlayerId = game.turnOrder[nextTurnIndex]!;

    const nextRoundNumber = game.currentRoundNumber + 1;
    const selectedTrack = await selectTrackForRound(ctx, {
      gameId: game._id,
      minYear: lobby.settings.minYear,
      maxYear: lobby.settings.maxYear,
    });

    if (!selectedTrack) {
      await ctx.db.patch(game._id, {
        status: "finished",
        endedAt: Date.now(),
      });

      await ctx.db.patch(lobbyId, {
        status: "finished",
      });

      return { gameEnded: true, winnerPlayerId: null, noTracksAvailable: true };
    }

    const nextRoundId = await ctx.db.insert("rounds", {
      gameId: game._id,
      roundNumber: nextRoundNumber,
      turnPlayerId: nextTurnPlayerId,
      trackId: selectedTrack.trackId,
      phase: "placing",
      startedAt: Date.now(),
    });

    await ctx.db.patch(game._id, {
      currentRoundNumber: nextRoundNumber,
      currentRoundId: nextRoundId,
      turnPlayerId: nextTurnPlayerId,
    });

    return {
      gameEnded: false,
      winnerPlayerId: null,
      nextRoundId,
      nextTurnPlayerId,
    };
  },
});

export const resolveAndNext = mutation({
  args: { lobbyId: v.id("lobbies"), sessionId: v.string() },
  handler: async (ctx, args) => {
    const { lobbyId, sessionId } = args;

    const lobby = await ctx.db.get(lobbyId);

    if (!lobby) {
      throw new ConvexError("Lobby not found");
    }

    if (!lobby.activeGameId) {
      throw new ConvexError("No active game in this lobby");
    }

    if (lobby.hostSessionId !== sessionId) {
      throw new ConvexError("Only the host can resolve the round");
    }

    const game = await ctx.db.get(lobby.activeGameId);

    if (!game) {
      throw new ConvexError("Game not found");
    }

    if (game.status !== "active") {
      throw new ConvexError("Game is not active");
    }

    if (!game.currentRoundId) {
      throw new ConvexError("No current round in this game");
    }

    const round = await ctx.db.get(game.currentRoundId);

    if (!round) {
      throw new ConvexError("Round not found");
    }

    if (round.phase !== "betting") {
      throw new ConvexError("Can only resolve round during betting phase");
    }

    if (!round.placement) {
      throw new ConvexError("Round placement has not been submitted");
    }

    const track = await ctx.db.get(round.trackId);

    if (!track) {
      throw new ConvexError("Track not found");
    }

    const turnPlayer = await ctx.db.get(round.turnPlayerId);

    if (!turnPlayer) {
      throw new ConvexError("Turn player not found");
    }

    const validRange = computeValidIndexRange(turnPlayer.timeline, track.year);
    const turnPlayerWasCorrect = isPlacementCorrect(round.placement.proposedIndex, validRange);

    const allBets = await ctx.db
      .query("roundBets")
      .withIndex("by_round", (q) => q.eq("roundId", round._id))
      .collect();

    const lockedBets = allBets.filter((bet) => bet.lockedIn);

    const coinDeltas: { playerId: Id<"players">; delta: number }[] = [];
    const awardedPlayerIds: Id<"players">[] = [];

    const timelineUpdates: Map<
      Id<"players">,
      { newTimeline: TimelineEntry[]; newTimelineSize: number }
    > = new Map();

    for (const player of await ctx.db
      .query("players")
      .filter((q) => q.eq(q.field("lobbyId"), lobbyId))
      .collect()) {
      timelineUpdates.set(player._id, {
        newTimeline: [...player.timeline],
        newTimelineSize: player.timelineSize,
      });
    }

    if (turnPlayerWasCorrect) {
      const turnPlayerUpdate = timelineUpdates.get(turnPlayer._id)!;
      turnPlayerUpdate.newTimeline.splice(round.placement.proposedIndex, 0, {
        trackId: track._id,
        year: track.year,
        earnedAtRoundNumber: round.roundNumber,
        earnedBy: "placement",
      });
      turnPlayerUpdate.newTimelineSize += 1;
      awardedPlayerIds.push(turnPlayer._id);
    }

    for (const bet of lockedBets) {
      const bettor = await ctx.db.get(bet.playerId);

      if (!bettor) {
        continue;
      }

      const bettorWasCorrect = isPlacementCorrect(bet.proposedIndex, validRange);

      if (turnPlayerWasCorrect) {
        coinDeltas.push({ playerId: bettor._id, delta: 0 });
        await ctx.db.patch(bet._id, { status: "lost" });
      } else if (bettorWasCorrect) {
        const bettorUpdate = timelineUpdates.get(bettor._id)!;
        bettorUpdate.newTimeline.splice(bet.proposedIndex, 0, {
          trackId: track._id,
          year: track.year,
          earnedAtRoundNumber: round.roundNumber,
          earnedBy: "bet",
        });
        bettorUpdate.newTimelineSize += 1;
        awardedPlayerIds.push(bettor._id);
        coinDeltas.push({ playerId: bettor._id, delta: 0 });
        await ctx.db.patch(bet._id, { status: "won" });
      } else {
        coinDeltas.push({ playerId: bettor._id, delta: 0 });
        await ctx.db.patch(bet._id, { status: "lost" });
      }
    }

    for (const [playerId, update] of timelineUpdates) {
      await ctx.db.patch(playerId, {
        timeline: update.newTimeline,
        timelineSize: update.newTimelineSize,
      });
    }

    await ctx.db.patch(round._id, {
      phase: "resolved",
      resolution: {
        validIndexMin: validRange.min,
        validIndexMax: validRange.max,
        turnPlayerWasCorrect,
        awardedPlayerIds,
        coinDeltas,
        resolvedAt: Date.now(),
      },
    });

    const targetTimelineSize = lobby.settings.targetTimelineSize;

    const winner = Array.from(timelineUpdates.entries()).find(
      ([, update]) => update.newTimelineSize >= targetTimelineSize,
    );

    if (winner) {
      await ctx.db.patch(game._id, {
        status: "finished",
        endedAt: Date.now(),
        winnerPlayerId: winner[0],
      });

      await ctx.db.patch(lobbyId, {
        status: "finished",
      });

      return {
        gameEnded: true,
        winnerPlayerId: winner[0],
        nextRoundId: null,
        nextTurnPlayerId: null,
      };
    }

    const currentTurnIndex = game.turnOrder.indexOf(game.turnPlayerId!);
    const nextTurnIndex = (currentTurnIndex + 1) % game.turnOrder.length;
    const nextTurnPlayerId = game.turnOrder[nextTurnIndex]!;

    const nextRoundNumber = game.currentRoundNumber + 1;
    const selectedTrack = await selectTrackForRound(ctx, {
      gameId: game._id,
      minYear: lobby.settings.minYear,
      maxYear: lobby.settings.maxYear,
    });

    if (!selectedTrack) {
      await ctx.db.patch(game._id, {
        status: "finished",
        endedAt: Date.now(),
      });

      await ctx.db.patch(lobbyId, {
        status: "finished",
      });

      return {
        gameEnded: true,
        winnerPlayerId: null,
        nextRoundId: null,
        nextTurnPlayerId: null,
        noTracksAvailable: true,
      };
    }

    const nextRoundId = await ctx.db.insert("rounds", {
      gameId: game._id,
      roundNumber: nextRoundNumber,
      turnPlayerId: nextTurnPlayerId,
      trackId: selectedTrack.trackId,
      phase: "placing",
      startedAt: Date.now(),
    });

    await ctx.db.patch(game._id, {
      currentRoundNumber: nextRoundNumber,
      currentRoundId: nextRoundId,
      turnPlayerId: nextTurnPlayerId,
    });

    return {
      gameEnded: false,
      winnerPlayerId: null,
      nextRoundId,
      nextTurnPlayerId,
    };
  },
});
