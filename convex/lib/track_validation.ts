import { ConvexError } from "convex/values";

export const MIN_YEAR = 1900;
export const MAX_YEAR = 2030;

/** Structural shape accepted by {@link validateTrackItem}; both import paths conform to it. */
export interface TrackValidationInput {
  artist: string;
  durationMs?: number;
  mbid?: string;
  title: string;
  year: number;
  youtubeVideoId?: string;
}

/**
 * Single source of truth for track-import validation, shared by the CSV
 * pipeline (import_tracks.ts) and the structured mutation (tracks.ts).
 */
export function validateTrackItem(item: TrackValidationInput): void {
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
