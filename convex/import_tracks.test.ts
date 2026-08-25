import { ConvexError } from "convex/values";
import { convexTest } from "convex-test";
import { describe, expect, test, vi } from "vitest";

import { api } from "./_generated/api";
import { parseCsvLine, parseCsvTracks, parseDurationToMs, parseYear } from "./import_tracks";
import { validateTrackItem } from "./lib/track_validation";
import schema from "./schema";
import { modules } from "./test.setup";

const HEADER =
  "index|title|artist|album|albumArtist|duration|pos|durationMs|num|disc|id|year|x|x|x|x|x|x|x|spotify|mbid";

function csvRow(overrides: Record<number, string> = {}): string {
  const fields = [
    "1",
    "Imagine",
    "John Lennon",
    "Imagine",
    "John Lennon",
    "183",
    "1",
    "183000",
    "1",
    "1",
    "id",
    "1971-09-09",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
  ];
  for (const [index, value] of Object.entries(overrides)) {
    fields[Number(index)] = value;
  }
  return fields.join("|");
}

describe(parseYear, () => {
  test("parses ISO date year", () => {
    expect(parseYear("1987-05-01")).toBe(1987);
  });

  test("parses bare quoted year", () => {
    expect(parseYear('"1999"')).toBe(1999);
  });

  test("defaults placeholder date to 2000", () => {
    expect(parseYear("0000-00-00")).toBe(2000);
  });

  test("defaults missing value to 2000", () => {
    expect(parseYear(undefined)).toBe(2000);
  });

  test("defaults garbage to 2000", () => {
    expect(parseYear("not-a-date")).toBe(2000);
  });
});

describe(parseDurationToMs, () => {
  // Legacy CSV semantics, preserved deliberately: colon formats yield TOTAL
  // SECONDS ("3:45" -> 225), and the result lands in the schema's durationMs
  // field even though structured imports store true milliseconds there.
  // Raw millisecond strings ("183000") are rejected by this parser.
  // Tracked for a real fix in #354 — do not treat the seconds unit as intended
  // semantics for durationMs.
  test("returns undefined for missing duration", () => {
    expect(parseDurationToMs(undefined)).toBeUndefined();
  });

  test("parses minutes:seconds", () => {
    expect(parseDurationToMs("3:45")).toBe(225);
  });

  test("parses hours:minutes:seconds", () => {
    expect(parseDurationToMs("1:02:03")).toBe(3723);
  });

  test("rejects malformed durations", () => {
    expect(parseDurationToMs("abc")).toBeUndefined();
    expect(parseDurationToMs("1:2:3:4")).toBeUndefined();
    expect(parseDurationToMs("x:30")).toBeUndefined();
  });
});

describe(parseCsvLine, () => {
  test("parses a full row", () => {
    const item = parseCsvLine(csvRow());
    expect(item).toMatchObject({
      artist: "John Lennon",
      title: "Imagine",
      year: 1971,
    });
  });

  test("returns null for blank and short rows", () => {
    expect(parseCsvLine("")).toBeNull();
    expect(parseCsvLine("   \t ")).toBeNull();
    expect(parseCsvLine("a|b|c")).toBeNull();
  });

  test("returns null when artist is missing", () => {
    const item = parseCsvLine(csvRow({ 2: "" }));
    expect(item).toBeNull();
  });

  test("strips surrounding quotes", () => {
    const item = parseCsvLine(csvRow({ 1: '"Imagine"', 11: '"1971-01-01"' }));
    expect(item?.title).toBe("Imagine");
    expect(item?.year).toBe(1971);
  });

  test("keeps optional ids when present", () => {
    const item = parseCsvLine(csvRow({ 19: "spotify-id", 20: "mbid-123" }));
    expect(item?.spotifyTrackId).toBe("spotify-id");
    expect(item?.mbid).toBe("mbid-123");
  });
});

describe(parseCsvTracks, () => {
  test("skips header and blank lines", () => {
    const tracks = parseCsvTracks([HEADER, csvRow(), "", csvRow({ 1: "Jealous Guy" })].join("\n"));
    expect(tracks).toHaveLength(2);
    expect(tracks[0]?.title).toBe("Imagine");
    expect(tracks[1]?.title).toBe("Jealous Guy");
  });

  test("returns empty list for header-only input", () => {
    expect(parseCsvTracks(HEADER)).toStrictEqual([]);
  });
});

describe(validateTrackItem, () => {
  function baseItem(): Parameters<typeof validateTrackItem>[0] {
    return { artist: "Artist", title: "Title", year: 1990 };
  }

  test("accepts a valid item", () => {
    expect(() => validateTrackItem(baseItem())).not.toThrow();
  });

  test("rejects empty title", () => {
    expect(() => validateTrackItem({ ...baseItem(), title: "  " })).toThrow(ConvexError);
  });

  test("rejects empty artist", () => {
    expect(() => validateTrackItem({ ...baseItem(), artist: "" })).toThrow(ConvexError);
  });

  test("rejects out-of-range years", () => {
    expect(() => validateTrackItem({ ...baseItem(), year: 1899 })).toThrow(ConvexError);
    expect(() => validateTrackItem({ ...baseItem(), year: 2031 })).toThrow(ConvexError);
  });

  test("rejects blank optional ids", () => {
    expect(() => validateTrackItem({ ...baseItem(), mbid: " " })).toThrow(ConvexError);
    expect(() => validateTrackItem({ ...baseItem(), youtubeVideoId: "" })).toThrow(ConvexError);
  });

  test("rejects negative durations", () => {
    expect(() => validateTrackItem({ ...baseItem(), durationMs: -1 })).toThrow(ConvexError);
  });
});

describe("importTracksFromCsv", () => {
  test("imports valid tracks and flags invalid ones", async () => {
    const t = convexTest(schema, modules);
    vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await t.mutation(api.import_tracks.importTracksFromCsv, {
      tracks: [
        { artist: "Artist", title: "Good", year: 1990 },
        { artist: "", title: "Bad", year: 1990 },
      ],
    });

    expect(result.importedCount).toBe(1);
    expect(result.hasErrors).toBe(true);
  });

  test("clears existing tracks when requested", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(api.import_tracks.importTracksFromCsv, {
      tracks: [{ artist: "First", title: "First", year: 1990 }],
    });

    const result = await t.mutation(api.import_tracks.importTracksFromCsv, {
      clearExisting: true,
      tracks: [{ artist: "Second", title: "Second", year: 1991 }],
    });

    expect(result.deletedCount).toBe(1);
    expect(result.importedCount).toBe(1);
  });

  test("rejects an empty batch", async () => {
    const t = convexTest(schema, modules);

    await expect(t.mutation(api.import_tracks.importTracksFromCsv, { tracks: [] })).rejects.toThrow(
      "At least one track must be provided",
    );
  });
});
