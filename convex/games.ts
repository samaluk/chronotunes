import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const start = mutation({
  args: { lobbyId: v.id("lobbies") },
  handler: async (ctx, args) => {
    const { lobbyId } = args;

    const lobby = await ctx.db.get(lobbyId);

    if (!lobby) {
      throw new ConvexError("Lobby not found");
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

    const turnOrder = players.map((p) => p._id);

    const gameId = await ctx.db.insert("games", {
      lobbyId,
      status: "active",
      startedAt: Date.now(),
      currentRoundNumber: 1,
      turnOrder,
    });

    await ctx.db.patch(lobbyId, {
      status: "in_game",
      activeGameId: gameId,
    });

    return { gameId };
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
