import type { Id } from "@/convex/_generated/dataModel";

interface TimelineEntry {
  trackId: Id<"tracks">;
  year: number;
  earnedAtRoundNumber: number;
  earnedBy: "placement" | "bet" | "initial";
}

export function sortTimelineByYear<T extends Pick<TimelineEntry, "year">>(entries: T[]): T[] {
  return [...entries].sort((a, b) => a.year - b.year);
}

export function buildTrackMap<T extends { _id: Id<"tracks"> }>(
  tracks: T[] | undefined,
): Map<Id<"tracks">, T> {
  if (!tracks || !Array.isArray(tracks)) {
    return new Map();
  }
  return new Map(
    tracks.filter((track): track is T => track != null).map((track) => [track._id, track]),
  );
}

export function getRevealedTrackMap(
  tracks: Array<{ trackId: Id<"tracks">; title: string; artist: string; year: number }>,
): Map<Id<"tracks">, { title: string; artist: string; year: number }> {
  return new Map(tracks.map((track) => [track.trackId, track]));
}
