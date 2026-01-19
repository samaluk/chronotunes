import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";

const MIN_YEAR = 1900;
const MAX_YEAR = 2030;

export const get = query({
  args: { trackIds: v.array(v.id("tracks")) },
  handler: async (ctx, args) => {
    const { trackIds } = args;

    const tracks = await Promise.all(trackIds.map((trackId) => ctx.db.get(trackId)));

    return tracks;
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    const tracks = await ctx.db.query("tracks").collect();
    return tracks;
  },
});

const trackImportItem = v.object({
  title: v.string(),
  artist: v.string(),
  year: v.number(),
  youtubeVideoId: v.optional(v.string()),
  mbid: v.optional(v.string()),
  durationMs: v.optional(v.number()),
});

function validateTrackItem(item: (typeof trackImportItem)["type"]): void {
  if (!item.title || item.title.trim().length === 0) {
    throw new ConvexError("Track title is required");
  }

  if (!item.artist || item.artist.trim().length === 0) {
    throw new ConvexError("Track artist is required");
  }

  if (item.year < MIN_YEAR || item.year > MAX_YEAR) {
    throw new ConvexError(`Track year must be between ${MIN_YEAR} and ${MAX_YEAR}`);
  }

  if (item.youtubeVideoId !== undefined && item.youtubeVideoId.trim().length === 0) {
    throw new ConvexError("YouTube video ID must be a non-empty string if provided");
  }

  if (item.mbid !== undefined && item.mbid.trim().length === 0) {
    throw new ConvexError("MusicBrainz ID must be a non-empty string if provided");
  }

  if (item.durationMs !== undefined && item.durationMs < 0) {
    throw new ConvexError("Duration must be a non-negative number if provided");
  }
}

export const importTracks = mutation({
  args: { tracks: v.array(trackImportItem) },
  handler: async (ctx, args) => {
    const { tracks } = args;

    if (tracks.length === 0) {
      throw new ConvexError("At least one track must be provided");
    }

    if (tracks.length > 1000) {
      throw new ConvexError("Cannot import more than 1000 tracks at once");
    }

    const importedIds: string[] = [];
    const now = Date.now();

    for (const track of tracks) {
      validateTrackItem(track);

      const trackId = await ctx.db.insert("tracks", {
        title: track.title.trim(),
        artist: track.artist.trim(),
        year: track.year,
        externalIds: {
          ...(track.youtubeVideoId ? { youtubeVideoId: track.youtubeVideoId.trim() } : {}),
        },
        links: {},
        createdAt: now,
        source: "import",
        ...(track.mbid ? { mbid: track.mbid.trim() } : {}),
        ...(track.durationMs !== undefined ? { durationMs: track.durationMs } : {}),
      });

      importedIds.push(trackId);
    }

    return { importedCount: importedIds.length, trackIds: importedIds };
  },
});
