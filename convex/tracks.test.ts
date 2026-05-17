import { convexTest } from "convex-test"
import { expect, test } from "vitest"
import { api } from "./_generated/api"
import type { Id } from "./_generated/dataModel"
import { asSessionId } from "./lib/sessions"
import schema from "./schema"
import { modules } from "./test.setup"

test("get returns track by ID", async () => {
  const t = convexTest(schema, modules)

  const trackId = await t.run(async (ctx) => {
    return await ctx.db.insert("tracks", {
      title: "Test Track",
      artist: "Test Artist",
      year: 1990,
      externalIds: { youtubeVideoId: "abc123" },
      links: {},
      createdAt: Date.now(),
      source: "test",
    })
  })

  const track = await t.query(api.tracks.get, { trackIds: [trackId] })

  expect(track).toHaveLength(1)
  expect(track[0]).not.toBeNull()
  expect(track[0]?.title).toBe("Test Track")
  expect(track[0]?.artist).toBe("Test Artist")
  expect(track[0]?.year).toBe(1990)
})

test("get returns multiple tracks by ID", async () => {
  const t = convexTest(schema, modules)

  const trackId1 = await t.run(async (ctx) => {
    return await ctx.db.insert("tracks", {
      title: "Track 1",
      artist: "Artist 1",
      year: 1980,
      externalIds: {},
      links: {},
      createdAt: Date.now(),
      source: "test",
    })
  })

  const trackId2 = await t.run(async (ctx) => {
    return await ctx.db.insert("tracks", {
      title: "Track 2",
      artist: "Artist 2",
      year: 1990,
      externalIds: {},
      links: {},
      createdAt: Date.now(),
      source: "test",
    })
  })

  const trackId3 = await t.run(async (ctx) => {
    return await ctx.db.insert("tracks", {
      title: "Track 3",
      artist: "Artist 3",
      year: 2000,
      externalIds: {},
      links: {},
      createdAt: Date.now(),
      source: "test",
    })
  })

  const tracks = await t.query(api.tracks.get, {
    trackIds: [trackId1, trackId2, trackId3],
  })

  expect(tracks).toHaveLength(3)
  expect(tracks[0]?.title).toBe("Track 1")
  expect(tracks[1]?.title).toBe("Track 2")
  expect(tracks[2]?.title).toBe("Track 3")
})

test("get returns empty array for empty input", async () => {
  const t = convexTest(schema, modules)

  const tracks = await t.query(api.tracks.get, { trackIds: [] })

  expect(tracks).toHaveLength(0)
})

test("importTracks creates tracks from array", async () => {
  const t = convexTest(schema, modules)

  const tracks = [
    { title: "Test Song 1", artist: "Artist 1", year: 1990, youtubeVideoId: "abc123" },
    { title: "Test Song 2", artist: "Artist 2", year: 1995 },
    { title: "Test Song 3", artist: "Artist 3", year: 2000, youtubeVideoId: "xyz789" },
  ]

  const result = await t.mutation(api.tracks.importTracks, { tracks })

  expect(result.importedCount).toBe(3)
  expect(result.trackIds).toHaveLength(3)

  const allTracks = await t.query(api.tracks.list)
  expect(allTracks).toHaveLength(3)
})

test("importTracks validates required title", async () => {
  const t = convexTest(schema, modules)

  const tracks = [{ title: "", artist: "Artist", year: 1990 }]

  await expect(t.mutation(api.tracks.importTracks, { tracks })).rejects.toThrow(
    "Track title is required",
  )
})

test("importTracks validates required artist", async () => {
  const t = convexTest(schema, modules)

  const tracks = [{ title: "Song", artist: "", year: 1990 }]

  await expect(t.mutation(api.tracks.importTracks, { tracks })).rejects.toThrow(
    "Track artist is required",
  )
})

test("importTracks validates year range", async () => {
  const t = convexTest(schema, modules)

  const tracksTooEarly = [{ title: "Song", artist: "Artist", year: 1800 }]
  const tracksTooLate = [{ title: "Song", artist: "Artist", year: 2050 }]

  await expect(t.mutation(api.tracks.importTracks, { tracks: tracksTooEarly })).rejects.toThrow(
    "Track year must be between 1900 and 2030",
  )
  await expect(t.mutation(api.tracks.importTracks, { tracks: tracksTooLate })).rejects.toThrow(
    "Track year must be between 1900 and 2030",
  )
})

test("importTracks validates empty array", async () => {
  const t = convexTest(schema, modules)

  await expect(t.mutation(api.tracks.importTracks, { tracks: [] })).rejects.toThrow(
    "At least one track must be provided",
  )
})

test("importTracks validates max batch size", async () => {
  const t = convexTest(schema, modules)

  const tracks = Array.from({ length: 1001 }, (_, i) => ({
    title: `Song ${i}`,
    artist: "Artist",
    year: 2000,
  }))

  await expect(t.mutation(api.tracks.importTracks, { tracks })).rejects.toThrow(
    "Cannot import more than 1000 tracks at once",
  )
})

