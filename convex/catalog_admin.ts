import { ConvexError, v } from "convex/values";

import {
  createMockPlaybackResolver,
  createYouTubeApiPlaybackResolver,
  type PlaybackResolutionIssue,
  resolveCatalogPlaybackReferences,
  type ResolvedCatalogTrack,
} from "./lib/playback_resolver";
import {
  type CatalogDerivationIssue,
  type CatalogDerivationResult,
  deriveCatalogTracks,
} from "./lib/spotify";
import { fetchSpotifyPlaylist, type SpotifyPlaylistFetchResult } from "./lib/spotify_fetcher";
import { baseTrackImportFields, validateTrackItem } from "./lib/track_validation";

import { internal } from "./_generated/api";
import { internalAction, internalMutation } from "./_generated/server";

const catalogTrackInputValidator = v.object({
  ...baseTrackImportFields,
  spotifyTrackId: v.optional(v.string()),
});

interface CatalogTrackInput {
  artist: string;
  durationMs?: number;
  mbid?: string;
  spotifyTrackId?: string;
  title: string;
  year: number;
  youtubeVideoId?: string;
}

function buildTrackRecord(track: CatalogTrackInput, source: string, createdAt: number) {
  const spotifyTrackId = track.spotifyTrackId?.trim();
  const youtubeVideoId = track.youtubeVideoId?.trim();

  return {
    artist: track.artist.trim(),
    createdAt,
    durationMs: track.durationMs,
    externalIds: {
      ...(spotifyTrackId ? { spotifyTrackId } : {}),
      ...(youtubeVideoId ? { youtubeVideoId } : {}),
    },
    links: {
      ...(spotifyTrackId ? { spotifyUrl: `https://open.spotify.com/track/${spotifyTrackId}` } : {}),
      ...(youtubeVideoId
        ? { youtubeUrl: `https://www.youtube.com/watch?v=${youtubeVideoId}` }
        : {}),
    },
    mbid: track.mbid?.trim(),
    source,
    title: track.title.trim(),
    year: track.year,
  };
}

/**
 * Replaces the entire ChronoTunes catalog with the provided tracks.
 *
 * This is an internal administrative mutation that cannot be called via the public API.
 * All tracks are strictly validated before any deletions take place, ensuring that malformed
 * batches do not corrupt or destroy the existing catalog.
 */
export const replaceCatalog = internalMutation({
  args: {
    source: v.optional(v.string()),
    tracks: v.array(catalogTrackInputValidator),
  },
  handler: async (ctx, args) => {
    const { tracks, source = "spotify-playlist" } = args;

    if (tracks.length === 0) {
      throw new ConvexError("At least one track must be provided for catalog replacement");
    }

    if (tracks.length > 2000) {
      throw new ConvexError("Cannot import more than 2000 tracks in a single batch");
    }

    // Step 1: Strictly validate ALL tracks before touching the database.
    for (const track of tracks) {
      validateTrackItem(track);
    }

    // Step 2: Clear existing catalog tracks
    const existingTracks = await ctx.db.query("tracks").collect();
    await Promise.all(existingTracks.map((track) => ctx.db.delete(track._id)));

    // Step 3: Insert new validated tracks
    const now = Date.now();
    const insertedIds = await Promise.all(
      tracks.map((track) => ctx.db.insert("tracks", buildTrackRecord(track, source, now))),
    );

    return {
      deletedCount: existingTracks.length,
      importedCount: insertedIds.length,
      trackIds: insertedIds,
    };
  },
});

export interface SpotifyImportReport {
  dryRun: boolean;
  duplicateCount: number;
  duplicates: CatalogDerivationIssue[];
  fetchSource: "api" | "embed";
  importedCount: number;
  malformed: CatalogDerivationIssue[];
  malformedCount: number;
  playlistId: string;
  playlistName?: string;
  replaceResult: {
    deletedCount: number;
    importedCount: number;
    trackIds: string[];
  } | null;
  resolvedCount: number;
  totalExamined: number;
  unavailable: CatalogDerivationIssue[];
  unavailableCount: number;
  unresolvedCount: number;
  unresolvedTracks: PlaybackResolutionIssue[];
  validCount: number;
}

function buildSpotifyImportReport(params: {
  derivation: CatalogDerivationResult;
  dryRun: boolean;
  fetchResult: SpotifyPlaylistFetchResult;
  replaceResult: { deletedCount: number; importedCount: number; trackIds: string[] } | null;
  resolvedTracks: ResolvedCatalogTrack[];
  unresolvedTracks: PlaybackResolutionIssue[];
}): SpotifyImportReport {
  const { derivation, dryRun, fetchResult, replaceResult, resolvedTracks, unresolvedTracks } =
    params;

  return {
    dryRun,
    duplicateCount: derivation.duplicates.length,
    duplicates: derivation.duplicates,
    fetchSource: fetchResult.source,
    importedCount: replaceResult?.importedCount ?? 0,
    malformed: derivation.malformed,
    malformedCount: derivation.malformed.length,
    playlistId: fetchResult.playlistId,
    playlistName: fetchResult.playlistName,
    replaceResult,
    resolvedCount: resolvedTracks.length,
    totalExamined: derivation.totalExamined,
    unavailable: derivation.unavailable,
    unavailableCount: derivation.unavailable.length,
    unresolvedCount: unresolvedTracks.length,
    unresolvedTracks,
    validCount: derivation.validTracks.length,
  };
}

/**
 * Administrative action to fetch a Spotify playlist, derive validated metadata,
 * resolve external playback references, and optionally replace the catalog.
 *
 * Internal-only, callable via CLI (`convex run`) or deployment tooling.
 */
export const importSpotifyPlaylist = internalAction({
  args: {
    dryRun: v.optional(v.boolean()),
    playlistInput: v.string(),
    replaceExisting: v.optional(v.boolean()),
    spotifyClientId: v.optional(v.string()),
    spotifyClientSecret: v.optional(v.string()),
    spotifyToken: v.optional(v.string()),
    youtubeApiKey: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<SpotifyImportReport> => {
    const {
      playlistInput,
      replaceExisting = false,
      dryRun = false,
      spotifyClientId,
      spotifyClientSecret,
      spotifyToken,
      youtubeApiKey,
    } = args;

    const fetchResult = await fetchSpotifyPlaylist(playlistInput, {
      credentials: {
        clientId: spotifyClientId,
        clientSecret: spotifyClientSecret,
        token: spotifyToken,
      },
    });

    const derivation = deriveCatalogTracks(fetchResult.items);
    const playbackResolver = youtubeApiKey?.trim()
      ? createYouTubeApiPlaybackResolver(youtubeApiKey)
      : createMockPlaybackResolver({});

    const playbackResolution = await resolveCatalogPlaybackReferences(
      derivation.validTracks,
      playbackResolver,
    );

    let replaceResult = null;
    if (!dryRun && replaceExisting && playbackResolution.resolvedTracks.length > 0) {
      replaceResult = await ctx.runMutation(internal.catalog_admin.replaceCatalog, {
        source: `spotify:${fetchResult.playlistId}`,
        tracks: playbackResolution.resolvedTracks.map((t) => ({
          artist: t.artist,
          durationMs: t.durationMs,
          spotifyTrackId: t.spotifyTrackId,
          title: t.title,
          year: t.year,
          youtubeVideoId: t.youtubeVideoId,
        })),
      });
    }

    return buildSpotifyImportReport({
      derivation,
      dryRun,
      fetchResult,
      replaceResult,
      resolvedTracks: playbackResolution.resolvedTracks,
      unresolvedTracks: playbackResolution.unresolvedTracks,
    });
  },
});
