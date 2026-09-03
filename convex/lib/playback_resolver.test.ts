import { describe, expect, test, vi } from "vitest";

import {
  createMockPlaybackResolver,
  createYouTubeApiPlaybackResolver,
  resolveCatalogPlaybackReferences,
} from "./playback_resolver";
import type { DerivedSpotifyTrack } from "./spotify";

const SAMPLE_TRACKS: DerivedSpotifyTrack[] = [
  {
    artist: "John Lennon",
    durationMs: 183_000,
    spotifyTrackId: "spotify-1",
    spotifyUrl: "https://open.spotify.com/track/spotify-1",
    title: "Imagine",
    year: 1971,
  },
  {
    artist: "Queen",
    durationMs: 354_000,
    spotifyTrackId: "spotify-2",
    spotifyUrl: "https://open.spotify.com/track/spotify-2",
    title: "Bohemian Rhapsody",
    year: 1975,
  },
  {
    artist: "The Beatles",
    durationMs: 431_000,
    spotifyTrackId: "spotify-3",
    spotifyUrl: "https://open.spotify.com/track/spotify-3",
    title: "Hey Jude",
    year: 1968,
  },
];

describe("resolveCatalogPlaybackReferences", () => {
  test("resolves all tracks successfully when resolver provides video IDs", async () => {
    const resolver = createMockPlaybackResolver({
      "spotify-1": "yt-imagine",
      "spotify-2": "yt-queen",
      "spotify-3": "yt-heyjude",
    });

    const result = await resolveCatalogPlaybackReferences(SAMPLE_TRACKS, resolver);

    expect(result.totalExamined).toBe(3);
    expect(result.resolvedTracks).toHaveLength(3);
    expect(result.unresolvedTracks).toHaveLength(0);

    expect(result.resolvedTracks[0]).toMatchObject({
      title: "Imagine",
      youtubeUrl: "https://www.youtube.com/watch?v=yt-imagine",
      youtubeVideoId: "yt-imagine",
    });
  });

  test("handles partial resolution when some tracks have no video match", async () => {
    const resolver = createMockPlaybackResolver({
      "spotify-1": "yt-imagine",
    });

    const result = await resolveCatalogPlaybackReferences(SAMPLE_TRACKS, resolver);

    expect(result.totalExamined).toBe(3);
    expect(result.resolvedTracks).toHaveLength(1);
    expect(result.unresolvedTracks).toHaveLength(2);

    expect(result.resolvedTracks[0]?.title).toBe("Imagine");
    expect(result.unresolvedTracks[0]?.track.title).toBe("Bohemian Rhapsody");
    expect(result.unresolvedTracks[0]?.reason).toBe("no_video_found");
    expect(result.unresolvedTracks[1]?.track.title).toBe("Hey Jude");
    expect(result.unresolvedTracks[1]?.reason).toBe("no_video_found");
  });

  test("catches resolver errors without failing the entire batch", async () => {
    const resolver = async (track: { title: string }) => {
      if (track.title === "Bohemian Rhapsody") {
        throw new Error("API rate limit exceeded");
      }
      return "yt-video";
    };

    const result = await resolveCatalogPlaybackReferences(SAMPLE_TRACKS, resolver);

    expect(result.resolvedTracks).toHaveLength(2);
    expect(result.unresolvedTracks).toHaveLength(1);
    expect(result.unresolvedTracks[0]?.reason).toBe("resolver_error");
    expect(result.unresolvedTracks[0]?.details).toContain("API rate limit exceeded");
  });

  test("returns empty lists for empty input", async () => {
    const resolver = createMockPlaybackResolver({});
    const result = await resolveCatalogPlaybackReferences([], resolver);

    expect(result.totalExamined).toBe(0);
    expect(result.resolvedTracks).toHaveLength(0);
    expect(result.unresolvedTracks).toHaveLength(0);
  });
});

describe("createMockPlaybackResolver", () => {
  test("resolves by Spotify track ID", async () => {
    const resolver = createMockPlaybackResolver({ "sp-id-1": "yt-id-1" });
    const videoId = await resolver({
      artist: "Any Artist",
      spotifyTrackId: "sp-id-1",
      title: "Any Title",
      year: 2000,
    });
    expect(videoId).toBe("yt-id-1");
  });

  test("resolves by canonical Title::Artist key case-insensitively", async () => {
    const resolver = createMockPlaybackResolver({ "imagine::john lennon": "yt-imagine" });
    const videoId = await resolver({
      artist: "John Lennon",
      title: "Imagine",
      year: 1971,
    });
    expect(videoId).toBe("yt-imagine");
  });

  test("returns null when not found", async () => {
    const resolver = createMockPlaybackResolver({});
    const videoId = await resolver({
      artist: "Unknown",
      title: "Unknown",
      year: 2000,
    });
    expect(videoId).toBeNull();
  });
});

describe("createYouTubeApiPlaybackResolver", () => {
  test("throws error if API key is blank", () => {
    expect(() => createYouTubeApiPlaybackResolver("   ")).toThrow("YouTube API key is required");
  });

  test("fetches video ID using YouTube Data API", async () => {
    const mockFetch: typeof fetch = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            items: [{ id: { videoId: "yt-video-123" } }],
          }),
          { status: 200 },
        ),
    );

    const resolver = createYouTubeApiPlaybackResolver("valid-api-key", mockFetch);
    const videoId = await resolver({
      artist: "Queen",
      title: "Bohemian Rhapsody",
      year: 1975,
    });

    expect(videoId).toBe("yt-video-123");
  });

  test("throws on failed HTTP response", async () => {
    const mockFetch: typeof fetch = vi.fn(async () => new Response("Forbidden", { status: 403 }));

    const resolver = createYouTubeApiPlaybackResolver("valid-api-key", mockFetch);

    await expect(
      resolver({ artist: "Queen", title: "Bohemian Rhapsody", year: 1975 }),
    ).rejects.toThrow("YouTube API request failed (403): Forbidden");
  });

  test("throws clear error on 429 rate limit response", async () => {
    const mockFetch: typeof fetch = vi.fn(async () => new Response("Rate limit", { status: 429 }));

    const resolver = createYouTubeApiPlaybackResolver("valid-api-key", mockFetch);

    await expect(
      resolver({ artist: "Queen", title: "Bohemian Rhapsody", year: 1975 }),
    ).rejects.toThrow("YouTube API rate limit exceeded (HTTP 429)");
  });

  test("throws clear error on quota exhaustion", async () => {
    const mockFetch: typeof fetch = vi.fn(
      async () =>
        new Response(JSON.stringify({ error: { errors: [{ reason: "quotaExceeded" }] } }), {
          status: 403,
        }),
    );

    const resolver = createYouTubeApiPlaybackResolver("valid-api-key", mockFetch);

    await expect(
      resolver({ artist: "Queen", title: "Bohemian Rhapsody", year: 1975 }),
    ).rejects.toThrow("YouTube API daily quota exceeded");
  });
});