test("importTracks validates empty youtubeVideoId", async () => {
  const t = convexTest(schema, modules)

  const tracks = [{ title: "Song", artist: "Artist", year: 1990, youtubeVideoId: "   " }]

  await expect(t.mutation(api.tracks.importTracks, { tracks })).rejects.toThrow(
    "YouTube video ID must be a non-empty string if provided",
  )
})

test("importTracks validates negative durationMs", async () => {
  const t = convexTest(schema, modules)

  const tracks = [{ title: "Song", artist: "Artist", year: 1990, durationMs: -100 }]

  await expect(t.mutation(api.tracks.importTracks, { tracks })).rejects.toThrow(
    "Duration must be a non-negative number if provided",
  )
})

test("importTracks with optional mbid", async () => {
  const t = convexTest(schema, modules)

  const tracks = [
    {
      title: "Song with MBID",
      artist: "Artist",
      year: 1990,
      mbid: "12345678-1234-1234-1234-123456789012",
    },
  ]

  const result = await t.mutation(api.tracks.importTracks, { tracks })

  expect(result.importedCount).toBe(1)

  const allTracks = await t.query(api.tracks.list)
  expect(allTracks[0]?.mbid).toBe("12345678-1234-1234-1234-123456789012")
})

test("importTracks with optional durationMs", async () => {
  const t = convexTest(schema, modules)

  const tracks = [{ title: "Song", artist: "Artist", year: 1990, durationMs: 180_000 }]

  const result = await t.mutation(api.tracks.importTracks, { tracks })

  expect(result.importedCount).toBe(1)

  const allTracks = await t.query(api.tracks.list)
  expect(allTracks[0]?.durationMs).toBe(180_000)
})

test("importTracks trims whitespace from strings", async () => {
  const t = convexTest(schema, modules)

  const tracks = [{ title: "  Song Title  ", artist: "  Artist Name  ", year: 1990 }]

  const result = await t.mutation(api.tracks.importTracks, { tracks })

  expect(result.importedCount).toBe(1)

  const allTracks = await t.query(api.tracks.list)
  expect(allTracks[0]?.title).toBe("Song Title")
  expect(allTracks[0]?.artist).toBe("Artist Name")
})

async function seedRoundTestData(t: ReturnType<typeof convexTest>) {
  await t.run(async (ctx) => {
    const trackId = await ctx.db.insert("tracks", {
      title: "Round Song",
      artist: "Round Artist",
      year: 1985,
      externalIds: { youtubeVideoId: "video123" },
      links: { youtubeUrl: "https://youtube.com/watch?v=video123" },
      createdAt: Date.now(),
      source: "test",
      durationMs: 210_000,
      mbid: "test-mbid-123",
    })

    const lobbyId = await ctx.db.insert("lobbies", {
      code: "TEST123",
      hostSessionId: "host-session",
      status: "in_game",
      settings: {
        targetTimelineSize: 6,
        startingCoins: 10,
        turnSeconds: 30,
        bettingWindowSeconds: 10,
        allowGuessTitleArtist: true,
        showLiveBets: true,
        allowBetRetraction: true,
        minYear: 1900,
        maxYear: 2030,
      },
    })

    await ctx.db.insert("players", {
      lobbyId,
      sessionId: asSessionId("host-session"),
      displayName: "Host",
      isHost: true,
      coins: 10,
      timeline: [],
      timelineSize: 0,
      createdAt: Date.now(),
    })

    await ctx.db.insert("players", {
      lobbyId,
      sessionId: asSessionId("player-session"),
      displayName: "Player",
      isHost: false,
      coins: 10,
      timeline: [],
      timelineSize: 0,
      createdAt: Date.now(),
    })

    const gameId = await ctx.db.insert("games", {
      lobbyId,
      status: "active",
      startedAt: Date.now(),
      currentRoundNumber: 1,
      turnOrder: [],
    })

    await ctx.db.patch(lobbyId, { activeGameId: gameId })

    const player = await ctx.db
      .query("players")
      .filter((q) => q.eq(q.field("sessionId"), "host-session"))
      .first()

    if (player) {
      const roundId = await ctx.db.insert("rounds", {
        gameId,
        roundNumber: 1,
        turnPlayerId: player._id,
        trackId,
        phase: "placing",
        startedAt: Date.now(),
      })

      await ctx.db.patch(gameId, {
        currentRoundId: roundId,
        turnOrder: [player._id],
      })
    }

    return trackId
  })
}

