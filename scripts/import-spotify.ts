#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import process from "node:process";

export interface CliOptions {
  apiKey?: string;
  clientId?: string;
  clientSecret?: string;
  deployment?: string;
  dryRun: boolean;
  help: boolean;
  playlistInput?: string;
  replace: boolean;
  token?: string;
}

export interface CatalogDerivationIssue {
  artist?: string;
  details: string;
  index: number;
  reason: string;
  spotifyTrackId?: string;
  title?: string;
}

export interface PlaybackResolutionIssue {
  details: string;
  reason: string;
  track: {
    artist: string;
    title: string;
    year: number;
  };
}

export interface SpotifyImportReport {
  dryRun: boolean;
  duplicateCount: number;
  duplicates: CatalogDerivationIssue[];
  fetchSource: "api" | "embed";
  importedCount: number;
  malformed: CatalogDerivationIssue[];
  malformedCount: number;
  playlistId: string;
  playlistName?: string;
  replaceResult: {
    deletedCount: number;
    importedCount: number;
    trackIds: string[];
  } | null;
  resolvedCount: number;
  totalExamined: number;
  unavailable: CatalogDerivationIssue[];
  unavailableCount: number;
  unresolvedCount: number;
  unresolvedTracks: PlaybackResolutionIssue[];
  validCount: number;
}

export function parseArgs(args: string[]): CliOptions {
  const options: CliOptions = {
    dryRun: false,
    help: false,
    replace: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (!arg) {
      continue;
    }

    if (arg === "-h" || arg === "--help") {
      options.help = true;
    } else if (arg === "--replace") {
      options.replace = true;
    } else if (arg === "--dry-run") {
      options.dryRun = true;
    } else if (arg === "--api-key" || arg === "--youtube-api-key") {
      options.apiKey = args[++i];
    } else if (arg.startsWith("--api-key=")) {
      options.apiKey = arg.split("=")[1];
    } else if (arg.startsWith("--youtube-api-key=")) {
      options.apiKey = arg.split("=")[1];
    } else if (arg === "--token" || arg === "--spotify-token") {
      options.token = args[++i];
    } else if (arg.startsWith("--token=")) {
      options.token = arg.split("=")[1];
    } else if (arg.startsWith("--spotify-token=")) {
      options.token = arg.split("=")[1];
    } else if (arg === "--client-id") {
      options.clientId = args[++i];
    } else if (arg.startsWith("--client-id=")) {
      options.clientId = arg.split("=")[1];
    } else if (arg === "--client-secret") {
      options.clientSecret = args[++i];
    } else if (arg.startsWith("--client-secret=")) {
      options.clientSecret = arg.split("=")[1];
    } else if (arg === "--deployment") {
      options.deployment = args[++i];
    } else if (arg.startsWith("--deployment=")) {
      options.deployment = arg.split("=")[1];
    } else if (!arg.startsWith("-") && !options.playlistInput) {
      options.playlistInput = arg;
    }
  }

  return options;
}

export function formatUsage(): string {
  return `
ChronoTunes Spotify Playlist Importer
Derives a validated catalog from a public Spotify playlist and resolves YouTube playback.

Usage:
  pnpm import:spotify <playlist-url-or-id> [options]
  node --experimental-strip-types scripts/import-spotify.ts <playlist-url-or-id> [options]

Arguments:
  <playlist-url-or-id>    Public Spotify playlist URL, Spotify URI, or bare ID.

Options:
  --replace               Atomically replace existing tracks in the catalog
  --dry-run               Validation and resolution report only (no database write)
  --api-key <key>         YouTube Data API v3 key (or YOUTUBE_API_KEY env)
  --token <token>         Spotify access token (or SPOTIFY_TOKEN env)
  --client-id <id>        Spotify Client ID (or SPOTIFY_CLIENT_ID env)
  --client-secret <sec>   Spotify Client Secret (or SPOTIFY_CLIENT_SECRET env)
  --deployment <target>   Convex deployment (default: "local" or CONVEX_DEPLOYMENT)
  -h, --help              Show this help message

Examples:
  pnpm import:spotify 37i9dQZF1DXcBWIGoYBM5M --dry-run
  pnpm import:spotify https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M --replace
`.trim();
}

