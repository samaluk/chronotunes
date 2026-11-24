import type { Id } from "../../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../../_generated/server";
import type { FactoryResult, TestContext } from "./types";
import {
  buildRoundData,
  resolveRoundContext,
  readResult,
  type Round,
  type RoundOverrides,
} from "./shared";

export type { Round, RoundOverrides };

export async function create(
  t: TestContext,
  gameId: Id<"games">,
  overrides: RoundOverrides = {},
): Promise<FactoryResult<"rounds">> {
  const resolved = await t.run(async (ctx: QueryCtx) =>
    resolveRoundContext(ctx, gameId, overrides),
  );

  const data = buildRoundData(
    gameId,
    resolved,
    {
      phase: overrides.phase,
      roundNumber: overrides.roundNumber,
    },
    overrides,
  );

  const roundId = await t.run(async (ctx: MutationCtx) => ctx.db.insert("rounds", data));

  return { id: roundId, record: data };
}

export async function createInPhase(
  t: TestContext,
  gameId: Id<"games">,
  phase: "placing" | "betting" | "resolved",
  options: {
    placementIndex?: number;
    resolution?: Round["resolution"];
    roundNumber?: number;
    trackId?: Id<"tracks">;
    turnPlayerId?: Id<"players">;
  } = {},
): Promise<{ id: Id<"rounds">; record: Round; turnPlayerId: Id<"players"> }> {
  const resolved = await t.run(async (ctx: QueryCtx) => resolveRoundContext(ctx, gameId, options));

  const data = buildRoundData(gameId, resolved, {
    phase,
    roundNumber: options.roundNumber,
  });

  if (phase === "betting" || phase === "resolved") {
    data.placement = {
      proposedIndex: options.placementIndex ?? 0,
      submittedAt: Date.now(),
    };
  }

  if (phase === "resolved") {
    data.resolution = options.resolution ?? {
      awardedPlayerIds: [],
      coinDeltas: [],
      resolvedAt: Date.now(),
      turnPlayerWasCorrect: true,
      validIndexMax: 1,
      validIndexMin: 0,
    };
  }

  const roundId = await t.run(async (ctx: MutationCtx) => ctx.db.insert("rounds", data));

  return { id: roundId, record: data, turnPlayerId: resolved.turnPlayerId };
}

export function findCurrent(
  t: TestContext,
  gameId: Id<"games">,
): Promise<FactoryResult<"rounds"> | null> {
  return readResult(t, async (ctx: QueryCtx) => {
    const game = await ctx.db.get(gameId);
    if (game?.currentRoundId) {
      return await ctx.db.get(game.currentRoundId);
    }
    return null;
  });
}

export function findById(
  t: TestContext,
  roundId: Id<"rounds">,
): Promise<FactoryResult<"rounds"> | null> {
  return readResult(t, async (ctx: QueryCtx) => ctx.db.get(roundId));
}
