import type { Id } from "@/convex/_generated/dataModel";

interface TimelineEntry {
  earnedAtRoundNumber: number;
  earnedBy: "placement" | "bet" | "initial";
  trackId: Id<"tracks">;
  year: number;
}

export function sortTimelineByYear<T extends Pick<TimelineEntry, "year">>(entries: T[]): T[] {
  return [...entries].toSorted((a, b) => a.year - b.year);
}

export function buildTrackMap<T extends { _id: Id<"tracks"> }>(
  tracks: readonly (T | null)[] | undefined,
): Map<Id<"tracks">, T> {
  if (!tracks) {
    return new Map();
  }
  return new Map(
    tracks.filter((track): track is T => track != null).map((track) => [track._id, track]),
  );
}

export function getRevealedTrackMap(
  tracks: {
    trackId: Id<"tracks">;
    title: string;
    artist: string;
    year: number;
  }[],
): Map<Id<"tracks">, { title: string; artist: string; year: number }> {
  return new Map(tracks.map((track) => [track.trackId, track]));
}
