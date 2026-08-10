import { ConvexError, v } from "convex/values";

import type { Doc, Id } from "./_generated/dataModel";
import { query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import { getGameContext, getPlayerBySession } from "./lib/game_context";
import { mutationWithSession } from "./lib/sessions";

interface BetWithPlayer {
  declinedToBet: boolean;
  lockedIn: boolean;
  placedAt: number;
  playerDisplayName: string;
  playerId: Id<"players">;
  proposedIndex: number;
  status: "pending" | "won" | "lost";
}

const requireBettingRound = (
  round: Doc<"rounds"> | null | undefined,
  message: string,
): Doc<"rounds"> => {
  if (!round || round.phase !== "betting") {
    throw new ConvexError(message);
  }
  return round;
};

const assertCanBet = (player: Doc<"players">, round: Doc<"rounds">) => {
  if (round.turnPlayerId === player._id) {
    throw new ConvexError("Turn player cannot place bets");
  }

  if (player.coins < 1) {
    throw new ConvexError("Not enough coins to place a bet");
  }
};

const assertValidProposedIndex = (proposedIndex: number, timelineLength: number) => {
  if (proposedIndex < 0) {
    throw new ConvexError("Proposed index cannot be negative");
  }

  if (proposedIndex > timelineLength) {
    throw new ConvexError("Proposed index is out of range");
  }
};

const assertNotTurnPlacement = (round: Doc<"rounds">, proposedIndex: number) => {
  if (round.placement?.proposedIndex === proposedIndex) {
    throw new ConvexError("Cannot bet on the turn player's placement");
  }
};

const getBetForPlayer = (ctx: MutationCtx, roundId: Id<"rounds">, playerId: Id<"players">) =>
  ctx.db
    .query("roundBets")
    .withIndex("by_round_and_player", (q) => q.eq("roundId", roundId).eq("playerId", playerId))
    .first();

const getLockedBetForSlot = (ctx: MutationCtx, roundId: Id<"rounds">, proposedIndex: number) =>
  ctx.db
    .query("roundBets")
    .withIndex("by_round", (q) => q.eq("roundId", roundId))
    .filter((q) => q.eq(q.field("proposedIndex"), proposedIndex))
    .first();

export const preview = mutationWithSession({
  args: { lobbyId: v.id("lobbies"), proposedIndex: v.number() },
  handler: async (ctx, args) => {
    const { lobbyId, proposedIndex } = args;
    const { sessionId } = ctx;

    const { round } = await getGameContext(ctx, lobbyId);
    const bettingRound = requireBettingRound(
      round,
      "Can only place bets after placement is locked in",
    );

    const player = await getPlayerBySession(ctx, lobbyId, sessionId);

    assertCanBet(player, bettingRound);

    const turnPlayer = await ctx.db.get(bettingRound.turnPlayerId);

    if (!turnPlayer) {
      throw new ConvexError("Turn player not found");
    }

    assertValidProposedIndex(proposedIndex, turnPlayer.timeline.length);
    assertNotTurnPlacement(bettingRound, proposedIndex);

    const existingBet = await getBetForPlayer(ctx, bettingRound._id, player._id);

    if (existingBet?.lockedIn) {
      throw new ConvexError("Cannot change a locked bet");
    }

    const slotBet = await getLockedBetForSlot(ctx, bettingRound._id, proposedIndex);

    if (slotBet && slotBet.playerId !== player._id && slotBet.lockedIn) {
      throw new ConvexError("That placement slot is already taken");
    }

    const now = Date.now();

    if (existingBet) {
      await ctx.db.patch(existingBet._id, {
        placedAt: now,
        proposedIndex,
      });
      return;
    }

    await ctx.db.insert("roundBets", {
      lockedIn: false,
      placedAt: now,
      playerId: player._id,
      proposedIndex,
      roundId: bettingRound._id,
      status: "pending",
    });
  },
});

export const lockIn = mutationWithSession({
  args: { lobbyId: v.id("lobbies") },
  handler: async (ctx, args) => {
    const { lobbyId } = args;
    const { sessionId } = ctx;

    const { round } = await getGameContext(ctx, lobbyId);
    const bettingRound = requireBettingRound(round, "Can only lock in bets during betting phase");

    const player = await getPlayerBySession(ctx, lobbyId, sessionId);

    const existingBet = await getBetForPlayer(ctx, bettingRound._id, player._id);

    if (!existingBet) {
      throw new ConvexError("No bet to lock in");
    }

    if (existingBet.lockedIn) {
      throw new ConvexError("Bet is already locked in");
    }

    assertNotTurnPlacement(bettingRound, existingBet.proposedIndex);

    if (player.coins < 1) {
      throw new ConvexError("Not enough coins to lock in bet");
    }

    await ctx.db.patch(existingBet._id, {
      lockedIn: true,
    });

    await ctx.db.patch(player._id, {
      coins: player.coins - 1,
    });
  },
});

export const cancel = mutationWithSession({
  args: { lobbyId: v.id("lobbies") },
  handler: async (ctx, args) => {
    const { lobbyId } = args;
    const { sessionId } = ctx;

    const { round } = await getGameContext(ctx, lobbyId);
    const bettingRound = requireBettingRound(round, "Can only cancel bets during betting phase");

    const player = await getPlayerBySession(ctx, lobbyId, sessionId);

    const existingBet = await getBetForPlayer(ctx, bettingRound._id, player._id);

    if (!existingBet) {
      throw new ConvexError("No bet to cancel");
    }

    if (existingBet.lockedIn) {
      throw new ConvexError("Cannot cancel a locked bet");
    }

    await ctx.db.delete(existingBet._id);
  },
});

export const listForRound = query({
  args: { lobbyId: v.id("lobbies") },
  handler: async (ctx, args): Promise<BetWithPlayer[]> => {
    const lobby = await ctx.db.get(args.lobbyId);

    if (!lobby?.activeGameId) {
      return [];
    }

    const game = await ctx.db.get(lobby.activeGameId);

    if (!game?.currentRoundId) {
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

    let betsToReturn = bets;

    if (round.phase !== "betting" && !lobby.settings.showLiveBets) {
      betsToReturn = bets.filter((bet) => bet.lockedIn || bet.declinedToBet);
    }

    const players = await Promise.all(betsToReturn.map((bet) => ctx.db.get(bet.playerId)));
    // oxlint-disable-next-line typescript/no-non-null-assertion
    const playersById = new Map(players.filter(Boolean).map((player) => [player!._id, player!]));

    return betsToReturn
      .map((bet) => {
        const player = playersById.get(bet.playerId);

        if (!player) {
          return null;
        }

        return {
          declinedToBet: bet.declinedToBet ?? false,
          lockedIn: bet.lockedIn,
          placedAt: bet.placedAt,
          playerDisplayName: player.displayName,
          playerId: bet.playerId,
          proposedIndex: bet.proposedIndex,
          status: bet.status,
        };
      })
      .filter((bet): bet is BetWithPlayer => bet !== null);
  },
});
