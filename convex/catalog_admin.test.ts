import { ConvexError } from "convex/values";
import { convexTest } from "convex-test";
import { describe, expect, expectTypeOf, test } from "vitest";

import { api, internal } from "./_generated/api";
import {
  createMockPlaybackResolver,
  resolveCatalogPlaybackReferences,
} from "./lib/playback_resolver";
import { deriveCatalogTracks, type RawSpotifyPlaylistItem } from "./lib/spotify";
import schema from "./schema";
import { modules } from "./test.setup";

describe("catalog_admin public API boundary", () => {
  test("administrative catalog replacement is absent from the public API", () => {
    type HasPublicCatalogAdmin = "catalog_admin" extends keyof typeof api ? true : false;
    expectTypeOf<HasPublicCatalogAdmin>().toEqualTypeOf<false>();
  });
});

describe("replaceCatalog internal mutation", () => {
  test("replaces existing tracks atomically with new validated tracks", async () => {
    const t = convexTest(schema, modules);

    // Seed an initial track
    await t.run(async (ctx) => {
      await ctx.db.insert("tracks", {
        artist: "Old Artist",
        createdAt: Date.now(),
        externalIds: {},
        links: {},
        source: "seed",
        title: "Old Track",
        year: 1980,
      });
    });

    // Replace catalog with 2 new tracks
    const result = await t.mutation(internal.catalog_admin.replaceCatalog, {
      tracks: [
        {
          artist: "The Beatles",
          durationMs: 180_000,
          spotifyTrackId: "sp-beatles",
          title: "Come Together",
          year: 1969,
          youtubeVideoId: "yt-beatles",
        },
        {
          artist: "Queen",
          title: "Bohemian Rhapsody",
          year: 1975,
          youtubeVideoId: "yt-queen",
        },
      ],
    });

    expect(result.deletedCount).toBe(1);
    expect(result.importedCount).toBe(2);

    const tracks = await t.query(api.tracks.list, {});
    expect(tracks).toHaveLength(2);

    const titles = tracks.map((t) => t.title);
    expect(titles).toContain("Come Together");
    expect(titles).toContain("Bohemian Rhapsody");
    expect(titles).not.toContain("Old Track");

    const beatlesTrack = tracks.find((t) => t.title === "Come Together");
    expect(beatlesTrack?.externalIds.spotifyTrackId).toBe("sp-beatles");
    expect(beatlesTrack?.externalIds.youtubeVideoId).toBe("yt-beatles");
    expect(beatlesTrack?.links.spotifyUrl).toBe("https://open.spotify.com/track/sp-beatles");
    expect(beatlesTrack?.links.youtubeUrl).toBe("https://www.youtube.com/watch?v=yt-beatles");
    expect(beatlesTrack?.source).toBe("spotify-playlist");
  });

  test("does not corrupt or delete existing catalog if any track is malformed", async () => {
    const t = convexTest(schema, modules);

    // Seed an initial track
    await t.run(async (ctx) => {
      await ctx.db.insert("tracks", {
        artist: "Safe Artist",
        createdAt: Date.now(),
        externalIds: {},
        links: {},
        source: "seed",
        title: "Safe Track",
        year: 1980,
      });
    });

    // Attempt to replace with a batch containing an invalid track (year out of bounds)
    await expect(
      t.mutation(internal.catalog_admin.replaceCatalog, {
        tracks: [
          {
            artist: "Valid Artist",
            title: "Valid Track",
            year: 1990,
          },
          {
            artist: "Invalid Artist",
            title: "Invalid Track",
            year: 1850, // Out of bounds (< 1900)
          },
        ],
      }),
    ).rejects.toThrow(ConvexError);

    // Verify existing track is STILL present and untouched
    const tracks = await t.query(api.tracks.list, {});
    expect(tracks).toHaveLength(1);
    expect(tracks[0]?.title).toBe("Safe Track");
  });

  test("rejects empty track list without modifying database", async () => {
    const t = convexTest(schema, modules);

    await expect(
      t.mutation(internal.catalog_admin.replaceCatalog, {
        tracks: [],
      }),
    ).rejects.toThrow("At least one track must be provided for catalog replacement");
  });
});

