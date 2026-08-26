import { ConvexError, v } from "convex/values";

import { validateTrackItem } from "./lib/track_validation";

import { api } from "./_generated/api";
import { mutation } from "./_generated/server";

export interface CsvTrackImportItem {
  artist: string;
  durationMs?: number;
  mbid?: string;
  spotifyTrackId?: string;
  title: string;
  year: number;
  youtubeVideoId?: string;
}

const normalizeText = (value: string | undefined) => value?.replaceAll(/^"|"$/g, "").trim();

const buildExternalIds = (track: CsvTrackImportItem) => ({
  ...(track.spotifyTrackId ? { spotifyTrackId: track.spotifyTrackId.trim() } : {}),
  ...(track.youtubeVideoId ? { youtubeVideoId: track.youtubeVideoId.trim() } : {}),
});

const buildLinks = (track: CsvTrackImportItem) =>
  track.spotifyTrackId
    ? {
        spotifyUrl: `https://open.spotify.com/track/${track.spotifyTrackId}`,
      }
    : {};

export const parseCsvTracks = (csvContent: string) => {
  const [, ...dataLines] = csvContent.trim().split("\n");
  return dataLines.flatMap((line) => {
    const item = parseCsvLine(line ?? "");
    return item ? [item] : [];
  });
};

export function parseCsvLine(line: string): CsvTrackImportItem | null {
  const trimmed = line.trim();
  if (!trimmed) {
    return null;
  }

  const parts = trimmed.split("|");
  if (parts.length < 12) {
    return null;
  }

  const titleRaw = parts[1];
  const artistRaw = parts[2];
  const yearRaw = parts[11];
  const durationRaw = parts[7];
  const spotifyTrackIdRaw = parts[19];
  const mbidRaw = parts[20];

  if (!(titleRaw && artistRaw)) {
    return null;
  }

  const title = normalizeText(titleRaw);
  const artist = normalizeText(artistRaw);
  const year = parseYear(normalizeText(yearRaw));
  const durationMs = parseDurationToMs(normalizeText(durationRaw));
  const spotifyTrackId = normalizeText(spotifyTrackIdRaw);
  const mbid = normalizeText(mbidRaw);

  if (!(title && artist)) {
    return null;
  }

  const trackItem: CsvTrackImportItem = {
    artist,
    title,
    year,
  };

  if (spotifyTrackId) {
    trackItem.spotifyTrackId = spotifyTrackId;
  }
  if (durationMs !== undefined) {
    trackItem.durationMs = durationMs;
  }
  if (mbid) {
    trackItem.mbid = mbid;
  }

  return trackItem;
}

export function parseDurationToMs(durationRaw: string | undefined): number | undefined {
  if (!durationRaw) {
    return;
  }

  if (!durationRaw.includes(":")) {
    const milliseconds = Number.parseInt(durationRaw, 10);
    if (!Number.isNaN(milliseconds) && milliseconds >= 0) {
      return milliseconds;
    }
    return;
  }

  const parts = durationRaw.split(":").map(Number);
  if (parts.length === 2 && !parts.includes(Number.NaN)) {
    return (parts[0] * 60 + parts[1]) * 1000;
  }
  if (parts.length === 3 && !parts.includes(Number.NaN)) {
    return (parts[0] * 60 * 60 + parts[1] * 60 + parts[2]) * 1000;
  }
  return;
}

export function parseYear(dateStrRaw: string | undefined): number {
  if (!dateStrRaw || dateStrRaw === "0000-00-00") {
    return 2000;
  }
  const dateStr = normalizeText(dateStrRaw) ?? dateStrRaw;
  const year = Number.parseInt(dateStr.split("-")[0], 10);
  return Number.isNaN(year) ? 2000 : year;
}

export const importTracksFromCsv = mutation({
  args: {
    clearExisting: v.optional(v.boolean()),
    tracks: v.array(
      v.object({
        artist: v.string(),
        durationMs: v.optional(v.number()),
        mbid: v.optional(v.string()),
        spotifyTrackId: v.optional(v.string()),
        title: v.string(),
        year: v.number(),
        youtubeVideoId: v.optional(v.string()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const { tracks, clearExisting } = args;

    if (tracks.length === 0) {
      throw new ConvexError("At least one track must be provided");
    }

    if (tracks.length > 1000) {
      throw new ConvexError("Cannot import more than 1000 tracks at once");
    }

    let deletedCount = 0;
    if (clearExisting) {
      const existingTracks = await ctx.db.query("tracks").collect();
      await Promise.all(existingTracks.map((track) => ctx.db.delete(track._id)));
      deletedCount = existingTracks.length;
    }

    const importedIds: string[] = [];
    const now = Date.now();

    const importResults = await Promise.all(
      tracks.map(async (track) => {
        try {
          validateTrackItem(track);

          const trackId = await ctx.db.insert("tracks", {
            artist: track.artist.trim(),
            createdAt: now,
            externalIds: buildExternalIds(track),
            links: buildLinks(track),
            source: "import",
            title: track.title.trim(),
            year: track.year,
            ...(track.mbid ? { mbid: track.mbid.trim() } : {}),
            ...(track.durationMs === undefined ? {} : { durationMs: track.durationMs }),
          });

          return { success: true as const, trackId };
        } catch (error) {
          console.error(`Failed to import track "${track.title}":`, error);
          return { success: false as const };
        }
      }),
    );

    for (const result of importResults) {
      if (result.success) {
        importedIds.push(result.trackId);
      }
    }
    const hasErrors = importResults.some((result) => !result.success);

    return {
      deletedCount,
      hasErrors,
      importedCount: importedIds.length,
      message: hasErrors ? "Import completed with some errors" : "Import completed successfully",
      skippedCount: 0,
      trackIds: importedIds,
    };
  },
});

export const parseAndImportCsv = mutation({
  args: {
    clearExisting: v.optional(v.boolean()),
    csvContent: v.string(),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{
    message: string;
    importedCount: number;
    deletedCount: number;
    skippedCount: number;
    trackIds: string[];
    hasErrors: boolean;
  }> => {
    const { csvContent, clearExisting } = args;

    const tracks = parseCsvTracks(csvContent);

    if (tracks.length === 0) {
      throw new ConvexError("No valid tracks found in CSV");
    }

    return await ctx.runMutation(api.import_tracks.importTracksFromCsv, {
      clearExisting,
      tracks,
    });
  },
});
