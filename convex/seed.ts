import { mutation } from "./_generated/server";

const TEST_TRACKS = [
  {
    artist: "Chuck Berry",
    title: "Johnny B. Goode",
    videoId: "uFeZ_x--aRg",
    year: 1958,
  },
  {
    artist: "Ray Charles",
    title: "What'd I Say",
    videoId: "8U3DT2nypv8",
    year: 1959,
  },
  {
    artist: "Ben E. King",
    title: "Stand By Me",
    videoId: "pKtLNYNWbBw",
    year: 1961,
  },
  {
    artist: "The Beatles",
    title: "I Want To Hold Your Hand",
    videoId: "A_MjCqQoLLA",
    year: 1963,
  },
  {
    artist: "The Temptations",
    title: "My Girl",
    videoId: "y3KJ7d2qBoA",
    year: 1964,
  },
  {
    artist: "The Beach Boys",
    title: "Good Vibrations",
    videoId: "apBWI6xrbLY",
    year: 1966,
  },
  {
    artist: "Jimi Hendrix",
    title: "Purple Haze",
    videoId: "WGoDaYjdfSg",
    year: 1967,
  },
  {
    artist: "The Beatles",
    title: "Sgt. Pepper's Lonely Hearts Club Band",
    videoId: "usNsCeOV4GM",
    year: 1967,
  },
  {
    artist: "The Beatles",
    title: "Hey Jude",
    videoId: "A_MjCqQoLLA",
    year: 1968,
  },
  {
    artist: "Led Zeppelin",
    title: "Whole Lotta Love",
    videoId: "HQmmM_qwG4k",
    year: 1969,
  },
  {
    artist: "Simon & Garfunkel",
    title: "Bridge Over Troubled Water",
    videoId: "4G-YQA_bsOU",
    year: 1970,
  },
  {
    artist: "Led Zeppelin",
    title: "Stairway To Heaven",
    videoId: "QkF3oxziUI4",
    year: 1971,
  },
  {
    artist: "Stevie Wonder",
    title: "Superstition",
    videoId: "0CFuCYNx-1g",
    year: 1972,
  },
  {
    artist: "Eagles",
    title: "Hotel California",
    videoId: "dLl4PZtxia8",
    year: 1977,
  },
  {
    artist: "Bee Gees",
    title: "Stayin' Alive",
    videoId: "SkypZuY6ZvA",
    year: 1977,
  },
  {
    artist: "Queen",
    title: "Another One Bites The Dust",
    videoId: "rY0WxgSXdEE",
    year: 1980,
  },
  {
    artist: "Survivor",
    title: "Eye of the Tiger",
    videoId: "XxxfQ7-aMrE",
    year: 1982,
  },
  {
    artist: "The Police",
    title: "Every Breath You Take",
    videoId: "OMOGaugKpzs",
    year: 1983,
  },
  {
    artist: "Guns N' Roses",
    title: "Sweet Child O' Mine",
    videoId: "1w7OgIMMRc4",
    year: 1987,
  },
  {
    artist: "Madonna",
    title: "Like a Prayer",
    videoId: "79fzeNUqQbQ",
    year: 1989,
  },
  {
    artist: "Soundgarden",
    title: "Black Hole Sun",
    videoId: "3mbBbFH9fAg",
    year: 1994,
  },
  { artist: "Oasis", title: "Wonderwall", videoId: "bx1Bh8ZvH84", year: 1995 },
  {
    artist: "Nirvana",
    title: "Smells Like Teen Spirit",
    videoId: "hTWKbfoikeg",
    year: 1991,
  },
  {
    artist: "Blackstreet",
    title: "No Diggity",
    videoId: "3KL9mRus19o",
    year: 1996,
  },
  {
    artist: "The Verve",
    title: "Bitter Sweet Symphony",
    videoId: "1lyu1KKwC74",
    year: 1997,
  },
  {
    artist: "Backstreet Boys",
    title: "I Want It That Way",
    videoId: "4fndeDfaWCg",
    year: 1999,
  },
  {
    artist: "3 Doors Down",
    title: "Kryptonite",
    videoId: "xPU8OAjjS4k",
    year: 2000,
  },
  {
    artist: "Linkin Park",
    title: "In The End",
    videoId: "kXYiU_JCYtU",
    year: 2000,
  },
  {
    artist: "Nickelback",
    title: "How You Remind Me",
    videoId: "1cQh1ccqu8M",
    year: 2001,
  },
  { artist: "OutKast", title: "Hey Ya!", videoId: "PWgvGjAhvIw", year: 2003 },
  {
    artist: "The Killers",
    title: "Mr. Brightside",
    videoId: "gGdGFtwCNBE",
    year: 2004,
  },
  {
    artist: "Gnarls Barkley",
    title: "Crazy",
    videoId: "-N4jf6rtyuw",
    year: 2006,
  },
  {
    artist: "Amy Winehouse",
    title: "Rehab",
    videoId: "KUmZp8pR1uc",
    year: 2006,
  },
  {
    artist: "Coldplay",
    title: "Viva La Vida",
    videoId: "dvgZkm1xWPE",
    year: 2008,
  },
  {
    artist: "Lady Gaga",
    title: "Bad Romance",
    videoId: "qrO4YZeyl0I",
    year: 2009,
  },
  {
    artist: "Adele",
    title: "Rolling in the Deep",
    videoId: "rYEDA3JcQqw",
    year: 2010,
  },
  {
    artist: "Adele",
    title: "Someone Like You",
    videoId: "hLQl3WQQoQ0",
    year: 2011,
  },
  { artist: "PSY", title: "Gangnam Style", videoId: "9bZkp7q19f0", year: 2012 },
  {
    artist: "Daft Punk",
    title: "Get Lucky",
    videoId: "5NV6Rdv1a3I",
    year: 2013,
  },
  {
    artist: "Bruno Mars",
    title: "Uptown Funk",
    videoId: "OPf0YbXqDm0",
    year: 2014,
  },
  {
    artist: "Ed Sheeran",
    title: "Shape of You",
    videoId: "JGwWNGJdvx8",
    year: 2017,
  },
  {
    artist: "Luis Fonsi",
    title: "Despacito",
    videoId: "kJQP7kiw5Fk",
    year: 2017,
  },
  {
    artist: "Lil Nas X",
    title: "Old Town Road",
    videoId: "r7qovpFAGrQ",
    year: 2018,
  },
  {
    artist: "Billie Eilish",
    title: "Bad Guy",
    videoId: "DyDfgMOUjCI",
    year: 2019,
  },
  {
    artist: "The Weeknd",
    title: "Blinding Lights",
    videoId: "4NRXx6U8ABQ",
    year: 2020,
  },
  {
    artist: "Olivia Rodrigo",
    title: "drivers license",
    videoId: "ZmDBbnmKpqQ",
    year: 2021,
  },
  {
    artist: "Harry Styles",
    title: "As It Was",
    videoId: "K4eB2w35314",
    year: 2022,
  },
  {
    artist: "Miley Cyrus",
    title: "Flowers",
    videoId: "My2FRPA3Gf8",
    year: 2023,
  },
  {
    artist: "Dua Lipa",
    title: "Dance The Night",
    videoId: "suAR1PYFNYA",
    year: 2023,
  },
];

