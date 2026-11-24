import type { Infer } from "convex/values";

import type { MutationCtx } from "../../_generated/server";
import type schema from "../../schema";
import type { FactoryResult, TestContext } from "./types";
import { withIndex } from "./types";

export type Track = Infer<typeof schema.tables.tracks.validator>;

export interface TrackOverrides {
  artist?: string;
  durationMs?: number;
  externalIds?: Track["externalIds"];
  links?: Track["links"];
  mbid?: string;
  source?: string;
  title?: string;
  year?: number;
}

function buildTrackData(overrides: TrackOverrides, index: number): Track {
  return {
    artist: withIndex(overrides.artist ?? "Test Artist {n}", index),
    createdAt: Date.now(),
    externalIds: overrides.externalIds ?? {
      youtubeVideoId: `video${index}`,
    },
    links: overrides.links ?? {},
    source: overrides.source ?? "test",
    title: withIndex(overrides.title ?? "Test Song {n}", index),
    year: overrides.year ?? 1980 + index * 5,
    ...(overrides.durationMs !== undefined && {
      durationMs: overrides.durationMs,
    }),
    ...(overrides.mbid !== undefined && { mbid: overrides.mbid }),
  };
}

export async function create(
  t: TestContext,
  overrides: TrackOverrides = {},
): Promise<FactoryResult<"tracks">> {
  const data = buildTrackData(overrides, 1);
  return await t.run(async (ctx: MutationCtx) => {
    const trackId = await ctx.db.insert("tracks", data);
    return { id: trackId, record: data };
  });
}

export async function createMany(
  t: TestContext,
  count: number,
  overrides: TrackOverrides = {},
  options: { startIndex?: number } = {},
): Promise<FactoryResult<"tracks">[]> {
  const startIndex = options.startIndex ?? 1;

  return await Promise.all(
    Array.from({ length: count }, (_, i) => {
      const data = buildTrackData(overrides, startIndex + i);

      return t.run(async (ctx: MutationCtx) => {
        const trackId = await ctx.db.insert("tracks", data);
        return { id: trackId, record: data };
      });
    }),
  );
}

export function createWithYear(
  t: TestContext,
  year: number,
  overrides: TrackOverrides = {},
): Promise<FactoryResult<"tracks">> {
  return create(t, { ...overrides, year });
}

export function createForTimeline(
  t: TestContext,
  year: number,
  title: string,
  artist: string,
): Promise<FactoryResult<"tracks">> {
  return create(t, {
    artist,
    externalIds: {
      youtubeVideoId: `timeline-${year}-${title.slice(0, 3).toLowerCase()}`,
    },
    title,
    year,
  });
}
