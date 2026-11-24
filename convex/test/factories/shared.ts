import type { Infer } from "convex/values";
import type { Query } from "convex/server";

import type { DataModel, Id, TableNames } from "../../_generated/dataModel";
import type { QueryCtx } from "../../_generated/server";
import type schema from "../../schema";
import type { TestContext } from "./types";

export type Round = Infer<typeof schema.tables.rounds.validator>;

function toFactoryResult<RecordType extends { _id: string }>(
  record: RecordType,
): { id: RecordType["_id"]; record: RecordType } {
  return { id: record._id, record };
}

export async function readResult<RecordType extends { _id: string }>(
  t: TestContext,
  read: (ctx: QueryCtx) => Promise<RecordType | null>,
): Promise<{ id: RecordType["_id"]; record: RecordType } | null> {
  return await t.run(async (ctx: QueryCtx) => {
    const record = await read(ctx);
    return record ? toFactoryResult(record) : null;
  });
}

export async function readFirstWhere<Table extends TableNames>(
  t: TestContext,
  table: Table,
  filter: Parameters<Query<DataModel[Table]>["filter"]>[0],
) {
  return await readResult(t, async (ctx: QueryCtx) => ctx.db.query(table).filter(filter).first());
}

export async function readAllWhere<Table extends TableNames>(
  t: TestContext,
  table: Table,
  filter: Parameters<Query<DataModel[Table]>["filter"]>[0],
) {
  return await t.run(async (ctx: QueryCtx) =>
    (await ctx.db.query(table).filter(filter).collect()).map(toFactoryResult),
  );
}

/** Returns the first seeded track, throwing when the test forgot to seed any. */
export async function requireFirstTrackId(ctx: QueryCtx): Promise<Id<"tracks">> {
  const track = await ctx.db.query("tracks").first();
  if (!track) {
    throw new Error("No tracks available. Please seed tracks first.");
  }
  return track._id;
}

export interface RoundOverrides {
  guess?: Round["guess"];
  phase?: Round["phase"];
  placement?: Round["placement"];
  placementPreview?: Round["placementPreview"];
  resolution?: Round["resolution"];
  roundNumber?: number;
  trackId?: Round["trackId"];
  turnPlayerId?: Round["turnPlayerId"];
}

export interface ResolvedRoundContext {
  trackId: Id<"tracks">;
  turnPlayerId: Id<"players">;
}

/**
 * Determines the two required round fields, falling back to the game's turn
 * player and the first seeded track when the test did not pin them.
 */
export async function resolveRoundContext(
  ctx: QueryCtx,
  gameId: Id<"games"> | undefined,
  overrides: Pick<RoundOverrides, "trackId" | "turnPlayerId"> = {},
): Promise<ResolvedRoundContext> {
  let { trackId, turnPlayerId } = overrides;

  if (!turnPlayerId && gameId) {
    const game = await ctx.db.get(gameId);
    turnPlayerId = game?.turnPlayerId;
  }
  if (!trackId) {
    trackId = await requireFirstTrackId(ctx);
  }
  if (!(turnPlayerId && trackId)) {
    throw new Error("Could not determine turnPlayerId or trackId for round");
  }

  return { trackId, turnPlayerId };
}

/** Builds a round document, applying only the override fields that are set. */
export function buildRoundData(
  gameId: Id<"games">,
  resolved: ResolvedRoundContext,
  options: {
    phase?: Round["phase"];
    roundNumber?: number;
  },
  overrides: Omit<RoundOverrides, "phase" | "roundNumber" | "trackId" | "turnPlayerId"> = {},
): Round {
  return {
    gameId,
    phase: options.phase ?? "placing",
    roundNumber: options.roundNumber ?? 1,
    startedAt: Date.now(),
    trackId: resolved.trackId,
    turnPlayerId: resolved.turnPlayerId,
    ...(overrides.placementPreview !== undefined && {
      placementPreview: overrides.placementPreview,
    }),
    ...(overrides.placement !== undefined && { placement: overrides.placement }),
    ...(overrides.guess !== undefined && { guess: overrides.guess }),
    ...(overrides.resolution !== undefined && { resolution: overrides.resolution }),
  };
}