export const seed = mutation({
  args: {},
  handler: async (ctx) => {
    const existingTracks = await ctx.db.query("tracks").collect();
    if (existingTracks.length > 0) {
      await Promise.all(
        existingTracks.map((track) => ctx.db.delete(track._id))
      );
    }

    const lobbyId = await ctx.db.insert("lobbies", {
      code: "TEST01",
      hostSessionId: "host-session",
      settings: {
        allowBetRetraction: true,
        allowGuessTitleArtist: true,
        bettingWindowSeconds: 15,
        maxYear: 2025,
        minYear: 1950,
        showLiveBets: true,
        startingCoins: 3,
        targetTimelineSize: 10,
        turnSeconds: 30,
      },
      status: "lobby",
    });

    const hostPlayerId = await ctx.db.insert("players", {
      coins: 3,
      createdAt: Date.now(),
      displayName: "Host Player",
      isHost: true,
      lobbyId,
      sessionId: "host-session",
      timeline: [],
      timelineSize: 0,
    });

    const trackIds = await Promise.all(
      TEST_TRACKS.map((track) =>
        ctx.db.insert("tracks", {
          artist: track.artist,
          createdAt: Date.now(),
          externalIds: { youtubeVideoId: track.videoId },
          links: {},
          source: "seed",
          title: track.title,
          year: track.year,
        })
      )
    );

    return {
      hostPlayerId,
      lobbyCode: "TEST01",
      lobbyId,
      message: "Database seeded successfully",
      trackCount: trackIds.length,
      tracks: TEST_TRACKS.map((t, i) => ({ ...t, id: trackIds[i] })),
    };
  },
});
