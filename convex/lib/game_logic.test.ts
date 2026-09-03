import { describe, expect, test } from "vitest";

import type { Id } from "../_generated/dataModel";
import { computeValidIndexRange, isPlacementCorrect } from "./game_logic";
import type { TimelineEntry } from "./game_logic";

function createTimelineEntry(year: number, index: number): TimelineEntry {
  return {
    earnedAtRoundNumber: index,
    earnedBy: "placement",
    // oxlint-disable-next-line typescript/consistent-type-assertions, typescript/no-unsafe-type-assertion
    trackId: `track${index}` as Id<"tracks">,
    year,
  };
}

function createTimeline(years: number[]): TimelineEntry[] {
  return years.map((year, index) => createTimelineEntry(year, index));
}

describe("computeValidIndexRange", () => {
  test("empty timeline allows index 0", () => {
    const timeline: TimelineEntry[] = [];
    const result = computeValidIndexRange(timeline, 1990);
    expect(result.min).toBe(0);
    expect(result.max).toBe(0);
  });

  test("new song year before all existing songs", () => {
    const timeline = createTimeline([1985, 1990, 1995]);
    const result = computeValidIndexRange(timeline, 1980);
    expect(result.min).toBe(0);
    expect(result.max).toBe(0);
  });

  test("new song year after all existing songs", () => {
    const timeline = createTimeline([1985, 1990, 1995]);
    const result = computeValidIndexRange(timeline, 2000);
    expect(result.min).toBe(3);
    expect(result.max).toBe(3);
  });

  test("new song year fits between two existing years", () => {
    const timeline = createTimeline([1985, 1990, 1995]);
    const result = computeValidIndexRange(timeline, 1988);
    expect(result.min).toBe(1);
    expect(result.max).toBe(1);
  });

  test("new song year is same as first song only", () => {
    const timeline = createTimeline([1990, 1995, 2000]);
    const result = computeValidIndexRange(timeline, 1990);
    expect(result.min).toBe(0);
    expect(result.max).toBe(0);
  });

  test("new song year is same as last song only", () => {
    const timeline = createTimeline([1985, 1990, 1995]);
    const result = computeValidIndexRange(timeline, 1995);
    expect(result.min).toBe(2);
    expect(result.max).toBe(2);
  });

  test("new song year matches existing songs in middle", () => {
    const timeline = createTimeline([1985, 1990, 1990, 1995]);
    const result = computeValidIndexRange(timeline, 1990);
    expect(result.min).toBe(1);
    expect(result.max).toBe(3);
  });

  test("new song year matches all existing songs", () => {
    const timeline = createTimeline([1990, 1990, 1990]);
    const result = computeValidIndexRange(timeline, 1990);
    expect(result.min).toBe(0);
    expect(result.max).toBe(3);
  });

  test("new song year between 1990 songs and next year", () => {
    const timeline = createTimeline([1985, 1990, 1990, 1995]);
    const result = computeValidIndexRange(timeline, 1992);
    expect(result.min).toBe(3);
    expect(result.max).toBe(3);
  });

  test("new song year between 1985 and first 1990", () => {
    const timeline = createTimeline([1985, 1990, 1990, 1995]);
    const result = computeValidIndexRange(timeline, 1988);
    expect(result.min).toBe(1);
    expect(result.max).toBe(1);
  });

  test("single song timeline - new song before", () => {
    const timeline = createTimeline([1990]);
    const result = computeValidIndexRange(timeline, 1985);
    expect(result.min).toBe(0);
    expect(result.max).toBe(0);
  });

  test("single song timeline - new song after", () => {
    const timeline = createTimeline([1990]);
    const result = computeValidIndexRange(timeline, 1995);
    expect(result.min).toBe(1);
    expect(result.max).toBe(1);
  });

  test("single song timeline - new song same year", () => {
    const timeline = createTimeline([1990]);
    const result = computeValidIndexRange(timeline, 1990);
    expect(result.min).toBe(0);
    expect(result.max).toBe(1);
  });

  test("two songs same year - new song same year", () => {
    const timeline = createTimeline([1990, 1990]);
    const result = computeValidIndexRange(timeline, 1990);
    expect(result.min).toBe(0);
    expect(result.max).toBe(2);
  });

  test("larger timeline with multiple same-year groups", () => {
    const timeline = createTimeline([1980, 1985, 1990, 1990, 1995, 2000]);
    const result = computeValidIndexRange(timeline, 1990);
    expect(result.min).toBe(2);
    expect(result.max).toBe(4);
  });

  test("larger timeline - new song fits between groups", () => {
    const timeline = createTimeline([1980, 1985, 1990, 1990, 1995, 2000]);
    const result = computeValidIndexRange(timeline, 1988);
    expect(result.min).toBe(2);
    expect(result.max).toBe(2);
  });
});

describe("isPlacementCorrect", () => {
  test("proposed index within valid range returns true", () => {
    const timeline = createTimeline([1985, 1990, 1995]);
    const validRange = computeValidIndexRange(timeline, 1992);
    expect(isPlacementCorrect(2, validRange)).toBe(true);
    expect(isPlacementCorrect(3, validRange)).toBe(false);
  });

  test("proposed index at min boundary returns true", () => {
    const timeline = createTimeline([1985, 1990, 1995]);
    const validRange = computeValidIndexRange(timeline, 1992);
    expect(isPlacementCorrect(2, validRange)).toBe(true);
  });

  test("proposed index at max boundary returns true", () => {
    const timeline = createTimeline([1985, 1990, 1995]);
    const validRange = computeValidIndexRange(timeline, 1988);
    expect(isPlacementCorrect(1, validRange)).toBe(true);
  });

  test("proposed index below valid range returns false", () => {
    const timeline = createTimeline([1985, 1990, 1995]);
    const validRange = computeValidIndexRange(timeline, 1992);
    expect(isPlacementCorrect(1, validRange)).toBe(false);
  });

  test("proposed index above valid range returns false", () => {
    const timeline = createTimeline([1985, 1990, 1995]);
    const validRange = computeValidIndexRange(timeline, 1992);
    expect(isPlacementCorrect(3, validRange)).toBe(false);
  });

  test("same-year songs - multiple valid indices", () => {
    const timeline = createTimeline([1990, 1990, 1995]);
    const validRange = computeValidIndexRange(timeline, 1990);
    expect(isPlacementCorrect(0, validRange)).toBe(true);
    expect(isPlacementCorrect(1, validRange)).toBe(true);
    expect(isPlacementCorrect(2, validRange)).toBe(true);
    expect(isPlacementCorrect(3, validRange)).toBe(false);
  });

  test("empty timeline - only index 0 is valid", () => {
    const timeline: TimelineEntry[] = [];
    const validRange = computeValidIndexRange(timeline, 1990);
    expect(isPlacementCorrect(0, validRange)).toBe(true);
    expect(isPlacementCorrect(1, validRange)).toBe(false);
  });
});
