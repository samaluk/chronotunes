import type { Id } from "../_generated/dataModel";

export interface TimelineEntry {
  earnedAtRoundNumber: number;
  earnedBy: "placement" | "bet" | "initial";
  trackId: Id<"tracks">;
  year: number;
}

export interface ValidRange {
  max: number;
  min: number;
}

function singleEntryRange(entryYear: number, year: number): ValidRange {
  if (entryYear === year) {
    return { max: 1, min: 0 };
  }
  if (entryYear > year) {
    return { max: 0, min: 0 };
  }
  return { max: 1, min: 1 };
}

function firstIndexWithYearAtLeast(timeline: TimelineEntry[], year: number): number {
  return timeline.findIndex((entry) => entry.year >= year);
}

function lastIndexWithYearAtMost(timeline: TimelineEntry[], year: number): number {
  for (let i = timeline.length - 1; i >= 0; i--) {
    const entry = timeline[i];
    if (entry && entry.year <= year) {
      return i;
    }
  }
  return -1;
}

function lastIndexOfSameYear(timeline: TimelineEntry[], year: number): number {
  for (let i = timeline.length - 1; i >= 0; i--) {
    const entry = timeline[i];
    if (entry && entry.year === year) {
      return i;
    }
  }
  return -1;
}

function sameYearSpan(timeline: TimelineEntry[], year: number): [number, number] | undefined {
  const first = timeline.findIndex((entry) => entry.year === year);
  if (first === -1) {
    return undefined;
  }
  return [first, lastIndexOfSameYear(timeline, year)];
}

export function computeValidIndexRange(timeline: TimelineEntry[], year: number): ValidRange {
  if (timeline.length === 0) {
    return { max: 0, min: 0 };
  }

  if (timeline.length === 1) {
    return singleEntryRange(timeline[0]?.year ?? year, year);
  }

  const firstGreaterOrEqual = firstIndexWithYearAtLeast(timeline, year);
  if (firstGreaterOrEqual === -1) {
    return { max: timeline.length, min: timeline.length };
  }

  const span = sameYearSpan(timeline, year);
  if (!span) {
    const lastLessOrEqual = lastIndexWithYearAtMost(timeline, year);
    return { max: firstGreaterOrEqual, min: lastLessOrEqual + 1 };
  }

  const [firstSameYear, lastSameYear] = span;
  const sameYearCount = lastSameYear - firstSameYear + 1;
  const touchesAnEdge = firstSameYear === 0 || lastSameYear === timeline.length - 1;

  if (sameYearCount === 1 && touchesAnEdge) {
    return { max: firstSameYear, min: firstSameYear };
  }

  return { max: lastSameYear + 1, min: firstSameYear };
}

export function isPlacementCorrect(proposedIndex: number, validRange: ValidRange): boolean {
  return proposedIndex >= validRange.min && proposedIndex <= validRange.max;
}
