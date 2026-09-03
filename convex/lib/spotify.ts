import { MAX_YEAR, MIN_YEAR } from "./track_validation";

export interface RawSpotifyArtist {
  id?: string | null;
  name?: string | null;
}

export interface RawSpotifyAlbum {
  name?: string | null;
  release_date?: string | null;
  release_date_precision?: string | null;
}

export interface RawSpotifyTrack {
  album?: RawSpotifyAlbum | null;
  artists?: RawSpotifyArtist[] | null;
  duration_ms?: number | null;
  id?: string | null;
  is_local?: boolean;
  is_playable?: boolean;
  name?: string | null;
  type?: string | null;
}

export interface RawSpotifyPlaylistItem {
  is_local?: boolean;
  track?: RawSpotifyTrack | null;
}

export interface DerivedSpotifyTrack {
  artist: string;
  durationMs?: number;
  spotifyTrackId: string;
  spotifyUrl: string;
  title: string;
  year: number;
}

export type DerivationIssueReason =
  | "missing_track_data"
  | "local_track"
  | "unavailable_track"
  | "missing_title"
  | "missing_artist"
  | "missing_release_year"
  | "invalid_year_range"
  | "duplicate_id"
  | "duplicate_title_artist";

export interface CatalogDerivationIssue {
  artist?: string;
  details: string;
  index: number;
  reason: DerivationIssueReason;
  spotifyTrackId?: string;
  title?: string;
}

export interface CatalogDerivationResult {
  allIssues: CatalogDerivationIssue[];
  duplicates: CatalogDerivationIssue[];
  malformed: CatalogDerivationIssue[];
  totalExamined: number;
  unavailable: CatalogDerivationIssue[];
  validTracks: DerivedSpotifyTrack[];
}

const SPOTIFY_ID_REGEX = /^[0-9A-Za-z]{15,30}$/;

function parseSpotifyUri(input: string): string | null {
  if (!input.startsWith("spotify:playlist:")) {
    return null;
  }
  const id = input.slice("spotify:playlist:".length).trim();
  if (SPOTIFY_ID_REGEX.test(id)) {
    return id;
  }
  throw new Error(`Invalid Spotify playlist URI: "${input}"`);
}

function parseSpotifyUrl(input: string): string | null {
  if (!input.startsWith("http://") && !input.startsWith("https://")) {
    return null;
  }
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new Error(`Invalid Spotify playlist URL: "${input}"`);
  }

  if (!url.hostname.includes("spotify.com")) {
    throw new Error(`URL host is not Spotify: "${url.hostname}"`);
  }

  const segments = url.pathname.split("/").filter(Boolean);
  const playlistIndex = segments.indexOf("playlist");
  if (playlistIndex !== -1 && playlistIndex + 1 < segments.length) {
    const id = segments[playlistIndex + 1];
    if (id && SPOTIFY_ID_REGEX.test(id)) {
      return id;
    }
  }
  throw new Error(`No valid playlist ID found in URL: "${input}"`);
}

/**
 * Extracts a Spotify playlist ID from a public web URL, Spotify URI, or bare ID.
 * Throws an Error if the input does not match any valid Spotify playlist format.
 */
export function parseSpotifyPlaylistId(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new Error("Spotify playlist identifier or URL is required");
  }

  const fromUri = parseSpotifyUri(trimmed);
  if (fromUri) {
    return fromUri;
  }

  const fromUrl = parseSpotifyUrl(trimmed);
  if (fromUrl) {
    return fromUrl;
  }

  if (SPOTIFY_ID_REGEX.test(trimmed)) {
    return trimmed;
  }

  throw new Error(`Invalid Spotify playlist URL or identifier: "${input}"`);
}

/**
 * Parses release year from an ISO date string (YYYY, YYYY-MM, or YYYY-MM-DD).
 * Returns null if the date is missing, unparseable, or out of the allowed ChronoTunes range (1900-2030).
 */
export function parseReleaseYear(releaseDate?: string | null): number | null {
  if (!releaseDate) {
    return null;
  }

  const trimmed = releaseDate.trim();
  if (!trimmed || trimmed === "0000" || trimmed === "0000-00-00") {
    return null;
  }

  const yearPart = trimmed.split("-")[0];
  if (!yearPart || yearPart.length !== 4) {
    return null;
  }

  const year = Number.parseInt(yearPart, 10);
  if (Number.isNaN(year)) {
    return null;
  }

  if (year < MIN_YEAR || year > MAX_YEAR) {
    return null;
  }

  return year;
}

