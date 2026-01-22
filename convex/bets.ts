import { ConvexError, v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { query } from "./_generated/server";
import { mutationWithSession } from "./lib/sessions";

export const preview = mutationWithSession({
  args: { lobbyId: v.id("lobbies"), proposedIndex: v.number() },
  handler: async (ctx, args) => {
    const { lobbyId, proposedIndex } = args;
    const { sessionId } = ctx;

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

    if (round.phase !== "betting") {
      throw new ConvexError("Can only place bets after placement is locked in");
    }

    const player = await ctx.db
      .query("players")
      .withIndex("by_lobby_and_session", (q) => q.eq("lobbyId", lobbyId).eq("sessionId", sessionId))
      .unique();

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

    const turnPlayer = await ctx.db.get(round.turnPlayerId);

    if (!turnPlayer) {
      throw new ConvexError("Turn player not found");
    }

    if (proposedIndex > turnPlayer.timeline.length) {
      throw new ConvexError("Proposed index is out of range");
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

    const slotBet = await ctx.db
      .query("roundBets")
      .withIndex("by_round", (q) => q.eq("roundId", round._id))
      .filter((q) => q.eq(q.field("proposedIndex"), proposedIndex))
      .first();

    if (slotBet && slotBet.playerId !== player._id) {
      throw new ConvexError("That placement slot is already taken");
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

export const lockIn = mutationWithSession({
  args: { lobbyId: v.id("lobbies") },
  handler: async (ctx, args) => {
    const { lobbyId } = args;
    const { sessionId } = ctx;

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

    if (round.phase !== "betting") {
      throw new ConvexError("Can only lock in bets during betting phase");
    }

    const player = await ctx.db
      .query("players")
      .withIndex("by_lobby_and_session", (q) => q.eq("lobbyId", lobbyId).eq("sessionId", sessionId))
      .unique();

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

export const cancel = mutationWithSession({
  args: { lobbyId: v.id("lobbies") },
  handler: async (ctx, args) => {
    const { lobbyId } = args;
    const { sessionId } = ctx;

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

    if (round.phase !== "betting") {
      throw new ConvexError("Can only cancel bets during betting phase");
    }

    const player = await ctx.db
      .query("players")
      .withIndex("by_lobby_and_session", (q) => q.eq("lobbyId", lobbyId).eq("sessionId", sessionId))
      .unique();

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

type BetWithPlayer = {
  playerId: Id<"players">;
  playerDisplayName: string;
  proposedIndex: number;
  placedAt: number;
  lockedIn: boolean;
  status: "pending" | "won" | "lost";
};

export const listForRound = query({
  args: { lobbyId: v.id("lobbies") },
  handler: async (ctx, args): Promise<BetWithPlayer[]> => {
    const { lobbyId } = args;

    const lobby = await ctx.db.get(lobbyId);

    if (!lobby) {
      throw new ConvexError("Lobby not found");
    }

    if (!lobby.activeGameId) {
      return [];
    }

    const game = await ctx.db.get(lobby.activeGameId);

    if (!game || !game.currentRoundId) {
      return [];
    }

    const round = await ctx.db.get(game.currentRoundId);

    if (!round) {
      return [];
    }

    const bets = await ctx.db
      .query("roundBets")
      .withIndex("by_round", (q) => q.eq("roundId", round._id))
      .collect();

    if (bets.length === 0) {
      return [];
    }

    const showLiveBets = lobby.settings.showLiveBets;

    const filteredBets = showLiveBets ? bets : bets.filter((bet) => bet.lockedIn);

    const betsWithPlayers: BetWithPlayer[] = [];

    for (const bet of filteredBets) {
      const player = await ctx.db.get(bet.playerId);

      if (player) {
        betsWithPlayers.push({
          playerId: bet.playerId,
          playerDisplayName: player.displayName,
          proposedIndex: bet.proposedIndex,
          placedAt: bet.placedAt,
          lockedIn: bet.lockedIn,
          status: bet.status,
        });
      }
    }

    return betsWithPlayers;
  },
});
