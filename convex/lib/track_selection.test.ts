import { convexTest } from "convex-test"
import { expect, test } from "vitest"
import { api } from "../_generated/api"
import type { Id } from "../_generated/dataModel"
import schema from "../schema"
import { modules } from "../test.setup"
import { asSessionId } from "./sessions"

async function seedTracks(t: ReturnType<typeof convexTest>) {
  await t.run(async (ctx) => {
    for (let year = 1950; year <= 2050; year += 5) {
      await ctx.db.insert("tracks", {
        title: `Song ${year}`,
        artist: `Artist ${year}`,
        year,
        externalIds: { youtubeVideoId: `video${year}` },
        links: {},
        createdAt: Date.now(),
        source: "test",
      })
    }
  })
}

async function createGameWithPlayers(
  t: ReturnType<typeof convexTest>,
  minYear: number,
  maxYear: number,
) {
  const { code } = await t.mutation(api.lobbies.create, {
    sessionId: asSessionId("host-session"),
    displayName: "Host",
  })

  await t.mutation(api.lobbies.join, {
    code,
    sessionId: asSessionId("player1-session"),
    displayName: "Player1",
  })

  await t.mutation(api.lobbies.join, {
    code,
    sessionId: asSessionId("player2-session"),
    displayName: "Player2",
  })

  await t.mutation(api.lobbies.updateSettings, {
    code,
    sessionId: asSessionId("host-session"),
    settings: {
      targetTimelineSize: 10,
      startingCoins: 3,
      turnSeconds: 60,
      bettingWindowSeconds: 15,
      allowGuessTitleArtist: false,
      showLiveBets: true,
      allowBetRetraction: true,
      minYear,
      maxYear,
    },
  })

  const lobby = await t.query(api.lobbies.get, { code })
  if (!lobby) {
    throw new Error("Lobby not found")
  }
  const lobbyId = lobby._id

  const result = await t.mutation(api.games.start, {
    lobbyId,
    sessionId: asSessionId("host-session"),
  })

  return { gameId: result.gameId as Id<"games">, code }
}

test("selectTrackForRound returns track within year range", async () => {
  const t = convexTest(schema, modules)

  await seedTracks(t)

  const { gameId } = await createGameWithPlayers(t, 1980, 2000)

  const track = await t.run(async (ctx) => {
    const { selectTrackForRound } = await import("./track_selection")
    return await selectTrackForRound(ctx, {
      gameId,
      minYear: 1980,
      maxYear: 2000,
    })
  })

  expect(track).not.toBeNull()
  expect(track!.year).toBeGreaterThanOrEqual(1980)
  expect(track!.year).toBeLessThanOrEqual(2000)
})

test("selectTrackForRound never returns track already used in game", async () => {
  const t = convexTest(schema, modules)

  await seedTracks(t)

  const { gameId } = await createGameWithPlayers(t, 1980, 2000)

  const firstTrack = await t.run(async (ctx) => {
    const { selectTrackForRound } = await import("./track_selection")
    return await selectTrackForRound(ctx, {
      gameId,
      minYear: 1980,
      maxYear: 2000,
    })
  })

  expect(firstTrack).not.toBeNull()

  await t.run(async (ctx) => {
    const game = await ctx.db.get(gameId)
    if (!game) {
      return
    }

    const players = await ctx.db
      .query("players")
      .filter((q) => q.eq(q.field("lobbyId"), game.lobbyId))
      .collect()

    const player = players[0]!
    await ctx.db.patch(player._id, {
      timeline: [
        {
          trackId: firstTrack!.trackId,
          year: firstTrack!.year,
          earnedAtRoundNumber: 1,
          earnedBy: "placement",
        },
      ],
      timelineSize: 1,
    })

    const rounds = await ctx.db
      .query("rounds")
      .filter((q) => q.eq(q.field("gameId"), gameId))
      .collect()

    for (const round of rounds) {
      if (round.trackId !== firstTrack!.trackId) {
        await ctx.db.delete(round._id)
      }
    }
  })

  const secondTrack = await t.run(async (ctx) => {
    const { selectTrackForRound } = await import("./track_selection")
    return await selectTrackForRound(ctx, {
      gameId,
      minYear: 1980,
      maxYear: 2000,
    })
  })

  expect(secondTrack).not.toBeNull()
  expect(secondTrack!.trackId).not.toBe(firstTrack!.trackId)
})

