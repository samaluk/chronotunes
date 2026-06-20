import type { Infer } from "convex/values";

import type { Id } from "../../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../../_generated/server";
import type schema from "../../schema";
import type { TestContext } from "./types";

export type RoundBet = Infer<typeof schema.tables.roundBets.validator>;

export interface BetOverrides {
  lockedIn?: boolean;
  proposedIndex?: number;
  status?: RoundBet["status"];
}

export async function create(
  t: TestContext,
  roundId: Id<"rounds">,
  playerId: Id<"players">,
  overrides: BetOverrides = {}
): Promise<{ id: Id<"roundBets">; record: RoundBet }> {
  const data: RoundBet = {
    lockedIn: overrides.lockedIn ?? false,
    placedAt: Date.now(),
    playerId,
    proposedIndex: overrides.proposedIndex ?? 0,
    roundId,
    status: overrides.status ?? "pending",
  };

  let betId: Id<"roundBets"> | null = null;

  await t.run(async (ctx: MutationCtx) => {
    betId = await ctx.db.insert("roundBets", data);
  });

  if (!betId) {
    throw new Error("Failed to create bet");
  }

  return { id: betId, record: data };
}

export function createLocked(
  t: TestContext,
  roundId: Id<"rounds">,
  playerId: Id<"players">,
  proposedIndex: number
): Promise<{ id: Id<"roundBets">; record: RoundBet }> {
  return create(t, roundId, playerId, {
    lockedIn: true,
    proposedIndex,
  });
}

export async function createMany(
  t: TestContext,
  roundId: Id<"rounds">,
  playerIds: Id<"players">[],
  options: {
    proposedIndex?: number;
    lockedIn?: boolean;
  } = {}
): Promise<{ id: Id<"roundBets">; record: RoundBet }[]> {
  return await Promise.all(
    playerIds.map((playerId) =>
      create(t, roundId, playerId, {
        lockedIn: options.lockedIn ?? false,
        proposedIndex: options.proposedIndex ?? 0,
      })
    )
  );
}

export async function findByPlayerAndRound(
  t: TestContext,
  roundId: Id<"rounds">,
  playerId: Id<"players">
): Promise<{ id: Id<"roundBets">; record: RoundBet } | null> {
  let result: { id: Id<"roundBets">; record: RoundBet } | null = null;

  await t.run(async (ctx: QueryCtx) => {
    const bet = await ctx.db
      .query("roundBets")
      .filter((q) =>
        q.and(
          q.eq(q.field("roundId"), roundId),
          q.eq(q.field("playerId"), playerId)
        )
      )
      .first();

    if (bet) {
      result = { id: bet._id, record: bet as RoundBet };
    }
  });

  return result;
}

export async function findAllInRound(
  t: TestContext,
  roundId: Id<"rounds">
): Promise<{ id: Id<"roundBets">; record: RoundBet }[]> {
  let results: { id: Id<"roundBets">; record: RoundBet }[] = [];

  await t.run(async (ctx: QueryCtx) => {
    const bets = await ctx.db
      .query("roundBets")
      .filter((q) => q.eq(q.field("roundId"), roundId))
      .collect();

    results = bets.map((b) => ({
      id: b._id,
      record: b as RoundBet,
    }));
  });

  return results;
}