export function extractJsonFromOutput(output: string): unknown {
  const start = output.indexOf("{");
  if (start === -1) {
    return null;
  }
  const end = output.lastIndexOf("}");
  if (end === -1 || end < start) {
    return null;
  }
  try {
    return JSON.parse(output.slice(start, end + 1));
  } catch {
    return null;
  }
}

export function formatReport(report: SpotifyImportReport): string {
  const lines: string[] = [];
  const divider = "=".repeat(64);
  const subDivider = "-".repeat(64);

  lines.push(divider);
  lines.push("  ChronoTunes Spotify Playlist Import Report");
  lines.push(divider);

  lines.push(`Playlist:    ${report.playlistName ?? "Unknown"} (${report.playlistId})`);
  lines.push(
    `Source:      ${report.fetchSource === "api" ? "Spotify Web API" : "Spotify Public Embed"}`,
  );
  lines.push(
    `Mode:        ${
      report.dryRun
        ? "DRY RUN (no catalog modification)"
        : report.replaceResult
          ? "REPLACE CATALOG"
          : "VALIDATION ONLY"
    }`,
  );
  lines.push(subDivider);

  lines.push("METADATA DERIVATION");
  lines.push(`  Total items examined:      ${report.totalExamined}`);
  lines.push(`  Valid tracks derived:      ${report.validCount}`);
  lines.push(`  Duplicates skipped:        ${report.duplicateCount}`);
  lines.push(`  Malformed tracks:          ${report.malformedCount}`);
  lines.push(`  Unavailable / local:       ${report.unavailableCount}`);

  if (report.duplicateCount > 0) {
    lines.push("\n  Sample Duplicates:");
    for (const dup of report.duplicates.slice(0, 3)) {
      lines.push(
        `    - #${dup.index + 1}: "${dup.title ?? "Unknown"}" by ${dup.artist ?? "Unknown"} (${dup.details})`,
      );
    }
    if (report.duplicateCount > 3) {
      lines.push(`    ... and ${report.duplicateCount - 3} more`);
    }
  }

  if (report.malformedCount > 0) {
    lines.push("\n  Sample Malformed Tracks:");
    for (const mal of report.malformed.slice(0, 3)) {
      lines.push(`    - #${mal.index + 1}: "${mal.title ?? "Unknown"}" (${mal.details})`);
    }
    if (report.malformedCount > 3) {
      lines.push(`    ... and ${report.malformedCount - 3} more`);
    }
  }

  if (report.unavailableCount > 0) {
    lines.push("\n  Sample Unavailable Tracks:");
    for (const un of report.unavailable.slice(0, 3)) {
      lines.push(`    - #${un.index + 1}: "${un.title ?? "Unknown"}" (${un.details})`);
    }
    if (report.unavailableCount > 3) {
      lines.push(`    ... and ${report.unavailableCount - 3} more`);
    }
  }

  lines.push(subDivider);
  lines.push("PLAYBACK RESOLUTION (YOUTUBE)");
  lines.push(`  Playable tracks resolved:  ${report.resolvedCount}`);
  lines.push(`  Unresolved tracks:         ${report.unresolvedCount}`);

  if (report.unresolvedCount > 0) {
    lines.push("\n  Sample Unresolved Tracks:");
    for (const unres of report.unresolvedTracks.slice(0, 3)) {
      lines.push(`    - "${unres.track.title}" by ${unres.track.artist} (${unres.details})`);
    }
    if (report.unresolvedCount > 3) {
      lines.push(`    ... and ${report.unresolvedCount - 3} more`);
    }
  }

  lines.push(subDivider);
  lines.push("CATALOG STATUS");
  if (report.dryRun) {
    lines.push("  DRY RUN: Validation complete. Database was not modified.");
  } else if (report.replaceResult) {
    lines.push(`  SUCCESS: Catalog replaced.`);
    lines.push(`  Deleted existing tracks:   ${report.replaceResult.deletedCount}`);
    lines.push(`  Imported new tracks:       ${report.replaceResult.importedCount}`);
  } else {
    lines.push("  VALIDATION ONLY: No database changes requested. Use --replace to import.");
  }
  lines.push(divider);

  return lines.join("\n");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isSpotifyImportReport(value: unknown): value is SpotifyImportReport {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value["dryRun"] === "boolean" &&
    typeof value["playlistId"] === "string" &&
    typeof value["totalExamined"] === "number" &&
    typeof value["validCount"] === "number" &&
    Array.isArray(value["duplicates"]) &&
    Array.isArray(value["malformed"]) &&
    Array.isArray(value["unavailable"]) &&
    Array.isArray(value["unresolvedTracks"])
  );
}