/**
 * Normalizes title and artist strings for duplicate matching.
 */
export function canonicalTrackKey(title: string, artist: string): string {
  return `${title.trim().toLowerCase()}::${artist.trim().toLowerCase()}`;
}

function checkItemTrackType(
  item: RawSpotifyPlaylistItem | null | undefined,
  index: number,
): CatalogDerivationIssue | null {
  if (!item || !item.track) {
    return {
      details: "Item does not contain track data (null or empty entry)",
      index,
      reason: "missing_track_data",
    };
  }
  const trackType = item.track.type;
  if (trackType && trackType !== "track") {
    return {
      details: `Non-track item of type "${trackType}"`,
      index,
      reason: "missing_track_data",
      title: item.track.name ?? undefined,
    };
  }
  return null;
}

function checkItemAvailability(
  item: RawSpotifyPlaylistItem,
  track: RawSpotifyTrack,
  index: number,
): CatalogDerivationIssue | null {
  const isLocal = item.is_local || track.is_local;
  const isUnplayable = track.is_playable === false;

  if (!isLocal && !isUnplayable) {
    return null;
  }

  const artist = track.artists?.flatMap((a) => (a.name ? [a.name] : [])).join(", ");
  return {
    artist: artist || undefined,
    details: isLocal
      ? "Local audio file not available on public Spotify catalog"
      : "Track marked as unplayable or regionally restricted",
    index,
    reason: isLocal ? "local_track" : "unavailable_track",
    spotifyTrackId: track.id ?? undefined,
    title: track.name ?? undefined,
  };
}

interface ParsedTrackData {
  artist: string;
  spotifyTrackId: string;
  title: string;
  year: number;
}

function extractTrackArtist(
  track: RawSpotifyTrack,
  title: string,
  index: number,
): { artist?: string; issue?: CatalogDerivationIssue } {
  const artistNames = (track.artists ?? []).flatMap((a) => {
    const trimmed = a.name?.trim();
    return trimmed ? [trimmed] : [];
  });

  if (artistNames.length === 0) {
    return {
      issue: {
        details: "Track artist information is missing or empty",
        index,
        reason: "missing_artist",
        spotifyTrackId: track.id ?? undefined,
        title,
      },
    };
  }

  return { artist: artistNames.join(", ") };
}

function extractTrackYear(
  releaseDate: string | null | undefined,
  title: string,
  artist: string,
  index: number,
): { issue?: CatalogDerivationIssue; year?: number } {
  const year = parseReleaseYear(releaseDate);
  if (year !== null) {
    return { year };
  }

  const rawYear = releaseDate ? Number.parseInt(releaseDate.split("-")[0] ?? "", 10) : Number.NaN;
  const isOutOfRange = !Number.isNaN(rawYear) && (rawYear < MIN_YEAR || rawYear > MAX_YEAR);
  return {
    issue: {
      artist,
      details: isOutOfRange
        ? `Release year ${rawYear} is outside supported range [${MIN_YEAR}, ${MAX_YEAR}]`
        : `Release date "${releaseDate ?? "missing"}" could not be parsed into a valid year`,
      index,
      reason: isOutOfRange ? "invalid_year_range" : "missing_release_year",
      title,
    },
  };
}

function checkTrackMetadata(
  track: RawSpotifyTrack,
  index: number,
): { issue?: CatalogDerivationIssue; trackData?: ParsedTrackData } {
  const title = track.name?.trim();
  if (!title) {
    return {
      issue: {
        details: "Track title is missing or empty",
        index,
        reason: "missing_title",
        spotifyTrackId: track.id ?? undefined,
      },
    };
  }

  const artistResult = extractTrackArtist(track, title, index);
  if (artistResult.issue || !artistResult.artist) {
    return { issue: artistResult.issue };
  }
  const artist = artistResult.artist;

  const yearResult = extractTrackYear(track.album?.release_date, title, artist, index);
  if (yearResult.issue || yearResult.year === undefined) {
    return {
      issue: yearResult.issue
        ? { ...yearResult.issue, spotifyTrackId: track.id ?? undefined }
        : undefined,
    };
  }

  const spotifyTrackId = track.id?.trim();
  if (!spotifyTrackId) {
    return {
      issue: {
        artist,
        details: "Track is missing Spotify ID",
        index,
        reason: "missing_track_data",
        title,
      },
    };
  }

  return { trackData: { artist, spotifyTrackId, title, year: yearResult.year } };
}

