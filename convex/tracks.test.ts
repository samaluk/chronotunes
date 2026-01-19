import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

test("get returns track by ID", async () => {
  const t = convexTest(schema);

  const trackId = await t.run(async (ctx) => {
    return await ctx.db.insert("tracks", {
      title: "Test Track",
      artist: "Test Artist",
      year: 1990,
      externalIds: { youtubeVideoId: "abc123" },
      links: {},
      createdAt: Date.now(),
      source: "test",
    });
  });

  const track = await t.query(api.tracks.get, { trackIds: [trackId] });

  expect(track).toHaveLength(1);
  expect(track[0]).not.toBeNull();
  expect(track[0]?.title).toBe("Test Track");
  expect(track[0]?.artist).toBe("Test Artist");
  expect(track[0]?.year).toBe(1990);
});

test("get returns multiple tracks by ID", async () => {
  const t = convexTest(schema);

  const trackId1 = await t.run(async (ctx) => {
    return await ctx.db.insert("tracks", {
      title: "Track 1",
      artist: "Artist 1",
      year: 1980,
      externalIds: {},
      links: {},
      createdAt: Date.now(),
      source: "test",
    });
  });

  const trackId2 = await t.run(async (ctx) => {
    return await ctx.db.insert("tracks", {
      title: "Track 2",
      artist: "Artist 2",
      year: 1990,
      externalIds: {},
      links: {},
      createdAt: Date.now(),
      source: "test",
    });
  });

  const trackId3 = await t.run(async (ctx) => {
    return await ctx.db.insert("tracks", {
      title: "Track 3",
      artist: "Artist 3",
      year: 2000,
      externalIds: {},
      links: {},
      createdAt: Date.now(),
      source: "test",
    });
  });

  const tracks = await t.query(api.tracks.get, {
    trackIds: [trackId1, trackId2, trackId3],
  });

  expect(tracks).toHaveLength(3);
  expect(tracks[0]?.title).toBe("Track 1");
  expect(tracks[1]?.title).toBe("Track 2");
  expect(tracks[2]?.title).toBe("Track 3");
});

test("get returns empty array for empty input", async () => {
  const t = convexTest(schema);

  const tracks = await t.query(api.tracks.get, { trackIds: [] });

  expect(tracks).toHaveLength(0);
});

test("importTracks creates tracks from array", async () => {
  const t = convexTest(schema);

  const tracks = [
    { title: "Test Song 1", artist: "Artist 1", year: 1990, youtubeVideoId: "abc123" },
    { title: "Test Song 2", artist: "Artist 2", year: 1995 },
    { title: "Test Song 3", artist: "Artist 3", year: 2000, youtubeVideoId: "xyz789" },
  ];

  const result = await t.mutation(api.tracks.importTracks, { tracks });

  expect(result.importedCount).toBe(3);
  expect(result.trackIds).toHaveLength(3);

  const allTracks = await t.query(api.tracks.list);
  expect(allTracks).toHaveLength(3);
});

test("importTracks validates required title", async () => {
  const t = convexTest(schema);

  const tracks = [{ title: "", artist: "Artist", year: 1990 }];

  await expect(t.mutation(api.tracks.importTracks, { tracks })).rejects.toThrow(
    "Track title is required",
  );
});

test("importTracks validates required artist", async () => {
  const t = convexTest(schema);

  const tracks = [{ title: "Song", artist: "", year: 1990 }];

  await expect(t.mutation(api.tracks.importTracks, { tracks })).rejects.toThrow(
    "Track artist is required",
  );
});

test("importTracks validates year range", async () => {
  const t = convexTest(schema);

  const tracksTooEarly = [{ title: "Song", artist: "Artist", year: 1800 }];
  const tracksTooLate = [{ title: "Song", artist: "Artist", year: 2050 }];

  await expect(t.mutation(api.tracks.importTracks, { tracks: tracksTooEarly })).rejects.toThrow(
    "Track year must be between 1900 and 2030",
  );
  await expect(t.mutation(api.tracks.importTracks, { tracks: tracksTooLate })).rejects.toThrow(
    "Track year must be between 1900 and 2030",
  );
});

test("importTracks validates empty array", async () => {
  const t = convexTest(schema);

  await expect(t.mutation(api.tracks.importTracks, { tracks: [] })).rejects.toThrow(
    "At least one track must be provided",
  );
});

test("importTracks validates max batch size", async () => {
  const t = convexTest(schema);

  const tracks = Array.from({ length: 1001 }, (_, i) => ({
    title: `Song ${i}`,
    artist: "Artist",
    year: 2000,
  }));

  await expect(t.mutation(api.tracks.importTracks, { tracks })).rejects.toThrow(
    "Cannot import more than 1000 tracks at once",
  );
});

test("importTracks validates empty youtubeVideoId", async () => {
  const t = convexTest(schema);

  const tracks = [{ title: "Song", artist: "Artist", year: 1990, youtubeVideoId: "   " }];

  await expect(t.mutation(api.tracks.importTracks, { tracks })).rejects.toThrow(
    "YouTube video ID must be a non-empty string if provided",
  );
});

test("importTracks validates negative durationMs", async () => {
  const t = convexTest(schema);

  const tracks = [{ title: "Song", artist: "Artist", year: 1990, durationMs: -100 }];

  await expect(t.mutation(api.tracks.importTracks, { tracks })).rejects.toThrow(
    "Duration must be a non-negative number if provided",
  );
});

test("importTracks with optional mbid", async () => {
  const t = convexTest(schema);

  const tracks = [
    {
      title: "Song with MBID",
      artist: "Artist",
      year: 1990,
      mbid: "12345678-1234-1234-1234-123456789012",
    },
  ];

  const result = await t.mutation(api.tracks.importTracks, { tracks });

  expect(result.importedCount).toBe(1);

  const allTracks = await t.query(api.tracks.list);
  expect(allTracks[0]?.mbid).toBe("12345678-1234-1234-1234-123456789012");
});

test("importTracks with optional durationMs", async () => {
  const t = convexTest(schema);

  const tracks = [{ title: "Song", artist: "Artist", year: 1990, durationMs: 180000 }];

  const result = await t.mutation(api.tracks.importTracks, { tracks });

  expect(result.importedCount).toBe(1);

  const allTracks = await t.query(api.tracks.list);
  expect(allTracks[0]?.durationMs).toBe(180000);
});

test("importTracks trims whitespace from strings", async () => {
  const t = convexTest(schema);

  const tracks = [{ title: "  Song Title  ", artist: "  Artist Name  ", year: 1990 }];

  const result = await t.mutation(api.tracks.importTracks, { tracks });

  expect(result.importedCount).toBe(1);

  const allTracks = await t.query(api.tracks.list);
  expect(allTracks[0]?.title).toBe("Song Title");
  expect(allTracks[0]?.artist).toBe("Artist Name");
});
