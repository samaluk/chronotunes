#!/usr/bin/env node

import { youtube } from "scrape-youtube"

const TEST_TRACKS = [
  { title: "Johnny B. Goode", artist: "Chuck Berry", year: 1958 },
  { title: "What'd I Say", artist: "Ray Charles", year: 1959 },
  { title: "Stand By Me", artist: "Ben E. King", year: 1961 },
  { title: "I Want To Hold Your Hand", artist: "The Beatles", year: 1963 },
  { title: "My Girl", artist: "The Temptations", year: 1964 },
  { title: "Good Vibrations", artist: "The Beach Boys", year: 1966 },
  { title: "Purple Haze", artist: "Jimi Hendrix", year: 1967 },
  { title: "Sgt. Pepper's Lonely Hearts Club Band", artist: "The Beatles", year: 1967 },
  { title: "Hey Jude", artist: "The Beatles", year: 1968 },
  { title: "Whole Lotta Love", artist: "Led Zeppelin", year: 1969 },
  { title: "Bridge Over Troubled Water", artist: "Simon & Garfunkel", year: 1970 },
  { title: "Stairway To Heaven", artist: "Led Zeppelin", year: 1971 },
  { title: "Superstition", artist: "Stevie Wonder", year: 1972 },
  { title: "Hotel California", artist: "Eagles", year: 1977 },
  { title: "Stayin' Alive", artist: "Bee Gees", year: 1977 },
  { title: "Another One Bites The Dust", artist: "Queen", year: 1980 },
  { title: "Eye of the Tiger", artist: "Survivor", year: 1982 },
  { title: "Every Breath You Take", artist: "The Police", year: 1983 },
  { title: "Sweet Child O' Mine", artist: "Guns N' Roses", year: 1987 },
  { title: "Like a Prayer", artist: "Madonna", year: 1989 },
  { title: "Black Hole Sun", artist: "Soundgarden", year: 1994 },
  { title: "Wonderwall", artist: "Oasis", year: 1995 },
  { title: "Smells Like Teen Spirit", artist: "Nirvana", year: 1991 },
  { title: "No Diggity", artist: "Blackstreet", year: 1996 },
  { title: "Bitter Sweet Symphony", artist: "The Verve", year: 1997 },
  { title: "I Want It That Way", artist: "Backstreet Boys", year: 1999 },
  { title: "Kryptonite", artist: "3 Doors Down", year: 2000 },
  { title: "In The End", artist: "Linkin Park", year: 2000 },
  { title: "How You Remind Me", artist: "Nickelback", year: 2001 },
  { title: "Hey Ya!", artist: "OutKast", year: 2003 },
  { title: "Mr. Brightside", artist: "The Killers", year: 2004 },
  { title: "Crazy", artist: "Gnarls Barkley", year: 2006 },
  { title: "Rehab", artist: "Amy Winehouse", year: 2006 },
  { title: "Viva La Vida", artist: "Coldplay", year: 2008 },
  { title: "Bad Romance", artist: "Lady Gaga", year: 2009 },
  { title: "Rolling in the Deep", artist: "Adele", year: 2010 },
  { title: "Someone Like You", artist: "Adele", year: 2011 },
  { title: "Gangnam Style", artist: "PSY", year: 2012 },
  { title: "Get Lucky", artist: "Daft Punk", year: 2013 },
  { title: "Uptown Funk", artist: "Bruno Mars", year: 2014 },
  { title: "Shape of You", artist: "Ed Sheeran", year: 2017 },
  { title: "Despacito", artist: "Luis Fonsi", year: 2017 },
  { title: "Old Town Road", artist: "Lil Nas X", year: 2018 },
  { title: "Bad Guy", artist: "Billie Eilish", year: 2019 },
  { title: "Blinding Lights", artist: "The Weeknd", year: 2020 },
  { title: "drivers license", artist: "Olivia Rodrigo", year: 2021 },
  { title: "As It Was", artist: "Harry Styles", year: 2022 },
  { title: "Flowers", artist: "Miley Cyrus", year: 2023 },
  { title: "Dance The Night", artist: "Dua Lipa", year: 2023 },
]

const BLACKLIST_WORDS = ["lyrics", "cover", "remix", "tribute", "live", "reaction", "behind"]

