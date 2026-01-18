import { ConvexError, v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
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
