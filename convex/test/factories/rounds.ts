import type { Infer } from "convex/values";
import type { Id } from "../../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../../_generated/server";
import type schema from "../../schema";
import type { TestContext } from "./types";

export type Round = Infer<typeof schema.tables.rounds.validator>;

export interface RoundOverrides {
  roundNumber?: number;
  phase?: Round["phase"];
  trackId?: Round["trackId"];
  turnPlayerId?: Round["turnPlayerId"];
  placement?: Round["placement"];
  placementPreview?: Round["placementPreview"];
  guess?: Round["guess"];
  resolution?: Round["resolution"];
}

export async function create(
  t: TestContext,
  gameId: Id<"games">,
  overrides: RoundOverrides = {},
): Promise<{ id: Id<"rounds">; record: Round }> {
  let turnPlayerId = overrides.turnPlayerId;
  let trackId = overrides.trackId;

  await t.run(async (ctx: QueryCtx) => {
    if (!turnPlayerId) {
      const game = await ctx.db.get(gameId);
      turnPlayerId = game?.turnPlayerId;
    }
    if (!trackId) {
      const track = await ctx.db.query("tracks").first();
      trackId = track?._id;
    }
  });

  if (!(turnPlayerId && trackId)) {
    throw new Error("Could not determine turnPlayerId or trackId for round");
  }

  const data: Round = {
    gameId,
    roundNumber: overrides.roundNumber ?? 1,
    turnPlayerId,
    trackId,
    phase: overrides.phase ?? "placing",
    startedAt: Date.now(),
    ...(overrides.placementPreview !== undefined && {
      placementPreview: overrides.placementPreview,
    }),
    ...(overrides.placement !== undefined && {
      placement: overrides.placement,
    }),
    ...(overrides.guess !== undefined && {
      guess: overrides.guess,
    }),
    ...(overrides.resolution !== undefined && {
      resolution: overrides.resolution,
    }),
  };

  let roundId: Id<"rounds"> | null = null;

  await t.run(async (ctx: MutationCtx) => {
    roundId = await ctx.db.insert("rounds", data);
  });

  if (!roundId) {
    throw new Error("Failed to create round");
  }

  return { id: roundId, record: data };
}

export async function createInPhase(
  t: TestContext,
  gameId: Id<"games">,
  phase: "placing" | "betting" | "resolved",
  options: {
    roundNumber?: number;
    turnPlayerId?: Id<"players">;
    trackId?: Id<"tracks">;
    placementIndex?: number;
    resolution?: Round["resolution"];
  } = {},
): Promise<{ id: Id<"rounds">; record: Round; turnPlayerId: Id<"players"> }> {
  let turnPlayerId = options.turnPlayerId;
  let trackId = options.trackId;

  await t.run(async (ctx: QueryCtx) => {
    if (!turnPlayerId) {
      const game = await ctx.db.get(gameId);
      turnPlayerId = game?.turnPlayerId;
    }
    if (!trackId) {
      const track = await ctx.db.query("tracks").first();
      trackId = track?._id;
    }
  });

  if (!(turnPlayerId && trackId)) {
    throw new Error("Could not determine turnPlayerId or trackId for round");
  }

  const roundData: Round = {
    gameId,
    roundNumber: options.roundNumber ?? 1,
    turnPlayerId: turnPlayerId!,
    trackId: trackId!,
    phase,
    startedAt: Date.now(),
  };

  if (phase === "betting" || phase === "resolved") {
    roundData.placement = {
      proposedIndex: options.placementIndex ?? 0,
      submittedAt: Date.now(),
    };
  }

  if (phase === "resolved") {
    roundData.resolution = options.resolution ?? {
      validIndexMin: 0,
      validIndexMax: 1,
      turnPlayerWasCorrect: true,
      awardedPlayerIds: [],
      coinDeltas: [],
      resolvedAt: Date.now(),
    };
  }

  let roundId: Id<"rounds"> | null = null;

  await t.run(async (ctx: MutationCtx) => {
    roundId = await ctx.db.insert("rounds", roundData);
  });

  if (!roundId) {
    throw new Error("Failed to create round");
  }

  return {
    id: roundId,
    record: roundData,
    turnPlayerId: turnPlayerId!,
  };
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
