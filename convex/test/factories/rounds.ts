import type { Id } from "../../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../../_generated/server";
import type { TestContext } from "./types";
import { buildRoundData, resolveRoundContext, type Round, type RoundOverrides } from "./shared";

export type { Round, RoundOverrides };

export async function create(
  t: TestContext,
  gameId: Id<"games">,
  overrides: RoundOverrides = {},
): Promise<{ id: Id<"rounds">; record: Round }> {
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

export async function findCurrent(t: TestContext, gameId: Id<"games">) {
  await t.run(async (ctx: QueryCtx) => {
    const game = await ctx.db.get(gameId);
    if (game?.currentRoundId) {
      const round = await ctx.db.get(game.currentRoundId);
      if (!round) {
        return null;
      }
      return { id: round._id, record: round };
    }
    return null;
  });
}

export async function findById(t: TestContext, roundId: Id<"rounds">) {
  let result: { id: Id<"rounds">; record: Round } | null = null;

  await t.run(async (ctx: QueryCtx) => {
    const round = await ctx.db.get(roundId);
    if (round) {
      result = { id: round._id, record: round };
    }
  });

  return result;
}
