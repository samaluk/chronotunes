import type { Infer } from "convex/values"
import type { Id } from "../../_generated/dataModel"
import type { MutationCtx } from "../../_generated/server"
import type schema from "../../schema"
import type { TestContext } from "./types"
import { withIndex } from "./types"

export type Track = Infer<typeof schema.tables.tracks.validator>

export interface TrackOverrides {
  title?: string
  artist?: string
  year?: number
  externalIds?: Track["externalIds"]
  links?: Track["links"]
  source?: string
  durationMs?: number
  mbid?: string
}

function buildTrackData(overrides: TrackOverrides, index: number): Track {
  return {
    title: withIndex(overrides.title ?? "Test Song {n}", index),
    artist: withIndex(overrides.artist ?? "Test Artist {n}", index),
    year: overrides.year ?? 1980 + index * 5,
    externalIds: overrides.externalIds ?? {
      youtubeVideoId: `video${index}`,
    },
    links: overrides.links ?? {},
    createdAt: Date.now(),
    source: overrides.source ?? "test",
    ...(overrides.durationMs !== undefined && { durationMs: overrides.durationMs }),
    ...(overrides.mbid !== undefined && { mbid: overrides.mbid }),
  }
}

export async function create(
  t: TestContext,
  overrides: TrackOverrides = {},
): Promise<{ id: Id<"tracks">; record: Track }> {
  const data = buildTrackData(overrides, 1)
  let trackId: Id<"tracks"> | null = null

  await t.run(async (ctx: MutationCtx) => {
    trackId = await ctx.db.insert("tracks", data)
  })

  return { id: trackId!, record: data }
}

export async function createMany(
  t: TestContext,
  count: number,
  overrides: TrackOverrides = {},
  options: { startIndex?: number } = {},
): Promise<Array<{ id: Id<"tracks">; record: Track }>> {
  const startIndex = options.startIndex ?? 1
  const results: Array<{ id: Id<"tracks">; record: Track }> = []

  for (let i = 0; i < count; i++) {
    const data = buildTrackData(overrides, startIndex + i)
    let trackId: Id<"tracks"> | null = null

    await t.run(async (ctx: MutationCtx) => {
      trackId = await ctx.db.insert("tracks", data)
    })

    results.push({ id: trackId!, record: data })
  }

  return results
}

export function createWithYear(
  t: TestContext,
  year: number,
  overrides: TrackOverrides = {},
): Promise<{ id: Id<"tracks">; record: Track }> {
  return create(t, { ...overrides, year })
}

export function createForTimeline(
  t: TestContext,
  year: number,
  title: string,
  artist: string,
): Promise<{ id: Id<"tracks">; record: Track }> {
  return create(t, {
    title,
    artist,
    year,
    externalIds: { youtubeVideoId: `timeline-${year}-${title.slice(0, 3).toLowerCase()}` },
  })
}
