import { describe, expect, it } from "vitest";

import {
  extractJsonFromOutput,
  formatReport,
  formatUsage,
  parseArgs,
  type SpotifyImportReport,
} from "./import-spotify";

describe("import-spotify CLI argument parser", () => {
  it("parses positional playlist input", () => {
    const options = parseArgs(["37i9dQZF1DXcBWIGoYBM5M"]);
    expect(options.playlistInput).toBe("37i9dQZF1DXcBWIGoYBM5M");
    expect(options.replace).toBe(false);
    expect(options.dryRun).toBe(false);
  });

  it("parses boolean flags --replace and --dry-run", () => {
    const options = parseArgs(["https://open.spotify.com/playlist/test", "--replace", "--dry-run"]);
    expect(options.playlistInput).toBe("https://open.spotify.com/playlist/test");
    expect(options.replace).toBe(true);
    expect(options.dryRun).toBe(true);
  });

  it("parses string options with space and equals delimiters and tracks token CLI flag", () => {
    const options = parseArgs([
      "test-id",
      "--api-key",
      "yt-key-1",
      "--token=sp-token-1",
      "--client-id",
      "cid",
      "--client-secret=csec",
      "--deployment",
      "prod",
    ]);

    expect(options.playlistInput).toBe("test-id");
    expect(options.apiKey).toBe("yt-key-1");
    expect(options.token).toBe("sp-token-1");
    expect(options.tokenPassedViaCli).toBe(true);
    expect(options.clientId).toBe("cid");
    expect(options.clientSecret).toBe("csec");
    expect(options.deployment).toBe("prod");
  });

  it("detects conflicting api key flags", () => {
    const options = parseArgs(["test-id", "--api-key=key1", "--youtube-api-key=key2"]);
    expect(options.conflictingApiKeyFlags).toBe(true);
    expect(options.apiKey).toBe("key2");
  });

  it("parses -h and --help", () => {
    expect(parseArgs(["-h"]).help).toBe(true);
    expect(parseArgs(["--help"]).help).toBe(true);
  });
});

describe("import-spotify CLI utilities", () => {
  it("formats usage text with examples", () => {
    const usage = formatUsage();
    expect(usage).toContain("ChronoTunes Spotify Playlist Importer");
    expect(usage).toContain("--replace");
    expect(usage).toContain("--dry-run");
  });

  it("extracts JSON correctly from stdout output", () => {
    const stdout = `Connecting to Convex...
[LOG] Fetching playlist...
{"dryRun":true,"playlistId":"abc","totalExamined":10,"validCount":10,"duplicates":[],"malformed":[],"unavailable":[],"unresolvedTracks":[]}
Process completed.`;

    const extracted = extractJsonFromOutput(stdout);
    expect(extracted).toEqual({
      dryRun: true,
      duplicates: [],
      malformed: [],
      playlistId: "abc",
      totalExamined: 10,
      unavailable: [],
      unresolvedTracks: [],
      validCount: 10,
    });
  });

  it("returns null when stdout contains invalid or no JSON", () => {
    expect(extractJsonFromOutput("No JSON here")).toBeNull();
    expect(extractJsonFromOutput("{not valid json")).toBeNull();
  });

  it("formats summary report clearly for dry run", () => {
    const report: SpotifyImportReport = {
      dryRun: true,
      duplicateCount: 1,
      duplicates: [
        {
          artist: "Artist 1",
          details: "Duplicate Spotify track ID: 123",
          index: 2,
          reason: "duplicate_id",
          title: "Song 1",
        },
      ],
      fetchSource: "api",
      importedCount: 0,
      malformed: [
        {
          details: "Release date could not be parsed",
          index: 3,
          reason: "missing_release_year",
          title: "Malformed Song",
        },
      ],
      malformedCount: 1,
      playlistId: "test-playlist-id",
      playlistName: "Top Hits",
      replaceResult: null,
      resolvedCount: 5,
      totalExamined: 7,
      unavailable: [],
      unavailableCount: 0,
      unresolvedCount: 1,
      unresolvedTracks: [
        {
          details: "No video found",
          reason: "no_video_found",
          track: {
            artist: "Artist 2",
            spotifyTrackId: "sp-2",
            spotifyUrl: "https://open.spotify.com/track/sp-2",
            title: "Unresolved Song",
            year: 2000,
          },
        },
      ],
      validCount: 5,
    };

    const formatted = formatReport(report);
    expect(formatted).toContain("Top Hits (test-playlist-id)");
    expect(formatted).toContain("Spotify Web API");
    expect(formatted).toContain("DRY RUN (no catalog modification)");
    expect(formatted).toContain("Valid tracks derived:      5");
    expect(formatted).toContain("Duplicates skipped:        1");
    expect(formatted).toContain("Malformed tracks:          1");
    expect(formatted).toContain("Playable tracks resolved:  5");
    expect(formatted).toContain("Unresolved tracks:         1");
    expect(formatted).toContain("DRY RUN: Validation complete. Database was not modified.");
  });

  it("warns when valid track count approaches batch limit", () => {
    const report: SpotifyImportReport = {
      dryRun: true,
      duplicateCount: 0,
      duplicates: [],
      fetchSource: "api",
      importedCount: 0,
      malformed: [],
      malformedCount: 0,
      playlistId: "large-playlist",
      replaceResult: null,
      resolvedCount: 1850,
      totalExamined: 1900,
      unavailable: [],
      unavailableCount: 0,
      unresolvedCount: 50,
      unresolvedTracks: [],
      validCount: 1850,
    };

    const formatted = formatReport(report);
    expect(formatted).toContain(
      "WARNING: Valid tracks (1850) approach the 2000-track single-batch limit.",
    );
  });
});