test("selectTrackForRound returns null if no tracks available", async () => {
  const t = convexTest(schema, modules)

  await t.run(async (ctx) => {
    for (let year = 1980; year <= 1995; year += 5) {
      await ctx.db.insert("tracks", {
        title: `Song ${year}`,
        artist: "Artist",
        year,
        externalIds: { youtubeVideoId: `video${year}` },
        links: {},
        createdAt: Date.now(),
        source: "test",
      })
    }
  })

  const { gameId } = await createGameWithPlayers(t, 1980, 2000)

  const allRounds = await t.run(async (ctx) => {
    return await ctx.db
      .query("rounds")
      .filter((q) => q.eq(q.field("gameId"), gameId))
      .collect()
  })

  for (const round of allRounds) {
    await t.run(async (ctx) => {
      const game = await ctx.db.get(gameId)
      if (!game) {
        return
      }

      const players = await ctx.db
        .query("players")
        .filter((q) => q.eq(q.field("lobbyId"), game.lobbyId))
        .collect()

      for (const player of players) {
        await ctx.db.patch(player._id, {
          timeline: player.timeline.concat({
            trackId: round.trackId,
            year: 1990,
            earnedAtRoundNumber: 1,
            earnedBy: "placement" as const,
          }),
          timelineSize: player.timeline.length + 1,
        })
      }
    })
  }

  const game = await t.run(async (ctx) => {
    return await ctx.db.get(gameId)
  })

  if (game) {
    const players = await t.run(async (ctx) => {
      return await ctx.db
        .query("players")
        .filter((q) => q.eq(q.field("lobbyId"), game.lobbyId))
        .collect()
    })

    const usedTrackIds = new Set<string>()
    for (const player of players) {
      for (const entry of player.timeline) {
        usedTrackIds.add(entry.trackId)
      }
    }

    const allTracks = await t.run(async (ctx) => {
      return await ctx.db.query("tracks").collect()
    })

    for (const track of allTracks) {
      if (!usedTrackIds.has(track._id)) {
        for (const player of players) {
          await t.run(async (ctx) => {
            await ctx.db.patch(player._id, {
              timeline: player.timeline.concat({
                trackId: track._id,
                year: track.year,
                earnedAtRoundNumber: 1,
                earnedBy: "placement" as const,
              }),
              timelineSize: player.timeline.length + 1,
            })
          })
        }
        usedTrackIds.add(track._id)
      }
    }
  }

  const track = await t.run(async (ctx) => {
    const { selectTrackForRound } = await import("./track_selection")
    return await selectTrackForRound(ctx, {
      gameId,
      minYear: 1980,
      maxYear: 2000,
    })
  })

  expect(track).toBeNull()
})

test("selectTrackForRound respects year range boundaries", async () => {
  const t = convexTest(schema, modules)

  await t.run(async (ctx) => {
    for (let year = 1985; year <= 1995; year++) {
      await ctx.db.insert("tracks", {
        title: `Song ${year}`,
        artist: `Artist ${year}`,
        year,
        externalIds: { youtubeVideoId: `video${year}` },
        links: {},
        createdAt: Date.now(),
        source: "test",
      })
    }
  })

  const { gameId } = await createGameWithPlayers(t, 1985, 1995)

  const track = await t.run(async (ctx) => {
    const { selectTrackForRound } = await import("./track_selection")
    return await selectTrackForRound(ctx, {
      gameId,
      minYear: 1985,
      maxYear: 1995,
    })
  })

  expect(track).not.toBeNull()
  expect(track!.year).toBeGreaterThanOrEqual(1985)
  expect(track!.year).toBeLessThanOrEqual(1995)
})