function checkTrackDuplicate(
  trackData: ParsedTrackData,
  seenSpotifyIds: Set<string>,
  seenTrackKeys: Set<string>,
  index: number,
): CatalogDerivationIssue | null {
  const { artist, spotifyTrackId, title } = trackData;
  if (seenSpotifyIds.has(spotifyTrackId)) {
    return {
      artist,
      details: `Duplicate Spotify track ID: ${spotifyTrackId}`,
      index,
      reason: "duplicate_id",
      spotifyTrackId,
      title,
    };
  }

  const trackKey = canonicalTrackKey(title, artist);
  if (seenTrackKeys.has(trackKey)) {
    return {
      artist,
      details: `Duplicate title and artist: "${title}" by ${artist}`,
      index,
      reason: "duplicate_title_artist",
      spotifyTrackId,
      title,
    };
  }

  return null;
}

interface ItemProcessOutcome {
  duplicate?: CatalogDerivationIssue;
  malformed?: CatalogDerivationIssue;
  unavailable?: CatalogDerivationIssue;
  validTrack?: DerivedSpotifyTrack;
}

function processPlaylistItem(
  item: RawSpotifyPlaylistItem | null | undefined,
  index: number,
  seenSpotifyIds: Set<string>,
  seenTrackKeys: Set<string>,
): ItemProcessOutcome {
  const typeIssue = checkItemTrackType(item, index);
  if (typeIssue) {
    return { unavailable: typeIssue };
  }

  if (!item || !item.track) {
    return {};
  }

  const track = item.track;
  const availIssue = checkItemAvailability(item, track, index);
  if (availIssue) {
    return { unavailable: availIssue };
  }

  const { issue: metaIssue, trackData } = checkTrackMetadata(track, index);
  if (metaIssue || !trackData) {
    return { malformed: metaIssue };
  }

  const dupIssue = checkTrackDuplicate(trackData, seenSpotifyIds, seenTrackKeys, index);
  if (dupIssue) {
    return { duplicate: dupIssue };
  }

  seenSpotifyIds.add(trackData.spotifyTrackId);
  seenTrackKeys.add(canonicalTrackKey(trackData.title, trackData.artist));

  const durationMs =
    typeof track.duration_ms === "number" && track.duration_ms > 0 ? track.duration_ms : undefined;

  return {
    validTrack: {
      artist: trackData.artist,
      durationMs,
      spotifyTrackId: trackData.spotifyTrackId,
      spotifyUrl: `https://open.spotify.com/track/${trackData.spotifyTrackId}`,
      title: trackData.title,
      year: trackData.year,
    },
  };
}

/**
 * Derives factual ChronoTunes track metadata from raw Spotify playlist items.
 * Categorizes duplicates, unavailable items, and malformed items into clear diagnostic reports
 * to prevent catalog corruption.
 */
export function deriveCatalogTracks(
  items: Array<RawSpotifyPlaylistItem | null | undefined>,
): CatalogDerivationResult {
  const validTracks: DerivedSpotifyTrack[] = [];
  const duplicates: CatalogDerivationIssue[] = [];
  const malformed: CatalogDerivationIssue[] = [];
  const unavailable: CatalogDerivationIssue[] = [];
  const allIssues: CatalogDerivationIssue[] = [];

  const seenSpotifyIds = new Set<string>();
  const seenTrackKeys = new Set<string>();

  for (let index = 0; index < items.length; index++) {
    const outcome = processPlaylistItem(items[index], index, seenSpotifyIds, seenTrackKeys);

    if (outcome.unavailable) {
      allIssues.push(outcome.unavailable);
      unavailable.push(outcome.unavailable);
    } else if (outcome.malformed) {
      allIssues.push(outcome.malformed);
      malformed.push(outcome.malformed);
    } else if (outcome.duplicate) {
      allIssues.push(outcome.duplicate);
      duplicates.push(outcome.duplicate);
    } else if (outcome.validTrack) {
      validTracks.push(outcome.validTrack);
    }
  }

  return {
    allIssues,
    duplicates,
    malformed,
    totalExamined: items.length,
    unavailable,
    validTracks,
  };
}
