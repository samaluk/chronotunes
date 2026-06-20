#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

interface TrackData {
  artist: string;
  durationMs?: number;
  mbid?: string;
  spotifyTrackId?: string;
  title: string;
  year: number;
}

function parseDurationToMs(duration: string): number | undefined {
  const parts = duration.split(":").map(Number);
  if (parts.length === 2 && !parts.includes(Number.NaN)) {
    return parts[0] * 60 + parts[1];
  }
  if (parts.length === 3 && !parts.includes(Number.NaN)) {
    return parts[0] * 60 * 60 + parts[1] * 60 + parts[2];
  }
  return;
}

function parseYear(dateStr: string): number {
  if (!dateStr || dateStr === "0000-00-00") {
    return 2000;
  }
  const year = Number.parseInt(dateStr.split("-")[0], 10);
  return Number.isNaN(year) ? 2000 : year;
}

function parseTracks(lines: string[]): TrackData[] {
  const tracks: TrackData[] = [];

  for (const line of lines.slice(1)) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }

    const parts = trimmed.split("|");
    if (parts.length < 12) {
      continue;
    }

    const title = parts[1]?.replaceAll(/^"|"$/g, "").trim() || "";
    const artist = parts[2]?.replaceAll(/^"|"$/g, "").trim() || "";
    const year = parseYear(parts[11]?.replaceAll(/^"|"$/g, "") || "");
    const durationMs = parseDurationToMs(
      parts[7]?.replaceAll(/^"|"$/g, "") || ""
    );
    const spotifyTrackId =
      parts[19]?.replaceAll(/^"|"$/g, "").trim() || undefined;
    const mbid = parts[20]?.replaceAll(/^"|"$/g, "").trim() || undefined;

    if (!(title && artist)) {
      continue;
    }

    const track: TrackData = { artist, title, year };
    if (spotifyTrackId) {
      track.spotifyTrackId = spotifyTrackId;
    }
    if (durationMs !== undefined) {
      track.durationMs = durationMs;
    }
    if (mbid) {
      track.mbid = mbid;
    }
    tracks.push(track);
  }

  return tracks;
}

function buildCsvContent(chunk: TrackData[], startIndex: number): string {
  return chunk
    .map(
      (track, index) =>
        `${startIndex + index}|"${track.title}","${track.artist}",0,0,0,0,00:00,0,0,0,0,${track.year},0,0,0,0,0,0,0,${track.spotifyTrackId || ""},${track.mbid || ""}`
    )
    .join("\n");
}

async function importChunk(
  chunk: TrackData[],
  startIndex: number,
  totalTracks: number,
  clearExisting: boolean
): Promise<{ imported: number; failed: number; progress: number }> {
  const progress = Math.round(
    ((startIndex + chunk.length) / totalTracks) * 100
  );

  try {
    const response = await fetch(
      "http://127.0.0.1:3210/api/tracks/parseAndImportCsv",
      {
        body: JSON.stringify({
          clearExisting,
          csvContent: buildCsvContent(chunk, startIndex),
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      }
    );

    if (!response.ok) {
      console.error(
        `Failed to import chunk ${startIndex / chunk.length + 1}:`,
        response.statusText
      );
      return { failed: chunk.length, imported: 0, progress };
    }

    const result = await response.json();
    const imported = result.importedCount || 0;
    const failed = result.hasErrors ? chunk.length - imported : 0;

    return { failed, imported, progress };
  } catch (error) {
    console.error(
      `\nError importing chunk ${startIndex / chunk.length + 1}:`,
      error
    );
    return { failed: chunk.length, imported: 0, progress };
  }
}

async function importTracks(): Promise<void> {
  const csvPath = path.join(
    process.cwd(),
    "convex",
    "HITSTER - Español Temazos.csv"
  );

  if (!existsSync(csvPath)) {
    console.error("CSV file not found:", csvPath);
    process.exit(1);
  }

  const csvContent = readFileSync(csvPath, "utf-8");
  const lines = csvContent.trim().split("\n");
  const tracks = parseTracks(lines);

  console.log(`Parsing ${lines.length - 1} tracks from CSV...`);

  console.log(`Parsed ${tracks.length} valid tracks`);

  const chunkSize = 50;
  let imported = 0;
  let failed = 0;

  // Process chunks sequentially to avoid overwhelming the import endpoint.
  /* oxlint-disable eslint/no-await-in-loop */
  for (let i = 0; i < tracks.length; i += chunkSize) {
    const chunk = tracks.slice(i, i + chunkSize);
    const result = await importChunk(chunk, i, tracks.length, i === 0);

    imported += result.imported;
    failed += result.failed;
    process.stdout.write(
      `\rProgress: ${result.progress}% (${imported}/${tracks.length} imported)`
    );
  }
  /* oxlint-enable eslint/no-await-in-loop */

  console.log("\n\nImport complete!");
  console.log(`  Imported: ${imported}`);
  console.log(`  Failed: ${failed}`);
  console.log(`  Total: ${tracks.length}`);
}

importTracks().catch(console.error);
