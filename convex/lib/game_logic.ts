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

export function computeValidIndexRange(timeline: TimelineEntry[], year: number): ValidRange {
  if (timeline.length === 0) {
    return { max: 0, min: 0 };
  }

  if (timeline.length === 1) {
    // oxlint-disable-next-line typescript/no-non-null-assertion, typescript/no-unnecessary-type-assertion
    if (timeline[0]!.year === year) {
      return { max: 1, min: 0 };
    }
    // oxlint-disable-next-line typescript/no-non-null-assertion, typescript/no-unnecessary-type-assertion
    if (timeline[0]!.year > year) {
      return { max: 0, min: 0 };
    }
    return { max: 1, min: 1 };
  }

  let firstIndexWithYearGreaterThanOrEqual = -1;
  for (let i = 0; i < timeline.length; i++) {
    // oxlint-disable-next-line typescript/no-non-null-assertion, typescript/no-unnecessary-type-assertion
    if (timeline[i]!.year >= year) {
      firstIndexWithYearGreaterThanOrEqual = i;
      break;
    }
  }

  let lastIndexWithYearLessThanOrEqual = -1;
  for (let i = timeline.length - 1; i >= 0; i--) {
    // oxlint-disable-next-line typescript/no-non-null-assertion, typescript/no-unnecessary-type-assertion
    if (timeline[i]!.year <= year) {
      lastIndexWithYearLessThanOrEqual = i;
      break;
    }
  }

  if (firstIndexWithYearGreaterThanOrEqual === -1) {
    return { max: timeline.length, min: timeline.length };
  }

  const hasSameYear = timeline.some((entry) => entry.year === year);
  if (!hasSameYear) {
    const min = lastIndexWithYearLessThanOrEqual + 1;
    const max = firstIndexWithYearGreaterThanOrEqual;
    return { max, min };
  }

  const firstSameYearIndex = timeline.findIndex((entry) => entry.year === year);
  const lastSameYearIndex =
    // oxlint-disable-next-line typescript/no-unsafe-call, typescript/no-unsafe-member-access
    timeline.length - 1 - [...timeline].toReversed().findIndex((entry) => entry.year === year);
  const sameYearCount = lastSameYearIndex - firstSameYearIndex + 1;

  if (
    sameYearCount === 1 &&
    (firstSameYearIndex === 0 || lastSameYearIndex === timeline.length - 1)
  ) {
    return { max: firstSameYearIndex, min: firstSameYearIndex };
  }

  return { max: lastSameYearIndex + 1, min: firstSameYearIndex };
}

export function isPlacementCorrect(proposedIndex: number, validRange: ValidRange): boolean {
  return proposedIndex >= validRange.min && proposedIndex <= validRange.max;
}