export function runCli(): void {
  const options = parseArgs(process.argv.slice(2));

  if (options.help || !options.playlistInput) {
    console.log(formatUsage());
    if (!options.help && !options.playlistInput) {
      process.exit(1);
    }
    return;
  }

  const spotifyClientId = options.clientId ?? process.env.SPOTIFY_CLIENT_ID;
  const spotifyClientSecret = options.clientSecret ?? process.env.SPOTIFY_CLIENT_SECRET;
  const spotifyToken = options.token ?? process.env.SPOTIFY_TOKEN;
  const youtubeApiKey = options.apiKey ?? process.env.YOUTUBE_API_KEY;
  const deployment = options.deployment ?? process.env.CONVEX_DEPLOYMENT ?? "local";

  const actionArgs = {
    dryRun: options.dryRun,
    playlistInput: options.playlistInput,
    replaceExisting: options.replace,
    spotifyClientId: spotifyClientId?.trim() || undefined,
    spotifyClientSecret: spotifyClientSecret?.trim() || undefined,
    spotifyToken: spotifyToken?.trim() || undefined,
    youtubeApiKey: youtubeApiKey?.trim() || undefined,
  };

  console.log(
    `Connecting to Convex (${deployment}) to import playlist "${options.playlistInput}"...`,
  );

  const convexArgs = [
    "exec",
    "convex",
    "run",
    "catalog_admin:importSpotifyPlaylist",
    JSON.stringify(actionArgs),
    "--deployment",
    deployment,
  ];

  const result = spawnSync("pnpm", convexArgs, {
    encoding: "utf-8",
    maxBuffer: 10 * 1024 * 1024,
  });

  if (result.error) {
    console.error("Error executing Convex runner:", result.error.message);
    process.exit(1);
  }

  if (result.status !== 0) {
    console.error(`Convex command failed with exit code ${result.status}:`);
    if (result.stderr) {
      console.error(result.stderr);
    }
    if (result.stdout) {
      console.error(result.stdout);
    }
    if (
      result.stderr?.includes("Could not find a local backend") ||
      result.stdout?.includes("Could not find a local backend")
    ) {
      console.error(
        "\nHint: Make sure the local Convex backend is running with `just convex` or `pnpm convex:dev`.",
      );
    }
    process.exit(result.status ?? 1);
  }

  const parsed = extractJsonFromOutput(result.stdout);
  if (!isSpotifyImportReport(parsed)) {
    console.log(result.stdout);
    return;
  }

  console.log(formatReport(parsed));
}

// Only run CLI automatically when invoked directly as a script
if (
  process.argv[1]?.endsWith("import-spotify.ts") ||
  process.argv[1]?.endsWith("import-spotify.js")
) {
  runCli();
}