describe("offline end-to-end import pipeline", () => {
  test("derives, resolves, and safely replaces catalog with representative partial failures", async () => {
    const t = convexTest(schema, modules);

    // Initial catalog
    await t.run(async (ctx) => {
      await ctx.db.insert("tracks", {
        artist: "Initial Artist",
        createdAt: Date.now(),
        externalIds: {},
        links: {},
        source: "seed",
        title: "Initial Track",
        year: 1970,
      });
    });

    // Raw playlist with:
    // - 2 valid tracks
    // - 1 local file
    // - 1 malformed year track
    // - 1 duplicate track
    const mockSpotifyItems: RawSpotifyPlaylistItem[] = [
      {
        is_local: false,
        track: {
          album: { release_date: "1971-09-09" },
          artists: [{ name: "John Lennon" }],
          duration_ms: 183_000,
          id: "sp-imagine",
          name: "Imagine",
          type: "track",
        },
      },
      {
        is_local: false,
        track: {
          album: { release_date: "1975-10-31" },
          artists: [{ name: "Queen" }],
          duration_ms: 354_000,
          id: "sp-bohemian",
          name: "Bohemian Rhapsody",
          type: "track",
        },
      },
      {
        is_local: true, // Local file -> unavailable
        track: {
          id: "sp-local",
          name: "My Local Recording",
        },
      },
      {
        is_local: false, // Malformed year
        track: {
          album: { release_date: "invalid-year" },
          artists: [{ name: "The Clash" }],
          id: "sp-clash",
          name: "London Calling",
          type: "track",
        },
      },
      {
        is_local: false, // Duplicate
        track: {
          album: { release_date: "1971-09-09" },
          artists: [{ name: "John Lennon" }],
          id: "sp-imagine",
          name: "Imagine",
          type: "track",
        },
      },
    ];

    // Step 1: Derive catalog tracks
    const derivation = deriveCatalogTracks(mockSpotifyItems);
    expect(derivation.totalExamined).toBe(5);
    expect(derivation.validTracks).toHaveLength(2);
    expect(derivation.unavailable).toHaveLength(1);
    expect(derivation.malformed).toHaveLength(1);
    expect(derivation.duplicates).toHaveLength(1);

    // Step 2: Resolve playback references with mock resolver
    // Only "sp-imagine" is found; "sp-bohemian" returns null (unresolved)
    const mockResolver = createMockPlaybackResolver({
      "sp-imagine": "yt-imagine-vid",
    });

    const resolution = await resolveCatalogPlaybackReferences(derivation.validTracks, mockResolver);

    expect(resolution.resolvedTracks).toHaveLength(1);
    expect(resolution.unresolvedTracks).toHaveLength(1);
    expect(resolution.unresolvedTracks[0]?.track.title).toBe("Bohemian Rhapsody");

    // Step 3: Replace catalog with only the playable resolved tracks
    const replaceResult = await t.mutation(internal.catalog_admin.replaceCatalog, {
      source: "spotify:test-playlist",
      tracks: resolution.resolvedTracks.map((t) => ({
        artist: t.artist,
        durationMs: t.durationMs,
        spotifyTrackId: t.spotifyTrackId,
        title: t.title,
        year: t.year,
        youtubeVideoId: t.youtubeVideoId,
      })),
    });

    expect(replaceResult.deletedCount).toBe(1);
    expect(replaceResult.importedCount).toBe(1);

    const finalTracks = await t.query(api.tracks.list, {});
    expect(finalTracks).toHaveLength(1);
    expect(finalTracks[0]?.title).toBe("Imagine");
    expect(finalTracks[0]?.artist).toBe("John Lennon");
    expect(finalTracks[0]?.year).toBe(1971);
    expect(finalTracks[0]?.externalIds.youtubeVideoId).toBe("yt-imagine-vid");
    expect(finalTracks[0]?.externalIds.spotifyTrackId).toBe("sp-imagine");
  });
});

describe("importSpotifyPlaylist internal action", () => {
  test("runs action with mocked fetch and returns structured report", async () => {
    const t = convexTest(schema, modules);

    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (input: RequestInfo | URL) => {
      const urlStr =
        typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      if (urlStr.includes("api.spotify.com/v1/playlists/")) {
        return new Response(
          JSON.stringify({
            name: "Test Spotify Playlist",
            tracks: {
              items: [
                {
                  is_local: false,
                  track: {
                    album: { release_date: "1971-09-09" },
                    artists: [{ name: "John Lennon" }],
                    duration_ms: 183_000,
                    id: "sp-imagine",
                    is_playable: true,
                    name: "Imagine",
                    type: "track",
                  },
                },
              ],
              next: null,
            },
          }),
          { headers: { "Content-Type": "application/json" }, status: 200 },
        );
      }
      return new Response("Not found", { status: 404 });
    };

    try {
      const report = await t.action(internal.catalog_admin.importSpotifyPlaylist, {
        dryRun: true,
        playlistInput: "37i9dQZF1DXcBWIGoYBM5M",
        spotifyToken: "mock-token",
      });

      expect(report.playlistId).toBe("37i9dQZF1DXcBWIGoYBM5M");
      expect(report.playlistName).toBe("Test Spotify Playlist");
      expect(report.totalExamined).toBe(1);
      expect(report.validCount).toBe(1);
      expect(report.dryRun).toBe(true);
      expect(report.importedCount).toBe(0);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("runs action with replaceExisting and replaces database tracks", async () => {
    const t = convexTest(schema, modules);

    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (input: RequestInfo | URL) => {
      const urlStr =
        typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      if (urlStr.includes("api.spotify.com/v1/playlists/")) {
        return new Response(
          JSON.stringify({
            name: "Replace Playlist",
            tracks: {
              items: [
                {
                  is_local: false,
                  track: {
                    album: { release_date: "1982-11-30" },
                    artists: [{ name: "Michael Jackson" }],
                    duration_ms: 294_000,
                    id: "sp-thriller",
                    is_playable: true,
                    name: "Thriller",
                    type: "track",
                  },
                },
              ],
              next: null,
            },
          }),
          { headers: { "Content-Type": "application/json" }, status: 200 },
        );
      }
      if (urlStr.includes("googleapis.com/youtube/v3/search")) {
        return new Response(
          JSON.stringify({
            items: [{ id: { videoId: "yt-thriller-123" } }],
          }),
          { headers: { "Content-Type": "application/json" }, status: 200 },
        );
      }
      return new Response("Not found", { status: 404 });
    };

    try {
      const report = await t.action(internal.catalog_admin.importSpotifyPlaylist, {
        dryRun: false,
        playlistInput: "37i9dQZF1DXcBWIGoYBM5M",
        replaceExisting: true,
        spotifyToken: "mock-token",
        youtubeApiKey: "yt-test-key",
      });

      expect(report.resolvedCount).toBe(1);
      expect(report.importedCount).toBe(1);
      expect(report.replaceResult?.importedCount).toBe(1);

      const tracks = await t.query(api.tracks.list, {});
      expect(tracks).toHaveLength(1);
      expect(tracks[0]?.title).toBe("Thriller");
      expect(tracks[0]?.externalIds.youtubeVideoId).toBe("yt-thriller-123");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