test("getForRound returns full track info for host", async () => {
  const t = convexTest(schema, modules)

  await seedRoundTestData(t)

  const lobby = await t.run(async (ctx) => {
    return await ctx.db.query("lobbies").first()
  })

  expect(lobby).not.toBeNull()

  const result = await t.query(api.tracks.getForRound, {
    lobbyId: lobby!._id,
    sessionId: asSessionId("host-session"),
  })

  expect(result).not.toBeNull()
  expect(result?.title).toBe("Round Song")
  expect(result?.artist).toBe("Round Artist")
  expect(result?.year).toBe(1985)
  expect(result?.durationMs).toBe(210_000)
  expect(result?.mbid).toBe("test-mbid-123")
  expect(result?.externalIds.youtubeVideoId).toBe("video123")
  expect(result?.links.youtubeUrl).toBe("https://youtube.com/watch?v=video123")
})

test("getForRound returns null for non-host", async () => {
  const t = convexTest(schema, modules)

  await seedRoundTestData(t)

  const lobby = await t.run(async (ctx) => {
    return await ctx.db.query("lobbies").first()
  })

  expect(lobby).not.toBeNull()

  const result = await t.query(api.tracks.getForRound, {
    lobbyId: lobby!._id,
    sessionId: asSessionId("player-session"),
  })

  expect(result).toBeNull()
})

test("getForRound returns null when no active game", async () => {
  const t = convexTest(schema, modules)

  await seedRoundTestData(t)

  const lobby = await t.run(async (ctx) => {
    const l = await ctx.db.query("lobbies").first()
    if (l) {
      await ctx.db.patch(l._id, { activeGameId: undefined })
    }
    return l
  })

  expect(lobby).not.toBeNull()

  const result = await t.query(api.tracks.getForRound, {
    lobbyId: lobby!._id,
    sessionId: asSessionId("host-session"),
  })

  expect(result).toBeNull()
})

test("getPublic returns track info when round is resolved", async () => {
  const t = convexTest(schema, modules)

  await seedRoundTestData(t)

  let roundId: Id<"rounds"> | null = null
  await t.run(async (ctx) => {
    const game = await ctx.db.query("games").first()
    if (game?.currentRoundId) {
      await ctx.db.patch(game.currentRoundId, { phase: "resolved" })
      roundId = game.currentRoundId
    }
  })

  expect(roundId).not.toBeNull()

  const result = await t.query(api.tracks.getPublic, { roundId: roundId! })

  expect(result).not.toBeNull()
  expect(result?.title).toBe("Round Song")
  expect(result?.artist).toBe("Round Artist")
  expect(result?.year).toBe(1985)
  expect(result?.youtubeVideoId).toBe("video123")
})

test("getPublic returns null when round is not resolved", async () => {
  const t = convexTest(schema, modules)

  await seedRoundTestData(t)

  const round = await t.run(async (ctx) => {
    return await ctx.db.query("rounds").first()
  })

  expect(round).not.toBeNull()

  const result = await t.query(api.tracks.getPublic, { roundId: round!._id })

  expect(result).toBeNull()
})

test("getPublic returns null for non-existent round", async () => {
  const t = convexTest(schema, modules)

  const result = await t.query(api.tracks.getPublic, {
    roundId: "99999999999999999999999999999999rounds" as Id<"rounds">,
  })

  expect(result).toBeNull()
})

test("getPublic returns null youtubeVideoId when not set", async () => {
  const t = convexTest(schema, modules)

  const trackId = await t.run(async (ctx) => {
    return await ctx.db.insert("tracks", {
      title: "No Video Song",
      artist: "Unknown Artist",
      year: 2000,
      externalIds: {},
      links: {},
      createdAt: Date.now(),
      source: "test",
    })
  })

  const lobbyId = await t.run(async (ctx) => {
    return await ctx.db.insert("lobbies", {
      code: "NOVIDEO",
      hostSessionId: asSessionId("host2"),
      status: "lobby",
      settings: {
        targetTimelineSize: 6,
        startingCoins: 10,
        turnSeconds: 30,
        bettingWindowSeconds: 10,
        allowGuessTitleArtist: true,
        showLiveBets: true,
        allowBetRetraction: true,
        minYear: 1900,
        maxYear: 2030,
      },
    })
  })

  const gameId = await t.run(async (ctx) => {
    return await ctx.db.insert("games", {
      lobbyId,
      status: "active",
      startedAt: Date.now(),
      currentRoundNumber: 1,
      turnOrder: [],
    })
  })

  const player = await t.run(async (ctx) => {
    return await ctx.db.insert("players", {
      lobbyId,
      sessionId: asSessionId("host2"),
      displayName: "Host2",
      isHost: true,
      coins: 10,
      timeline: [],
      timelineSize: 0,
      createdAt: Date.now(),
    })
  })

  const roundId = await t.run(async (ctx) => {
    const rid = await ctx.db.insert("rounds", {
      gameId,
      roundNumber: 1,
      turnPlayerId: player,
      trackId,
      phase: "resolved",
      startedAt: Date.now(),
    })
    await ctx.db.patch(gameId, { currentRoundId: rid, turnOrder: [player] })
    return rid
  })

  const result = await t.query(api.tracks.getPublic, { roundId })

  expect(result).not.toBeNull()
  expect(result?.youtubeVideoId).toBeNull()
})
