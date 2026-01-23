#!/usr/bin/env node
import * as fs from "node:fs"
import * as path from "node:path"

interface TrackData {
  title: string
  artist: string
  year: number
  spotifyTrackId?: string
  durationMs?: number
  mbid?: string
}

function parseDurationToMs(duration: string): number | undefined {
  const parts = duration.split(":").map(Number)
  if (parts.length === 2 && !parts.includes(Number.NaN)) {
    return parts[0] * 60 + parts[1]
  }
  if (parts.length === 3 && !parts.includes(Number.NaN)) {
    return parts[0] * 60 * 60 + parts[1] * 60 + parts[2]
  }
  return undefined
}

function parseYear(dateStr: string): number {
  if (!dateStr || dateStr === "0000-00-00") {
    return 2000
  }
  const year = Number.parseInt(dateStr.split("-")[0], 10)
  return Number.isNaN(year) ? 2000 : year
}

async function importTracks(): Promise<void> {
  const csvPath = path.join(process.cwd(), "convex", "HITSTER - Español Temazos.csv")

  if (!fs.existsSync(csvPath)) {
    console.error("CSV file not found:", csvPath)
    process.exit(1)
  }

  const csvContent = fs.readFileSync(csvPath, "utf-8")
  const lines = csvContent.trim().split("\n")
  const tracks: TrackData[] = []

  console.log(`Parsing ${lines.length - 1} tracks from CSV...`)

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) {
      continue
    }

    const parts = line.split("|")
    if (parts.length < 12) {
      continue
    }

    const title = parts[1]?.replace(/^"|"$/g, "").trim() || ""
    const artist = parts[2]?.replace(/^"|"$/g, "").trim() || ""
    const year = parseYear(parts[11]?.replace(/^"|"$/g, "") || "")
    const durationMs = parseDurationToMs(parts[7]?.replace(/^"|"$/g, "") || "")
    const spotifyTrackId = parts[19]?.replace(/^"|"$/g, "").trim() || undefined
    const mbid = parts[20]?.replace(/^"|"$/g, "").trim() || undefined

    if (title && artist) {
      const track: TrackData = { title, artist, year }
      if (spotifyTrackId) {
        track.spotifyTrackId = spotifyTrackId
      }
      if (durationMs !== undefined) {
        track.durationMs = durationMs
      }
      if (mbid) {
        track.mbid = mbid
      }
      tracks.push(track)
    }
  }

  console.log(`Parsed ${tracks.length} valid tracks`)

  const chunkSize = 50
  let imported = 0
  let failed = 0

  for (let i = 0; i < tracks.length; i += chunkSize) {
    const chunk = tracks.slice(i, i + chunkSize)
    const progress = Math.round(((i + chunk.length) / tracks.length) * 100)

    try {
      const response = await fetch("http://127.0.0.1:3210/api/tracks/parseAndImportCsv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          csvContent: chunk
            .map(
              (t) =>
                `${i}|"${t.title}","${t.artist}",0,0,0,0,00:00,0,0,0,0,${t.year},0,0,0,0,0,0,0,${t.spotifyTrackId || ""},${t.mbid || ""}`,
            )
            .join("\n"),
          clearExisting: i === 0,
        }),
      })

      if (response.ok) {
        const result = await response.json()
        imported += result.importedCount || 0
        if (result.hasErrors) {
          failed += chunk.length - (result.importedCount || 0)
        }
        process.stdout.write(`\rProgress: ${progress}% (${imported}/${tracks.length} imported)`)
      } else {
        console.error(`Failed to import chunk ${i / chunkSize + 1}:`, response.statusText)
        failed += chunk.length
      }
    } catch (error) {
      console.error(`\nError importing chunk ${i / chunkSize + 1}:`, error)
      failed += chunk.length
    }
  }

  console.log("\n\nImport complete!")
  console.log(`  Imported: ${imported}`)
  console.log(`  Failed: ${failed}`)
  console.log(`  Total: ${tracks.length}`)
}

importTracks().catch(console.error)
