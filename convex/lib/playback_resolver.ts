import type { DerivedSpotifyTrack } from "./spotify";

export interface ResolvedCatalogTrack extends DerivedSpotifyTrack {
  youtubeUrl: string;
  youtubeVideoId: string;
}

export interface PlaybackResolutionIssue {
  details: string;
  reason: "no_video_found" | "resolver_error";
  track: DerivedSpotifyTrack;
}

export interface PlaybackResolutionResult {
  resolvedTracks: ResolvedCatalogTrack[];
  totalExamined: number;
  unresolvedTracks: PlaybackResolutionIssue[];
}

export type PlaybackResolver = (track: {
  artist: string;
  spotifyTrackId?: string;
  title: string;
  year: number;
}) => Promise<string | null>;

/**
 * Resolves external playback references (YouTube video IDs) for derived Spotify tracks
 * through an explicit, testable pipeline step.
 *
 * Unresolved tracks are excluded from the resolved output so they do not corrupt the catalog
 * with unplayable entries.
 */
export async function resolveCatalogPlaybackReferences(
  tracks: DerivedSpotifyTrack[],
  resolver: PlaybackResolver,
  options: { concurrency?: number } = {},
): Promise<PlaybackResolutionResult> {
  const concurrency = Math.max(1, options.concurrency ?? 5);
  const resolvedTracks: ResolvedCatalogTrack[] = [];
  const unresolvedTracks: PlaybackResolutionIssue[] = [];

  for (let i = 0; i < tracks.length; i += concurrency) {
    const chunk = tracks.slice(i, i + concurrency);
    const results = await Promise.all(
      chunk.map(async (track) => {
        try {
          const videoId = await resolver({
            artist: track.artist,
            spotifyTrackId: track.spotifyTrackId,
            title: track.title,
            year: track.year,
          });

          const trimmedId = videoId?.trim();
          if (trimmedId) {
            return {
              status: "resolved" as const,
              track: {
                ...track,
                youtubeUrl: `https://www.youtube.com/watch?v=${trimmedId}`,
                youtubeVideoId: trimmedId,
              },
            };
          }

          return {
            issue: {
              details: `No YouTube video ID found for "${track.title}" by ${track.artist}`,
              reason: "no_video_found" as const,
              track,
            },
            status: "unresolved" as const,
          };
        } catch (error) {
          return {
            issue: {
              details:
                error instanceof Error
                  ? error.message
                  : `Resolver error for "${track.title}" by ${track.artist}`,
              reason: "resolver_error" as const,
              track,
            },
            status: "unresolved" as const,
          };
        }
      }),
    );

    for (const res of results) {
      if (res.status === "resolved") {
        resolvedTracks.push(res.track);
      } else {
        unresolvedTracks.push(res.issue);
      }
    }
  }

  return {
    resolvedTracks,
    totalExamined: tracks.length,
    unresolvedTracks,
  };
}

/**
 * Creates a mock playback resolver from a lookup map for hermetic testing.
 * Supports lookup by Spotify track ID or canonical key "Title::Artist" (case-insensitive).
 */
export function createMockPlaybackResolver(
  mapping: Record<string, string | null>,
): PlaybackResolver {
  return async (track) => {
    if (track.spotifyTrackId && track.spotifyTrackId in mapping) {
      return mapping[track.spotifyTrackId] ?? null;
    }

    const key = `${track.title.toLowerCase()}::${track.artist.toLowerCase()}`;
    if (key in mapping) {
      return mapping[key] ?? null;
    }

    return null;
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Creates an official YouTube Data API v3 resolver using an operator's API key.
 */
export function createYouTubeApiPlaybackResolver(
  apiKey: string,
  fetchFn: typeof fetch = fetch,
): PlaybackResolver {
  if (!apiKey.trim()) {
    throw new Error("YouTube API key is required to create YouTube API resolver");
  }

  return async (track) => {
    const query = `${track.title} ${track.artist} official audio`;
    const params = new URLSearchParams({
      key: apiKey.trim(),
      maxResults: "1",
      part: "snippet",
      q: query,
      type: "video",
    });

    const response = await fetchFn(
      `https://www.googleapis.com/youtube/v3/search?${params.toString()}`,
    );

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error("YouTube API rate limit exceeded (HTTP 429). Please wait before retrying.");
      }
      const errorText = await response.text();
      if (response.status === 403 && errorText.includes("quotaExceeded")) {
        throw new Error(
          "YouTube API daily quota exceeded. Quota resets daily at midnight Pacific Time.",
        );
      }
      throw new Error(`YouTube API request failed (${response.status}): ${errorText}`);
    }

    const rawData: unknown = await response.json();
    if (isRecord(rawData) && Array.isArray(rawData["items"])) {
      const firstItem: unknown = rawData["items"][0];
      if (
        isRecord(firstItem) &&
        isRecord(firstItem["id"]) &&
        typeof firstItem["id"]["videoId"] === "string"
      ) {
        return firstItem["id"]["videoId"];
      }
    }

    return null;
  };
}
