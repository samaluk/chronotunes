#!/usr/bin/env node
"use strict"
const fs = require("fs")
const path = require("path")

function parseDurationToMs(duration) {
  const parts = duration.split(":").map(Number)
  if (parts.length === 2 && !parts.includes(Number.NaN)) {
    return parts[0] * 60 + parts[1]
  }
  if (parts.length === 3 && !parts.includes(Number.NaN)) {
    return parts[0] * 60 * 60 + parts[1] * 60 + parts[2]
  }
  return undefined
}

function parseYear(dateStr) {
  if (!dateStr || dateStr === "0000-00-00") {
    return 2000
  }
  const year = Number.parseInt(dateStr.split("-")[0], 10)
  return Number.isNaN(year) ? 2000 : year
}

// Simple CSV parser that handles quoted fields
function parseCSVLine(line) {
  const parts = []
  let current = ""
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === "," && !inQuotes) {
      parts.push(current)
      current = ""
    } else {
      current += char
    }
  }
  parts.push(current)

  return parts
}

function main() {
  const csvPath = path.join(process.cwd(), "convex", "HITSTER - Español Temazos.csv")

  if (!fs.existsSync(csvPath)) {
    console.error("CSV file not found:", csvPath)
    process.exit(1)
  }

  const csvContent = fs.readFileSync(csvPath, "utf-8")
  const lines = csvContent.trim().split("\n")
  const tracks = []

  console.log(`Parsing ${lines.length - 1} tracks from CSV...`)

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    // CSV parsing with proper handling of quoted fields
    const parts = parseCSVLine(line)
    if (parts.length < 12) continue

    const title = parts[1]?.replace(/^"|"$/g, "").trim() || ""
    const artist = parts[2]?.replace(/^"|"$/g, "").trim() || ""
    const year = parseYear(parts[11]?.replace(/^"|"$/g, "") || "")
    const durationMs = parseDurationToMs(parts[7]?.replace(/^"|"$/g, "") || "")
    const spotifyTrackId = parts[19]?.replace(/^"|"$/g, "").trim() || undefined
    const mbid = parts[20]?.replace(/^"|"$/g, "").trim() || undefined

    if (title && artist) {
      const track = { title, artist, year }
      if (spotifyTrackId) track.spotifyTrackId = spotifyTrackId
      if (durationMs !== undefined) track.durationMs = durationMs
      if (mbid) track.mbid = mbid
      tracks.push(track)
    }
  }

  console.log(`\nParsed ${tracks.length} valid tracks\n`)

  // Output summary
  let yearMin = Number.POSITIVE_INFINITY
  let yearMax = Number.NEGATIVE_INFINITY
  tracks.forEach((t) => {
    if (t.year < yearMin) yearMin = t.year
    if (t.year > yearMax) yearMax = t.year
  })

  console.log("Summary:")
  console.log(`  Total tracks: ${tracks.length}`)
  console.log(`  Year range: ${yearMin} - ${yearMax}`)
  console.log(`  Tracks with Spotify ID: ${tracks.filter((t) => t.spotifyTrackId).length}`)
  console.log(`  Tracks with MBID: ${tracks.filter((t) => t.mbid).length}`)

  // Output sample tracks
  console.log("\nSample tracks (first 5):")
  tracks.slice(0, 5).forEach((t, i) => {
    console.log(`  ${i + 1}. "${t.title}" - ${t.artist} (${t.year})`)
  })

  console.log("\nSample tracks (last 5):")
  tracks.slice(-5).forEach((t, i) => {
    console.log(`  ${tracks.length - 4 + i}. "${t.title}" - ${t.artist} (${t.year})`)
  })

  // Save tracks to JSON file for easy import
  const outputPath = path.join(process.cwd(), "convex", "tracks-import.json")
  fs.writeFileSync(outputPath, JSON.stringify(tracks, null, 2))
  console.log(`\nTrack data saved to: ${outputPath}`)
  console.log("\nTo import, use the Convex dashboard or run:")
  console.log("  npx convex run tracks:importTracksFromCsv --argsfile convex/tracks-import.json")
}

main()
