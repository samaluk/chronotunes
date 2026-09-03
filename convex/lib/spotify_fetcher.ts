import {
  parseSpotifyPlaylistId,
  type RawSpotifyAlbum,
  type RawSpotifyArtist,
  type RawSpotifyPlaylistItem,
} from "./spotify";

export interface SpotifyAuthCredentials {
  clientId?: string;
  clientSecret?: string;
  token?: string;
}

export interface FetchSpotifyPlaylistOptions {
  credentials?: SpotifyAuthCredentials;
  fetchFn?: typeof fetch;
  maxTracks?: number;
}

export interface SpotifyPlaylistFetchResult {
  items: RawSpotifyPlaylistItem[];
  playlistId: string;
  playlistName?: string;
  source: "api" | "embed";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Obtains a Spotify Client Credentials access token.
 */
export async function getSpotifyClientCredentialsToken(
  clientId: string,
  clientSecret: string,
  fetchFn: typeof fetch = fetch,
): Promise<string> {
  const credentials = btoa(`${clientId.trim()}:${clientSecret.trim()}`);

  const response = await fetchFn("https://accounts.spotify.com/api/token", {
    body: "grant_type=client_credentials",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    method: "POST",
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Failed to authenticate with Spotify API (${response.status}): ${errorBody}`);
  }

  const rawData: unknown = await response.json();
  if (isRecord(rawData) && typeof rawData["access_token"] === "string") {
    return rawData["access_token"];
  }

  throw new Error("Spotify authentication response did not contain an access token");
}

function parseWebApiArtists(artistsRaw: unknown): RawSpotifyArtist[] | undefined {
  if (!Array.isArray(artistsRaw)) {
    return undefined;
  }
  const artists: RawSpotifyArtist[] = [];
  for (const a of artistsRaw) {
    if (isRecord(a) && typeof a["name"] === "string") {
      artists.push({ name: a["name"] });
    }
  }
  return artists;
}

function parseWebApiAlbum(albumRaw: unknown): RawSpotifyAlbum | undefined {
  if (!isRecord(albumRaw)) {
    return undefined;
  }
  return {
    name: typeof albumRaw["name"] === "string" ? albumRaw["name"] : undefined,
    release_date:
      typeof albumRaw["release_date"] === "string" ? albumRaw["release_date"] : undefined,
  };
}

function parseWebApiItem(item: unknown): RawSpotifyPlaylistItem | null {
  if (!isRecord(item)) {
    return null;
  }
  const is_local = typeof item["is_local"] === "boolean" ? item["is_local"] : undefined;
  const trackObj = isRecord(item["track"]) ? item["track"] : null;

  if (!trackObj) {
    return { is_local, track: null };
  }

  return {
    is_local,
    track: {
      album: parseWebApiAlbum(trackObj["album"]),
      artists: parseWebApiArtists(trackObj["artists"]),
      duration_ms:
        typeof trackObj["duration_ms"] === "number" ? trackObj["duration_ms"] : undefined,
      id: typeof trackObj["id"] === "string" ? trackObj["id"] : undefined,
      is_playable:
        typeof trackObj["is_playable"] === "boolean" ? trackObj["is_playable"] : undefined,
      name: typeof trackObj["name"] === "string" ? trackObj["name"] : undefined,
      type: typeof trackObj["type"] === "string" ? trackObj["type"] : "track",
    },
  };
}

function parseWebApiResponse(rawData: unknown): {
  items: RawSpotifyPlaylistItem[];
  nextUrl: string | null;
  playlistName?: string;
} {
  if (!isRecord(rawData)) {
    return { items: [], nextUrl: null };
  }

  const playlistName = typeof rawData["name"] === "string" ? rawData["name"] : undefined;

  let rawItemList: unknown[] = [];
  if (isRecord(rawData["tracks"]) && Array.isArray(rawData["tracks"]["items"])) {
    rawItemList = rawData["tracks"]["items"];
  } else if (Array.isArray(rawData["items"])) {
    rawItemList = rawData["items"];
  }

  const items: RawSpotifyPlaylistItem[] = [];
  for (const rawItem of rawItemList) {
    const parsed = parseWebApiItem(rawItem);
    if (parsed) {
      items.push(parsed);
    }
  }

  let nextUrl: string | null = null;
  if (isRecord(rawData["tracks"]) && typeof rawData["tracks"]["next"] === "string") {
    nextUrl = rawData["tracks"]["next"];
  } else if (typeof rawData["next"] === "string") {
    nextUrl = rawData["next"];
  }

  return { items, nextUrl, playlistName };
}

/**
 * Fetches tracks from a Spotify playlist using the official Spotify Web API.
 * Supports pagination up to maxTracks.
 */
export async function fetchPlaylistFromWebApi(
  playlistId: string,
  token: string,
  options: { fetchFn?: typeof fetch; maxTracks?: number } = {},
): Promise<SpotifyPlaylistFetchResult> {
  const fetchFn = options.fetchFn ?? fetch;
  const maxTracks = options.maxTracks ?? 500;
  const items: RawSpotifyPlaylistItem[] = [];
  let playlistName: string | undefined;

  let nextUrl: string | null =
    `https://api.spotify.com/v1/playlists/${playlistId}?fields=name,tracks(items(is_local,track(id,name,type,is_playable,duration_ms,artists(name),album(name,release_date))),next,total)`;

  while (nextUrl && items.length < maxTracks) {
    const response = await fetchFn(nextUrl, {
      headers: {
        Authorization: `Bearer ${token.trim()}`,
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`Spotify playlist "${playlistId}" was not found or is private`);
      }
      if (response.status === 429) {
        throw new Error("Spotify API rate limit exceeded. Please try again later.");
      }
      const errorText = await response.text();
      throw new Error(`Spotify API error (${response.status}): ${errorText}`);
    }

    const rawData: unknown = await response.json();
    const parsed = parseWebApiResponse(rawData);

    if (!playlistName && parsed.playlistName) {
      playlistName = parsed.playlistName;
    }

    items.push(...parsed.items);
    nextUrl = parsed.nextUrl;
  }

  return {
    items: items.slice(0, maxTracks),
    playlistId,
    playlistName,
    source: "api",
  };
}

function parseEmbedTrackItem(t: unknown): RawSpotifyPlaylistItem | null {
  if (!isRecord(t)) {
    return null;
  }
  const uri = typeof t["uri"] === "string" ? t["uri"] : undefined;
  const spotifyId = uri ? uri.split(":").pop() : undefined;
  const title = typeof t["title"] === "string" ? t["title"] : undefined;
  const subtitle = typeof t["subtitle"] === "string" ? t["subtitle"] : undefined;
  const duration = typeof t["duration"] === "number" ? t["duration"] : undefined;
  const isPlayable = typeof t["isPlayable"] === "boolean" ? t["isPlayable"] : true;
  const entityType = typeof t["entityType"] === "string" ? t["entityType"] : "track";

  return {
    is_local: false,
    track: {
      album: { release_date: undefined },
      artists: subtitle ? [{ name: subtitle }] : [],
      duration_ms: duration,
      id: spotifyId,
      is_playable: isPlayable,
      name: title,
      type: entityType,
    },
  };
}

function parseEmbedData(rawData: unknown): {
  items: RawSpotifyPlaylistItem[];
  playlistName?: string;
} {
  if (
    !isRecord(rawData) ||
    !isRecord(rawData["props"]) ||
    !isRecord(rawData["props"]["pageProps"])
  ) {
    return { items: [] };
  }

  const pageProps = rawData["props"]["pageProps"];
  const state = isRecord(pageProps["state"]) ? pageProps["state"] : undefined;
  const data = state && isRecord(state["data"]) ? state["data"] : undefined;
  const entity = data && isRecord(data["entity"]) ? data["entity"] : undefined;

  if (!entity) {
    return { items: [] };
  }

  const playlistName = typeof entity["name"] === "string" ? entity["name"] : undefined;
  const trackList = Array.isArray(entity["trackList"]) ? entity["trackList"] : [];
  const items: RawSpotifyPlaylistItem[] = [];

  for (const t of trackList) {
    const item = parseEmbedTrackItem(t);
    if (item) {
      items.push(item);
    }
  }

  return { items, playlistName };
}

/**
 * Fetches public Spotify playlist data from the open embed page without requiring credentials.
 */
export async function fetchPlaylistFromEmbed(
  playlistId: string,
  options: { fetchFn?: typeof fetch } = {},
): Promise<SpotifyPlaylistFetchResult> {
  const fetchFn = options.fetchFn ?? fetch;
  const url = `https://open.spotify.com/embed/playlist/${playlistId}`;

  const response = await fetchFn(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; ChronoTunes/1.0)",
    },
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch Spotify public playlist embed (${response.status}): ${response.statusText}`,
    );
  }

  const html = await response.text();
  const match = html.match(/id="__NEXT_DATA__"[^>]*>([^<]+)<\/script>/);
  if (!match || !match[1]) {
    throw new Error(
      "Could not extract playlist data from Spotify embed. The playlist may be private or Spotify's page structure may have changed.",
    );
  }

  const rawData: unknown = JSON.parse(match[1]);
  const { items, playlistName } = parseEmbedData(rawData);

  return {
    items,
    playlistId,
    playlistName,
    source: "embed",
  };
}

/**
 * Fetches a Spotify playlist by URL or identifier, using provided credentials or falling back to public embed.
 */
export async function fetchSpotifyPlaylist(
  input: string,
  options: FetchSpotifyPlaylistOptions = {},
): Promise<SpotifyPlaylistFetchResult> {
  const playlistId = parseSpotifyPlaylistId(input);
  const fetchFn = options.fetchFn ?? fetch;
  const credentials = options.credentials;

  // 1. Direct Bearer token provided
  if (credentials?.token?.trim()) {
    return await fetchPlaylistFromWebApi(playlistId, credentials.token.trim(), {
      fetchFn,
      maxTracks: options.maxTracks,
    });
  }

  // 2. Client ID & Secret provided
  if (credentials?.clientId?.trim() && credentials.clientSecret?.trim()) {
    const token = await getSpotifyClientCredentialsToken(
      credentials.clientId,
      credentials.clientSecret,
      fetchFn,
    );
    return await fetchPlaylistFromWebApi(playlistId, token, {
      fetchFn,
      maxTracks: options.maxTracks,
    });
  }

  // 3. Fallback to unauthenticated public embed
  return await fetchPlaylistFromEmbed(playlistId, { fetchFn });
}
