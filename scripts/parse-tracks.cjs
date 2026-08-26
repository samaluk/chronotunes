#!/usr/bin/env node
"use strict";
/* oxlint-disable typescript/no-unsafe-assignment, typescript/no-unsafe-call, typescript/no-unsafe-member-access, typescript/no-unsafe-argument, typescript/no-unsafe-return */
const fs = require("node:fs");
const path = require("node:path");

function parseDurationToMs(duration) {
  if (!duration) {
    return;
  }

  if (!duration.includes(":")) {
    const milliseconds = Number.parseInt(duration, 10);
    if (!Number.isNaN(milliseconds) && milliseconds >= 0) {
      return milliseconds;
    }
    return;
  }

  const parts = duration.split(":").map(Number);
  if (parts.length === 2 && !parts.includes(Number.NaN)) {
    return (parts[0] * 60 + parts[1]) * 1000;
  }
  if (parts.length === 3 && !parts.includes(Number.NaN)) {
    return (parts[0] * 60 * 60 + parts[1] * 60 + parts[2]) * 1000;
  }
  return;
}

function parseYear(dateStr) {
  if (!dateStr || dateStr === "0000-00-00") {
    return 2000;
  }
  // oxlint-disable-next-line typescript/no-unsafe-argument, typescript/no-unsafe-call, typescript/no-unsafe-member-access
  const year = Number.parseInt(dateStr.split("-")[0], 10);
  return Number.isNaN(year) ? 2000 : year;
}

// Simple CSV parser that handles quoted fields
function parseCSVLine(line) {
  const parts = [];
  let current = "";
  let inQuotes = false;

  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      parts.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  parts.push(current);

  return parts;
}

function parseTracks(lines) {
  const tracks = [];

  // oxlint-disable-next-line typescript/no-unsafe-call, typescript/no-unsafe-member-access
  for (const line of lines.slice(1)) {
    // oxlint-disable-next-line typescript/no-unsafe-assignment, typescript/no-unsafe-call, typescript/no-unsafe-member-access
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }

    const parts = parseCSVLine(trimmed);
    if (parts.length < 12) {
      continue;
    }

    const title = parts[1]?.replaceAll(/^"|"$/g, "").trim() || "";
    const artist = parts[2]?.replaceAll(/^"|"$/g, "").trim() || "";
    const year = parseYear(parts[11]?.replaceAll(/^"|"$/g, "") || "");
    // oxlint-disable-next-line typescript/no-unsafe-assignment
    const durationMs = parseDurationToMs(parts[7]?.replaceAll(/^"|"$/g, "") || "");
    const spotifyTrackId = parts[19]?.replaceAll(/^"|"$/g, "").trim() || undefined;
    const mbid = parts[20]?.replaceAll(/^"|"$/g, "").trim() || undefined;

    if (!(title && artist)) {
      continue;
    }

    const track = { artist, title, year };
    if (spotifyTrackId) {
      track.spotifyTrackId = spotifyTrackId;
    }
    if (durationMs !== undefined) {
      // oxlint-disable-next-line typescript/no-unsafe-assignment
      track.durationMs = durationMs;
    }
    if (mbid) {
      track.mbid = mbid;
    }
    tracks.push(track);
  }

  return tracks;
}

function getYearRange(tracks) {
  let yearMin = Number.POSITIVE_INFINITY;
  let yearMax = Number.NEGATIVE_INFINITY;

  for (const track of tracks) {
    // oxlint-disable-next-line typescript/no-unsafe-member-access
    if (track.year < yearMin) {
      // oxlint-disable-next-line typescript/no-unsafe-assignment, typescript/no-unsafe-member-access
      yearMin = track.year;
    }
    // oxlint-disable-next-line typescript/no-unsafe-member-access
    if (track.year > yearMax) {
      // oxlint-disable-next-line typescript/no-unsafe-assignment, typescript/no-unsafe-member-access
      yearMax = track.year;
    }
  }

  return { yearMax, yearMin };
}

function logSampleTracks(label, tracks, startIndex) {
  console.log(`\nSample tracks (${label}):`);
  // oxlint-disable-next-line typescript/no-unsafe-call, typescript/no-unsafe-member-access
  tracks.forEach((track, index) => {
    // oxlint-disable-next-line typescript/no-unsafe-member-access
    console.log(`  ${startIndex + index}. "${track.title}" - ${track.artist} (${track.year})`);
  });
}

function main() {
  const csvPath = path.join(process.cwd(), "convex", "HITSTER - Español Temazos.csv");

  if (!fs.existsSync(csvPath)) {
    console.error("CSV file not found:", csvPath);
    process.exit(1);
  }

  const csvContent = fs.readFileSync(csvPath, "utf-8");
  const lines = csvContent.trim().split("\n");
  const tracks = parseTracks(lines);

  console.log(`Parsing ${lines.length - 1} tracks from CSV...`);

  console.log(`\nParsed ${tracks.length} valid tracks\n`);

  // Output summary
  const { yearMin, yearMax } = getYearRange(tracks);

  console.log("Summary:");
  console.log(`  Total tracks: ${tracks.length}`);
  console.log(`  Year range: ${yearMin} - ${yearMax}`);
  console.log(`  Tracks with Spotify ID: ${tracks.filter((t) => t.spotifyTrackId).length}`);
  console.log(`  Tracks with MBID: ${tracks.filter((t) => t.mbid).length}`);

  // Output sample tracks
  logSampleTracks("first 5", tracks.slice(0, 5), 1);
  logSampleTracks("last 5", tracks.slice(-5), Math.max(tracks.length - 4, 1));

  // Save tracks to JSON file for easy import
  const outputPath = path.join(process.cwd(), "convex", "tracks-import.json");
  fs.writeFileSync(outputPath, JSON.stringify(tracks, null, 2));
  console.log(`\nTrack data saved to: ${outputPath}`);
  console.log("\nTo import, use the Convex dashboard or run:");
  console.log("  npx convex run tracks:importTracksFromCsv --argsfile convex/tracks-import.json");
}

main();
