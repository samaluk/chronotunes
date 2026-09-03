import { ConvexError, v } from "convex/values";

import { baseTrackImportFields, validateTrackItem } from "./lib/track_validation";

import { mutation, query } from "./_generated/server";

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
        if (!track) {
          return null;
        }

        return {
          artist: track.artist,
          title: track.title,
          trackId: track._id,
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

    if (!game?.currentRoundId) {
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
      artist: track.artist,
      durationMs: track.durationMs,
      externalIds: track.externalIds,
      links: track.links,
      mbid: track.mbid,
      source: track.source,
      title: track.title,
      trackId: track._id,
      year: track.year,
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
      artist: track.artist,
      title: track.title,
      trackId: track._id,
      year: track.year,
      youtubeVideoId: track.externalIds.youtubeVideoId ?? null,
    };
  },
});

const trackImportItem = v.object(baseTrackImportFields);

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

    const trackIds = await Promise.all(
      tracks.map((track) => {
        validateTrackItem(track);

        return ctx.db.insert("tracks", {
          artist: track.artist.trim(),
          createdAt: now,
          externalIds: track.youtubeVideoId ? { youtubeVideoId: track.youtubeVideoId.trim() } : {},
          links: {},
          source: "import",
          title: track.title.trim(),
          year: track.year,
          ...(track.mbid ? { mbid: track.mbid.trim() } : {}),
          ...(track.durationMs === undefined ? {} : { durationMs: track.durationMs }),
        });
      }),
    );
    importedIds.push(...trackIds);

    return { importedCount: importedIds.length, trackIds: importedIds };
  },
});
