import { describe, expect, test, vi } from "vitest";

import {
  fetchPlaylistFromEmbed,
  fetchPlaylistFromWebApi,
  fetchSpotifyPlaylist,
  getSpotifyClientCredentialsToken,
} from "./spotify_fetcher";

describe("getSpotifyClientCredentialsToken", () => {
  test("obtains access token with valid credentials", async () => {
    const mockFetch: typeof fetch = vi.fn<typeof fetch>(
      async () =>
        new Response(JSON.stringify({ access_token: "mock-spotify-token", expires_in: 3600 }), {
          status: 200,
        }),
    );

    const token = await getSpotifyClientCredentialsToken("client-id", "client-secret", mockFetch);

    expect(token).toBe("mock-spotify-token");
  });

  test("throws on authentication failure", async () => {
    const mockFetch: typeof fetch = vi.fn<typeof fetch>(
      async () => new Response("Invalid client credentials", { status: 401 }),
    );

    await expect(
      getSpotifyClientCredentialsToken("bad-id", "bad-secret", mockFetch),
    ).rejects.toThrow("Failed to authenticate with Spotify API (401)");
  });
});

describe("fetchPlaylistFromWebApi", () => {
  test("fetches playlist tracks and handles pagination", async () => {
    const page1 = {
      name: "Classic Hits",
      tracks: {
        items: [
          {
            track: {
              album: { release_date: "1970-01-01" },
              artists: [{ name: "Artist 1" }],
              id: "t1",
              name: "Song 1",
            },
          },
        ],
        next: "https://api.spotify.com/v1/playlists/pl-123/tracks?offset=1",
      },
    };

    const page2 = {
      items: [
        {
          track: {
            album: { release_date: "1980-01-01" },
            artists: [{ name: "Artist 2" }],
            id: "t2",
            name: "Song 2",
          },
        },
      ],
      next: null,
    };

    let callCount = 0;
    const mockFetch: typeof fetch = vi.fn<typeof fetch>(async () => {
      callCount++;
      if (callCount === 1) {
        return new Response(JSON.stringify(page1), { status: 200 });
      }
      return new Response(JSON.stringify(page2), { status: 200 });
    });

    const result = await fetchPlaylistFromWebApi("pl-123", "test-token", {
      fetchFn: mockFetch,
    });

    expect(result.playlistId).toBe("pl-123");
    expect(result.playlistName).toBe("Classic Hits");
    expect(result.items).toHaveLength(2);
    expect(result.source).toBe("api");
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  test("throws clear message on 404", async () => {
    const mockFetch: typeof fetch = vi.fn<typeof fetch>(
      async () => new Response("Not Found", { status: 404 }),
    );

    await expect(
      fetchPlaylistFromWebApi("nonexistent-id", "test-token", {
        fetchFn: mockFetch,
      }),
    ).rejects.toThrow('Spotify playlist "nonexistent-id" was not found or is private');
  });

  test("throws clear message on 429 rate limit", async () => {
    const mockFetch: typeof fetch = vi.fn<typeof fetch>(
      async () => new Response("Too Many Requests", { status: 429 }),
    );

    await expect(
      fetchPlaylistFromWebApi("pl-123", "test-token", {
        fetchFn: mockFetch,
      }),
    ).rejects.toThrow("Spotify API rate limit exceeded");
  });
});

describe("fetchPlaylistFromEmbed", () => {
  test("extracts tracks from embed page NEXT_DATA HTML", async () => {
    const nextData = {
      props: {
        pageProps: {
          state: {
            data: {
              entity: {
                name: "Embed Hits",
                trackList: [
                  {
                    duration: 200000,
                    entityType: "track",
                    isPlayable: true,
                    subtitle: "Embed Artist",
                    title: "Embed Title",
                    uri: "spotify:track:sp-embed-1",
                  },
                ],
              },
            },
          },
        },
      },
    };

    const html = `<html><body><script id="__NEXT_DATA__" type="application/json">${JSON.stringify(nextData)}</script></body></html>`;

    const mockFetch: typeof fetch = vi.fn<typeof fetch>(
      async () => new Response(html, { status: 200 }),
    );

    const result = await fetchPlaylistFromEmbed("embed-id-123", {
      fetchFn: mockFetch,
    });

    expect(result.playlistId).toBe("embed-id-123");
    expect(result.playlistName).toBe("Embed Hits");
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.track?.name).toBe("Embed Title");
    expect(result.items[0]?.track?.id).toBe("sp-embed-1");
    expect(result.source).toBe("embed");
  });

  test("extracts playlist data from multiline formatted embed HTML", async () => {
    const nextData = {
      props: {
        pageProps: {
          state: {
            data: {
              entity: {
                name: "Multiline Embed",
                trackList: [
                  {
                    id: "sp-embed-multi",
                    title: "Multiline Title",
                    uri: "spotify:track:sp-embed-multi",
                  },
                ],
              },
            },
          },
        },
      },
    };

    const html = `<html>\n  <body>\n    <script id="__NEXT_DATA__" type="application/json">\n      ${JSON.stringify(nextData, null, 2)}\n    </script>\n  </body>\n</html>`;

    const mockFetch: typeof fetch = vi.fn<typeof fetch>(
      async () => new Response(html, { status: 200 }),
    );
    const result = await fetchPlaylistFromEmbed("multi-id", { fetchFn: mockFetch });
    expect(result.playlistName).toBe("Multiline Embed");
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.track?.name).toBe("Multiline Title");
  });
});

describe("fetchSpotifyPlaylist", () => {
  test("uses token when provided directly", async () => {
    const mockFetch: typeof fetch = vi.fn<typeof fetch>(
      async () =>
        new Response(
          JSON.stringify({
            name: "Token Playlist",
            tracks: { items: [] },
          }),
          { status: 200 },
        ),
    );

    const result = await fetchSpotifyPlaylist(
      "https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M",
      {
        credentials: { token: "direct-token" },
        fetchFn: mockFetch,
      },
    );

    expect(result.playlistId).toBe("37i9dQZF1DXcBWIGoYBM5M");
    expect(result.source).toBe("api");
  });
});
