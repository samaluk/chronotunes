import type { GenericId } from "convex/values";

interface TimelineEntry {
  trackId: GenericId<"tracks">;
  year: number;
  earnedAtRoundNumber: number;
  earnedBy: "placement" | "bet" | "initial";
}

export function sortTimelineByYear<T extends Pick<TimelineEntry, "year">>(entries: T[]): T[] {
  return [...entries].sort((a, b) => a.year - b.year);
}

export function buildTrackMap<T extends { _id: GenericId<"tracks"> }>(
  tracks: T[] | undefined,
): Map<GenericId<"tracks">, T> {
  if (!tracks || !Array.isArray(tracks)) {
    return new Map();
  }
  return new Map(
    tracks.filter((track): track is T => track != null).map((track) => [track._id, track]),
  );
}

export function getRevealedTrackMap(
  tracks: Array<{ trackId: GenericId<"tracks">; title: string; artist: string; year: number }>,
): Map<GenericId<"tracks">, { title: string; artist: string; year: number }> {
  return new Map(tracks.map((track) => [track.trackId, track]));
}
