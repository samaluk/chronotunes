#!/usr/bin/env node
"use strict";

const scrapeYt = require("scrape-yt");
const fs = require("node:fs");
const path = require("node:path");

const TEST_TRACKS = [
  { artist: "Chuck Berry", title: "Johnny B. Goode", year: 1958 },
  { artist: "Ray Charles", title: "What'd I Say", year: 1959 },
  { artist: "Ben E. King", title: "Stand By Me", year: 1961 },
  { artist: "The Beatles", title: "I Want To Hold Your Hand", year: 1963 },
  { artist: "The Temptations", title: "My Girl", year: 1964 },
  { artist: "The Beach Boys", title: "Good Vibrations", year: 1966 },
  { artist: "Jimi Hendrix", title: "Purple Haze", year: 1967 },
  {
    artist: "The Beatles",
    title: "Sgt. Pepper's Lonely Hearts Club Band",
    year: 1967,
  },
  { artist: "The Beatles", title: "Hey Jude", year: 1968 },
  { artist: "Led Zeppelin", title: "Whole Lotta Love", year: 1969 },
  {
    artist: "Simon & Garfunkel",
    title: "Bridge Over Troubled Water",
    year: 1970,
  },
  { artist: "Led Zeppelin", title: "Stairway To Heaven", year: 1971 },
  { artist: "Stevie Wonder", title: "Superstition", year: 1972 },
  { artist: "Eagles", title: "Hotel California", year: 1977 },
  { artist: "Bee Gees", title: "Stayin' Alive", year: 1977 },
  { artist: "Queen", title: "Another One Bites The Dust", year: 1980 },
  { artist: "Survivor", title: "Eye of the Tiger", year: 1982 },
  { artist: "The Police", title: "Every Breath You Take", year: 1983 },
  { artist: "Guns N' Roses", title: "Sweet Child O' Mine", year: 1987 },
  { artist: "Madonna", title: "Like a Prayer", year: 1989 },
  { artist: "Soundgarden", title: "Black Hole Sun", year: 1994 },
  { artist: "Oasis", title: "Wonderwall", year: 1995 },
  { artist: "Nirvana", title: "Smells Like Teen Spirit", year: 1991 },
  { artist: "Blackstreet", title: "No Diggity", year: 1996 },
  { artist: "The Verve", title: "Bitter Sweet Symphony", year: 1997 },
  { artist: "Backstreet Boys", title: "I Want It That Way", year: 1999 },
  { artist: "3 Doors Down", title: "Kryptonite", year: 2000 },
  { artist: "Linkin Park", title: "In The End", year: 2000 },
  { artist: "Nickelback", title: "How You Remind Me", year: 2001 },
  { artist: "OutKast", title: "Hey Ya!", year: 2003 },
  { artist: "The Killers", title: "Mr. Brightside", year: 2004 },
  { artist: "Gnarls Barkley", title: "Crazy", year: 2006 },
  { artist: "Amy Winehouse", title: "Rehab", year: 2006 },
  { artist: "Coldplay", title: "Viva La Vida", year: 2008 },
  { artist: "Lady Gaga", title: "Bad Romance", year: 2009 },
  { artist: "Adele", title: "Rolling in the Deep", year: 2010 },
  { artist: "Adele", title: "Someone Like You", year: 2011 },
  { artist: "PSY", title: "Gangnam Style", year: 2012 },
  { artist: "Daft Punk", title: "Get Lucky", year: 2013 },
  { artist: "Bruno Mars", title: "Uptown Funk", year: 2014 },
  { artist: "Ed Sheeran", title: "Shape of You", year: 2017 },
  { artist: "Luis Fonsi", title: "Despacito", year: 2017 },
  { artist: "Lil Nas X", title: "Old Town Road", year: 2018 },
  { artist: "Billie Eilish", title: "Bad Guy", year: 2019 },
  { artist: "The Weeknd", title: "Blinding Lights", year: 2020 },
  { artist: "Olivia Rodrigo", title: "drivers license", year: 2021 },
  { artist: "Harry Styles", title: "As It Was", year: 2022 },
  { artist: "Miley Cyrus", title: "Flowers", year: 2023 },
  { artist: "Dua Lipa", title: "Dance The Night", year: 2023 },
];

const BLACKLIST_WORDS = [
  "lyrics",
  "cover",
  "remix",
  "tribute",
  "live",
  "reaction",
];

async function searchTrack(title, artist) {
  const query = `${title} ${artist}`;
  process.stdout.write(`Searching: "${query}"... `);

  try {
    const results = await scrapeYt.search(query);

    if (!results || results.length === 0) {
      console.log("No results");
      return null;
    }

    // Score each result
    const scored = results.map((video) => {
      let score = 0;
      const titleLower = (video.title || "").toLowerCase();
      const channelLower = (video.channel?.name || "").toLowerCase();

      // Prefer official channel matches
      if (
        channelLower.includes(artist.toLowerCase()) ||
        channelLower.includes(artist.toLowerCase().split(" ")[0])
      ) {
        score += 100;
      }

      // Penalize blacklisted words
      for (const word of BLACKLIST_WORDS) {
        if (titleLower.includes(word)) {
          score -= 50;
        }
      }

      // Bonus for high views
      if (video.views) {
        score += Math.log10(video.views + 1) * 10;
      }

      return { score, video };
    });

    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);

    const best = scored[0];
    console.log(
      `Found: "${best.video.title}" (score: ${best.score.toFixed(1)}, channel: ${best.video.channel?.name}, views: ${best.video.views?.toLocaleString()})`
    );

    return best.video.id;
  } catch (error) {
    console.log(`Error: ${error}`);
    return null;
  }
}

async function main() {
  console.log(
    `Fetching YouTube video IDs for ${TEST_TRACKS.length} tracks...\n`
  );

  const results = [];

  for (let i = 0; i < TEST_TRACKS.length; i++) {
    const track = TEST_TRACKS[i];
    process.stdout.write(`${i + 1}/${TEST_TRACKS.length}: `);

    const videoId = await searchTrack(track.title, track.artist);
    results.push({ ...track, videoId });

    // Rate limiting
    if (i < TEST_TRACKS.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  console.log("\n\nGenerating updated seed file...\n");

  const failedCount = results.filter((r) => !r.videoId).length;
  console.log(`Failed to find: ${failedCount} tracks\n`);

  let seedContent = `import { mutation } from "./_generated/server";

const TEST_TRACKS = [
`;

  for (const track of results) {
    if (track.videoId) {
      seedContent += `  { title: "${track.title}", artist: "${track.artist}", year: ${track.year}, videoId: "${track.videoId}" },
`;
    } else {
      seedContent += `  // FAILED: { title: "${track.title}", artist: "${track.artist}", year: ${track.year}, videoId: null },
`;
      console.log(
        `Could not find video for: "${track.title}" - ${track.artist}`
      );
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
`;

  const seedPath = path.join(process.cwd(), "convex", "seed.ts");
  fs.writeFileSync(seedPath, seedContent);
  console.log(`Updated: ${seedPath}`);

  const jsonPath = path.join(
    process.cwd(),
    "convex",
    "youtube-search-results.json"
  );
  fs.writeFileSync(jsonPath, JSON.stringify(results, null, 2));
  console.log(`Saved: ${jsonPath}`);

  console.log("\n\nSummary:");
  console.log(`  Total tracks: ${results.length}`);
  console.log(`  Successfully found: ${results.length - failedCount}`);
  console.log(`  Failed: ${failedCount}`);
  console.log(`\nRun 'npx convex run seed:seed' to update the database.`);
}

main().catch(console.error);
