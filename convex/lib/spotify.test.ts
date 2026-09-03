import { describe, expect, test } from "vitest";

import {
  canonicalTrackKey,
  deriveCatalogTracks,
  parseReleaseYear,
  parseSpotifyPlaylistId,
  type RawSpotifyPlaylistItem,
} from "./spotify";

describe("parseSpotifyPlaylistId", () => {
  test("extracts ID from standard web URL", () => {
    expect(parseSpotifyPlaylistId("https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M")).toBe(
      "37i9dQZF1DXcBWIGoYBM5M",
    );
  });

  test("extracts ID from URL with query parameters", () => {
    expect(
      parseSpotifyPlaylistId(
        "https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M?si=e9f456abcedf",
      ),
    ).toBe("37i9dQZF1DXcBWIGoYBM5M");
  });

  test("extracts ID from localized URL with international subpath", () => {
    expect(
      parseSpotifyPlaylistId("https://open.spotify.com/intl-es/playlist/37i9dQZF1DXcBWIGoYBM5M"),
    ).toBe("37i9dQZF1DXcBWIGoYBM5M");
  });

  test("extracts ID from URL with trailing slash", () => {
    expect(
      parseSpotifyPlaylistId("https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M/"),
    ).toBe("37i9dQZF1DXcBWIGoYBM5M");
  });

  test("extracts ID from Spotify URI", () => {
    expect(parseSpotifyPlaylistId("spotify:playlist:37i9dQZF1DXcBWIGoYBM5M")).toBe(
      "37i9dQZF1DXcBWIGoYBM5M",
    );
  });

  test("accepts bare valid Spotify playlist ID", () => {
    expect(parseSpotifyPlaylistId("37i9dQZF1DXcBWIGoYBM5M")).toBe("37i9dQZF1DXcBWIGoYBM5M");
  });

  test("trims whitespace from input", () => {
    expect(parseSpotifyPlaylistId("  37i9dQZF1DXcBWIGoYBM5M \n")).toBe("37i9dQZF1DXcBWIGoYBM5M");
  });

  test("rejects empty string", () => {
    expect(() => parseSpotifyPlaylistId("")).toThrow(
      "Spotify playlist identifier or URL is required",
    );
  });

  test("rejects non-Spotify URL", () => {
    expect(() => parseSpotifyPlaylistId("https://music.apple.com/playlist/pl.1234567890")).toThrow(
      'URL host is not Spotify: "music.apple.com"',
    );
  });

  test("rejects Spotify track URL", () => {
    expect(() =>
      parseSpotifyPlaylistId("https://open.spotify.com/track/4LfCY65LvojKjWEnU7fNN4"),
    ).toThrow("No valid playlist ID found in URL");
  });

  test("rejects invalid URI structure", () => {
    expect(() => parseSpotifyPlaylistId("spotify:playlist:invalid!")).toThrow(
      'Invalid Spotify playlist URI: "spotify:playlist:invalid!"',
    );
  });

  test("rejects garbage string", () => {
    expect(() => parseSpotifyPlaylistId("not-a-valid-id-@#$")).toThrow(
      'Invalid Spotify playlist URL or identifier: "not-a-valid-id-@#$"',
    );
  });
});

describe("parseReleaseYear", () => {
  test("parses full YYYY-MM-DD date", () => {
    expect(parseReleaseYear("1985-07-13")).toBe(1985);
  });

  test("parses YYYY-MM date", () => {
    expect(parseReleaseYear("1994-11")).toBe(1994);
  });

  test("parses standalone YYYY", () => {
    expect(parseReleaseYear("2010")).toBe(2010);
  });

  test("returns null for empty or undefined date", () => {
    expect(parseReleaseYear(undefined)).toBeNull();
    expect(parseReleaseYear(null)).toBeNull();
    expect(parseReleaseYear("")).toBeNull();
  });

  test("returns null for zero placeholder date", () => {
    expect(parseReleaseYear("0000-00-00")).toBeNull();
    expect(parseReleaseYear("0000")).toBeNull();
  });

  test("returns null for year before MIN_YEAR (1900)", () => {
    expect(parseReleaseYear("1880-01-01")).toBeNull();
  });

  test("returns null for year after MAX_YEAR (2030)", () => {
    expect(parseReleaseYear("2050-01-01")).toBeNull();
  });

  test("returns null for garbage string", () => {
    expect(parseReleaseYear("unknown-date")).toBeNull();
  });
});

describe("canonicalTrackKey", () => {
  test("normalizes casing and spaces", () => {
    expect(canonicalTrackKey("  Imagine ", " John Lennon ")).toBe("imagine::john lennon");
  });
});

