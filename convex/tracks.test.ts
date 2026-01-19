import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

test("get returns track by ID", async () => {
  const t = convexTest(schema, modules);

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
  const t = convexTest(schema, modules);

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
  const t = convexTest(schema, modules);

  const tracks = await t.query(api.tracks.get, { trackIds: [] });

  expect(tracks).toHaveLength(0);
});
