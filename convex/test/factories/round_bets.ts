import type { Infer } from "convex/values";

import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import type schema from "../../schema";
import { readFirstWhere, readAllWhere } from "./shared";
import type { FactoryResult, TestContext } from "./types";

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
  overrides: BetOverrides = {},
): Promise<FactoryResult<"roundBets">> {
  const data: RoundBet = {
    lockedIn: overrides.lockedIn ?? false,
    placedAt: Date.now(),
    playerId,
    proposedIndex: overrides.proposedIndex ?? 0,
    roundId,
    status: overrides.status ?? "pending",
  };

  return await t.run(async (ctx: MutationCtx) => {
    const betId = await ctx.db.insert("roundBets", data);
    return { id: betId, record: data };
  });
}

export function createLocked(
  t: TestContext,
  roundId: Id<"rounds">,
  playerId: Id<"players">,
  proposedIndex: number,
): Promise<FactoryResult<"roundBets">> {
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
  } = {},
): Promise<FactoryResult<"roundBets">[]> {
  return await Promise.all(
    playerIds.map((playerId) =>
      create(t, roundId, playerId, {
        lockedIn: options.lockedIn ?? false,
        proposedIndex: options.proposedIndex ?? 0,
      }),
    ),
  );
}

export function findByPlayerAndRound(
  t: TestContext,
  roundId: Id<"rounds">,
  playerId: Id<"players">,
): Promise<FactoryResult<"roundBets"> | null> {
  return readFirstWhere(t, "roundBets", (q) =>
    q.and(q.eq(q.field("roundId"), roundId), q.eq(q.field("playerId"), playerId)),
  );
}

export function findAllInRound(
  t: TestContext,
  roundId: Id<"rounds">,
): Promise<FactoryResult<"roundBets">[]> {
  return readAllWhere(t, "roundBets", (q) => q.eq(q.field("roundId"), roundId));
}