describe("deriveCatalogTracks", () => {
  function validItem(overrides: Partial<RawSpotifyPlaylistItem> = {}): RawSpotifyPlaylistItem {
    return {
      is_local: false,
      track: {
        album: {
          name: "Imagine",
          release_date: "1971-09-09",
        },
        artists: [{ name: "John Lennon" }],
        duration_ms: 183_000,
        id: "track-123",
        is_local: false,
        is_playable: true,
        name: "Imagine",
        type: "track",
      },
      ...overrides,
    };
  }

  test("derives metadata for valid track", () => {
    const result = deriveCatalogTracks([validItem()]);

    expect(result.validTracks).toHaveLength(1);
    expect(result.validTracks[0]).toStrictEqual({
      artist: "John Lennon",
      durationMs: 183_000,
      spotifyTrackId: "track-123",
      spotifyUrl: "https://open.spotify.com/track/track-123",
      title: "Imagine",
      year: 1971,
    });
    expect(result.allIssues).toHaveLength(0);
    expect(result.totalExamined).toBe(1);
  });

  test("joins multiple artist names", () => {
    const item = validItem();
    if (item.track) {
      item.track.artists = [{ name: "Queen" }, { name: "David Bowie" }];
      item.track.name = "Under Pressure";
      item.track.id = "track-456";
    }

    const result = deriveCatalogTracks([item]);
    expect(result.validTracks[0]?.artist).toBe("Queen, David Bowie");
  });

  test("records missing_track_data for null or non-track items", () => {
    const result = deriveCatalogTracks([
      null,
      undefined,
      { is_local: false, track: null },
      {
        track: {
          id: "ep-1",
          name: "Podcast Episode",
          type: "episode",
        },
      },
    ]);

    expect(result.validTracks).toHaveLength(0);
    expect(result.unavailable).toHaveLength(4);
    expect(result.unavailable.every((i) => i.reason === "missing_track_data")).toBe(true);
    expect(result.totalExamined).toBe(4);
  });

  test("records local_track for local audio files", () => {
    const item = validItem({ is_local: true });
    const result = deriveCatalogTracks([item]);

    expect(result.validTracks).toHaveLength(0);
    expect(result.unavailable).toHaveLength(1);
    expect(result.unavailable[0]?.reason).toBe("local_track");
  });

  test("records unavailable_track when is_playable is false", () => {
    const item = validItem();
    if (item.track) {
      item.track.is_playable = false;
    }

    const result = deriveCatalogTracks([item]);
    expect(result.validTracks).toHaveLength(0);
    expect(result.unavailable).toHaveLength(1);
    expect(result.unavailable[0]?.reason).toBe("unavailable_track");
  });

  test("records missing_title when track title is empty", () => {
    const item = validItem();
    if (item.track) {
      item.track.name = "   ";
    }

    const result = deriveCatalogTracks([item]);
    expect(result.validTracks).toHaveLength(0);
    expect(result.malformed).toHaveLength(1);
    expect(result.malformed[0]?.reason).toBe("missing_title");
  });

  test("records missing_artist when artist list is empty or whitespace", () => {
    const item = validItem();
    if (item.track) {
      item.track.artists = [{ name: "   " }];
    }

    const result = deriveCatalogTracks([item]);
    expect(result.validTracks).toHaveLength(0);
    expect(result.malformed).toHaveLength(1);
    expect(result.malformed[0]?.reason).toBe("missing_artist");
  });

  test("records missing_release_year when release date is missing or invalid", () => {
    const item = validItem();
    if (item.track?.album) {
      item.track.album.release_date = "invalid-date";
    }

    const result = deriveCatalogTracks([item]);
    expect(result.validTracks).toHaveLength(0);
    expect(result.malformed).toHaveLength(1);
    expect(result.malformed[0]?.reason).toBe("missing_release_year");
  });

  test("records invalid_year_range when year is out of bounds", () => {
    const item = validItem();
    if (item.track?.album) {
      item.track.album.release_date = "1850-01-01";
    }

    const result = deriveCatalogTracks([item]);
    expect(result.validTracks).toHaveLength(0);
    expect(result.malformed).toHaveLength(1);
    expect(result.malformed[0]?.reason).toBe("invalid_year_range");
  });

  test("detects duplicate by Spotify track ID", () => {
    const item1 = validItem();
    const item2 = validItem(); // same id "track-123"

    const result = deriveCatalogTracks([item1, item2]);
    expect(result.validTracks).toHaveLength(1);
    expect(result.duplicates).toHaveLength(1);
    expect(result.duplicates[0]?.reason).toBe("duplicate_id");
  });

  test("detects duplicate by canonical title and artist", () => {
    const item1 = validItem();
    const item2 = validItem();
    if (item2.track) {
      item2.track.id = "track-999"; // different ID, but same title & artist
      item2.track.name = "imagine"; // case variation
    }

    const result = deriveCatalogTracks([item1, item2]);
    expect(result.validTracks).toHaveLength(1);
    expect(result.duplicates).toHaveLength(1);
    expect(result.duplicates[0]?.reason).toBe("duplicate_title_artist");
  });

  test("handles mixed playlist with representative partial-failure cases cleanly", () => {
    const items = [
      validItem(), // 0: valid
      { is_local: false, track: null }, // 1: missing track data
      validItem({ is_local: true }), // 2: local file
      {
        track: {
          album: { release_date: "1975-01-01" },
          artists: [{ name: "Pink Floyd" }],
          id: "track-pf-1",
          is_playable: false,
          name: "Wish You Were Here",
        },
      }, // 3: unplayable
      {
        track: {
          album: { release_date: "invalid" },
          artists: [{ name: "The Clash" }],
          id: "track-clash",
          name: "London Calling",
        },
      }, // 4: malformed year
      {
        track: {
          album: { release_date: "1977-10-28" },
          artists: [{ name: "Queen" }],
          id: "track-queen-1",
          name: "We Will Rock You",
        },
      }, // 5: valid
      {
        track: {
          album: { release_date: "1977-10-28" },
          artists: [{ name: "Queen" }],
          id: "track-queen-1",
          name: "We Will Rock You",
        },
      }, // 6: duplicate
    ];

    const result = deriveCatalogTracks(items);

    expect(result.totalExamined).toBe(7);
    expect(result.validTracks).toHaveLength(2);
    expect(result.validTracks[0]?.title).toBe("Imagine");
    expect(result.validTracks[1]?.title).toBe("We Will Rock You");

    expect(result.unavailable).toHaveLength(3); // items 1, 2, 3
    expect(result.malformed).toHaveLength(1); // item 4
    expect(result.duplicates).toHaveLength(1); // item 6
    expect(result.allIssues).toHaveLength(5);
  });
});