async function searchTrack(title: string, artist: string, retryCount = 0): Promise<string | null> {
  const query = `${title} ${artist} official video`
  process.stdout.write(`Searching: "${query}"... `)

  try {
    const { videos } = await youtube.search(query)

    if (!videos.length) {
      console.log("No results")
      return null
    }

    // Score each result
    const artistLower = artist.toLowerCase()
    const artistFirstWord = artistLower.split(" ")[0] || ""

    const scored = videos.map((video) => {
      let score = 0
      const titleLower = (video.title || "").toLowerCase()
      const channelName = video.channel?.name || video.channel || ""
      const channelLower = (
        typeof channelName === "string" ? channelName : JSON.stringify(channelName)
      ).toLowerCase()

      // Prefer official channel matches
      if (channelLower.includes(artistLower) || channelLower.includes(artistFirstWord)) {
        score += 100
      }

      // Penalize blacklisted words
      for (const word of BLACKLIST_WORDS) {
        if (titleLower.includes(word)) {
          score -= 50
        }
      }

      // Bonus for high views if available
      if (video.views) {
        score += Math.log10(video.views + 1) * 5
      }

      return { video, score }
    })

    // Sort by score descending
    scored.sort((a, b) => b.score - a.score)

    const best = scored[0]
    console.log(
      `Found: "${best.video.title}" (score: ${best.score}, channel: ${best.video.channel})`,
    )

    return best.video.id
  } catch (error) {
    const maxRetries = 2
    if (retryCount < maxRetries) {
      console.log(`Retrying (${retryCount + 1}/${maxRetries})...`)
      await new Promise((resolve) => setTimeout(resolve, 3000))
      return searchTrack(title, artist, retryCount + 1)
    }
    console.log(`Error: ${error}`)
    return null
  }
}

async function main() {
  const fs = await import("node:fs")
  const path = await import("node:path")

  console.log(`Fetching YouTube video IDs for ${TEST_TRACKS.length} tracks...\n`)

  const results = []

  for (let i = 0; i < TEST_TRACKS.length; i++) {
    const track = TEST_TRACKS[i]
    process.stdout.write(`${i + 1}/${TEST_TRACKS.length}: `)

    const videoId = await searchTrack(track.title, track.artist)
    results.push({ ...track, videoId })

    // Rate limiting
    if (i < TEST_TRACKS.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 2000))
    }
  }

  console.log("\n\nGenerating updated seed file...\n")

  const failedCount = results.filter((r) => !r.videoId).length
  console.log(`Failed to find: ${failedCount} tracks\n`)

  let seedContent = `import { mutation } from "./_generated/server";

const TEST_TRACKS = [
`

  for (const track of results) {
    if (track.videoId) {
      seedContent += `  { title: "${track.title}", artist: "${track.artist}", year: ${track.year}, videoId: "${track.videoId}" },
`
    } else {
      seedContent += `  // FAILED: { title: "${track.title}", artist: "${track.artist}", year: ${track.year}, videoId: null },
`
      console.log(`Could not find video for: "${track.title}" - ${track.artist}`)
    }
  }

  seedContent += `];

export const seed = mutation({
  args: {},
  handler: async (ctx) => {
    const existingTracks = await ctx.db.query("tracks").collect();
    if (existingTracks.length > 0) {
      existingTracks.forEach(async (track) => {
        await ctx.db.delete(track._id);
      });
    }

    const lobbyId = await ctx.db.insert("lobbies", {
      code: "TEST01",
      hostSessionId: "host-session",
      status: "lobby",
      settings: {
        targetTimelineSize: 10,
        startingCoins: 3,
        turnSeconds: 30,
        bettingWindowSeconds: 15,
        allowGuessTitleArtist: true,
        showLiveBets: true,
        allowBetRetraction: true,
        minYear: 1950,
        maxYear: 2025,
      },
    });

    const hostPlayerId = await ctx.db.insert("players", {
      lobbyId,
      sessionId: "host-session",
      displayName: "Host Player",
      isHost: true,
      coins: 3,
      timeline: [],
      timelineSize: 0,
      createdAt: Date.now(),
    });

    const trackIds = await Promise.all(
      TEST_TRACKS.map((track) =>
        ctx.db.insert("tracks", {
          title: track.title,
          artist: track.artist,
          year: track.year,
          externalIds: { youtubeVideoId: track.videoId },
          links: {},
          createdAt: Date.now(),
          source: "seed",
        }),
      ),
    );

    return {
      message: "Database seeded successfully",
      lobbyCode: "TEST01",
      lobbyId,
      hostPlayerId,
      trackCount: trackIds.length,
      tracks: TEST_TRACKS.map((t, i) => ({ ...t, id: trackIds[i] })),
    };
  },
});
`

  const seedPath = path.join(process.cwd(), "convex", "seed.ts")
  fs.writeFileSync(seedPath, seedContent)
  console.log(`Updated: ${seedPath}`)

  const jsonPath = path.join(process.cwd(), "convex", "youtube-search-results.json")
  fs.writeFileSync(jsonPath, JSON.stringify(results, null, 2))
  console.log(`Saved: ${jsonPath}`)

  console.log("\n\nSummary:")
  console.log(`  Total tracks: ${results.length}`)
  console.log(`  Successfully found: ${results.length - failedCount}`)
  console.log(`  Failed: ${failedCount}`)
  console.log(`\nRun 'npx convex run seed:seed' to update the database.`)
}

main().catch(console.error)
