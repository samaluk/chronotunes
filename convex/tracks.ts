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

export const getPublicByIds = query({
  args: { trackIds: v.array(v.id("tracks")) },
  handler: async (ctx, args) => {
    const { trackIds } = args;

    if (trackIds.length === 0) {
      return [];
    }

    const tracks = await Promise.all(
      trackIds.map(async (trackId) => {
        const track = await ctx.db.get(trackId);
        if (!track) return null;

        return {
          trackId: track._id,
          title: track.title,
          artist: track.artist,
          year: track.year,
          youtubeVideoId: track.externalIds.youtubeVideoId ?? undefined,
        };
      }),
    );

    return tracks.filter((t): t is NonNullable<typeof t> => t !== null);
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    const tracks = await ctx.db.query("tracks").collect();
    return tracks;
  },
});

export const getForRound = query({
  args: { lobbyId: v.id("lobbies"), sessionId: v.string() },
  handler: async (ctx, args) => {
    const { lobbyId, sessionId } = args;

    const lobby = await ctx.db.get(lobbyId);

    if (!lobby) {
      return null;
    }

    const isHost = lobby.hostSessionId === sessionId;

    if (!isHost) {
      return null;
    }

    if (!lobby.activeGameId) {
      return null;
    }

    const game = await ctx.db.get(lobby.activeGameId);

    if (!(game && game.currentRoundId)) {
      return null;
    }

    const round = await ctx.db.get(game.currentRoundId);

    if (!round) {
      return null;
    }

    const track = await ctx.db.get(round.trackId);

    if (!track) {
      return null;
    }

    return {
      trackId: track._id,
      title: track.title,
      artist: track.artist,
      year: track.year,
      durationMs: track.durationMs,
      mbid: track.mbid,
      externalIds: track.externalIds,
      links: track.links,
      source: track.source,
    };
  },
});

export const getPublic = query({
  args: { roundId: v.id("rounds") },
  handler: async (ctx, args) => {
    const { roundId } = args;

    const round = await ctx.db.get(roundId);

    if (!round) {
      return null;
    }

    if (round.phase !== "resolved") {
      return null;
    }

    const track = await ctx.db.get(round.trackId);

    if (!track) {
      return null;
    }

    return {
      trackId: track._id,
      title: track.title,
      artist: track.artist,
      year: track.year,
      youtubeVideoId: track.externalIds.youtubeVideoId ?? null,
    };
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
