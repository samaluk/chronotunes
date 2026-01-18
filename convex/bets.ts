import { ConvexError, v } from "convex/values";
import { mutation } from "./_generated/server";

export const preview = mutation({
  args: { lobbyId: v.id("lobbies"), sessionId: v.string(), proposedIndex: v.number() },
  handler: async (ctx, args) => {
    const { lobbyId, sessionId, proposedIndex } = args;

    const lobby = await ctx.db.get(lobbyId);

    if (!lobby) {
      throw new ConvexError("Lobby not found");
    }

    if (!lobby.activeGameId) {
      throw new ConvexError("No active game in this lobby");
    }

    const game = await ctx.db.get(lobby.activeGameId);

    if (!game) {
      throw new ConvexError("Game not found");
    }

    if (!game.currentRoundId) {
      throw new ConvexError("No current round in this game");
    }

    const round = await ctx.db.get(game.currentRoundId);

    if (!round) {
      throw new ConvexError("Round not found");
    }

    if (round.phase === "resolved") {
      throw new ConvexError("Cannot place bets after round is resolved");
    }

    const player = await ctx.db
      .query("players")
      .filter((q) =>
        q.and(q.eq(q.field("lobbyId"), lobbyId), q.eq(q.field("sessionId"), sessionId)),
      )
      .first();

    if (!player) {
      throw new ConvexError("Player not found in this lobby");
    }

    if (round.turnPlayerId === player._id) {
      throw new ConvexError("Turn player cannot place bets");
    }

    if (player.coins < 1) {
      throw new ConvexError("Not enough coins to place a bet");
    }

    if (proposedIndex < 0) {
      throw new ConvexError("Proposed index cannot be negative");
    }

    const existingBet = await ctx.db
      .query("roundBets")
      .filter((q) =>
        q.and(q.eq(q.field("roundId"), round._id), q.eq(q.field("playerId"), player._id)),
      )
      .first();

    if (existingBet?.lockedIn) {
      throw new ConvexError("Cannot change a locked bet");
    }

    if (existingBet) {
      await ctx.db.patch(existingBet._id, {
        proposedIndex,
        placedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("roundBets", {
        roundId: round._id,
        playerId: player._id,
        proposedIndex,
        placedAt: Date.now(),
        lockedIn: false,
        status: "pending",
      });

      await ctx.db.patch(player._id, {
        coins: player.coins - 1,
      });
    }
  },
});

export const lockIn = mutation({
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

    const game = await ctx.db.get(lobby.activeGameId);

    if (!game) {
      throw new ConvexError("Game not found");
    }

    if (!game.currentRoundId) {
      throw new ConvexError("No current round in this game");
    }

    const round = await ctx.db.get(game.currentRoundId);

    if (!round) {
      throw new ConvexError("Round not found");
    }

    if (round.phase === "resolved") {
      throw new ConvexError("Cannot lock in bet after round is resolved");
    }

    const player = await ctx.db
      .query("players")
      .filter((q) =>
        q.and(q.eq(q.field("lobbyId"), lobbyId), q.eq(q.field("sessionId"), sessionId)),
      )
      .first();

    if (!player) {
      throw new ConvexError("Player not found in this lobby");
    }

    const existingBet = await ctx.db
      .query("roundBets")
      .filter((q) =>
        q.and(q.eq(q.field("roundId"), round._id), q.eq(q.field("playerId"), player._id)),
      )
      .first();

    if (!existingBet) {
      throw new ConvexError("No bet to lock in");
    }

    if (existingBet.lockedIn) {
      throw new ConvexError("Bet is already locked in");
    }

    await ctx.db.patch(existingBet._id, {
      lockedIn: true,
    });
  },
});

export const cancel = mutation({
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

    const game = await ctx.db.get(lobby.activeGameId);

    if (!game) {
      throw new ConvexError("Game not found");
    }

    if (!game.currentRoundId) {
      throw new ConvexError("No current round in this game");
    }

    const round = await ctx.db.get(game.currentRoundId);

    if (!round) {
      throw new ConvexError("Round not found");
    }

    if (round.phase === "resolved") {
      throw new ConvexError("Cannot cancel bet after round is resolved");
    }

    const player = await ctx.db
      .query("players")
      .filter((q) =>
        q.and(q.eq(q.field("lobbyId"), lobbyId), q.eq(q.field("sessionId"), sessionId)),
      )
      .first();

    if (!player) {
      throw new ConvexError("Player not found in this lobby");
    }

    const existingBet = await ctx.db
      .query("roundBets")
      .filter((q) =>
        q.and(q.eq(q.field("roundId"), round._id), q.eq(q.field("playerId"), player._id)),
      )
      .first();

    if (!existingBet) {
      throw new ConvexError("No bet to cancel");
    }

    if (existingBet.lockedIn) {
      throw new ConvexError("Cannot cancel a locked bet");
    }

    await ctx.db.delete(existingBet._id);

    await ctx.db.patch(player._id, {
      coins: player.coins + 1,
    });
  },
});
