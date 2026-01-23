import type { Id } from "../_generated/dataModel"

export interface TimelineEntry {
  trackId: Id<"tracks">
  year: number
  earnedAtRoundNumber: number
  earnedBy: "placement" | "bet" | "initial"
}

export interface ValidRange {
  min: number
  max: number
}

export function computeValidIndexRange(timeline: TimelineEntry[], year: number): ValidRange {
  if (timeline.length === 0) {
    return { min: 0, max: 0 }
  }

  if (timeline.length === 1) {
    if (timeline[0]!.year === year) {
      return { min: 0, max: 1 }
    }
    if (timeline[0]!.year > year) {
      return { min: 0, max: 0 }
    }
    return { min: 1, max: 1 }
  }

  let firstIndexWithYearGreaterThanOrEqual = -1
  for (let i = 0; i < timeline.length; i++) {
    if (timeline[i]!.year >= year) {
      firstIndexWithYearGreaterThanOrEqual = i
      break
    }
  }

  let lastIndexWithYearLessThanOrEqual = -1
  for (let i = timeline.length - 1; i >= 0; i--) {
    if (timeline[i]!.year <= year) {
      lastIndexWithYearLessThanOrEqual = i
      break
    }
  }

  if (firstIndexWithYearGreaterThanOrEqual === -1) {
    return { min: timeline.length, max: timeline.length }
  }

  const hasSameYear = timeline.some((entry) => entry.year === year)
  if (!hasSameYear) {
    const min = lastIndexWithYearLessThanOrEqual + 1
    const max = firstIndexWithYearGreaterThanOrEqual
    return { min, max }
  }

  const firstSameYearIndex = timeline.findIndex((entry) => entry.year === year)
  const lastSameYearIndex =
    timeline.length - 1 - [...timeline].reverse().findIndex((entry) => entry.year === year)
  const sameYearCount = lastSameYearIndex - firstSameYearIndex + 1

  if (
    sameYearCount === 1 &&
    (firstSameYearIndex === 0 || lastSameYearIndex === timeline.length - 1)
  ) {
    return { min: firstSameYearIndex, max: firstSameYearIndex }
  }

  return { min: firstSameYearIndex, max: lastSameYearIndex + 1 }
}

export function isPlacementCorrect(proposedIndex: number, validRange: ValidRange): boolean {
  return proposedIndex >= validRange.min && proposedIndex <= validRange.max
}
