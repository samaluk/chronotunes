import { convexTest } from "convex-test"
import { expect, test } from "vitest"
import { api } from "./_generated/api"
import type { Id } from "./_generated/dataModel"
import { asSessionId } from "./lib/sessions"
import schema from "./schema"
import { modules } from "./test.setup"

async function seedTestTracks(t: ReturnType<typeof convexTest>) {
  await t.run(async (ctx) => {
    await ctx.db.insert("tracks", {
      title: "Test Song 1",
      artist: "Test Artist 1",
      year: 1980,
      externalIds: { youtubeVideoId: "abc123" },
      links: {},
      createdAt: Date.now(),
      source: "test",
    })
    await ctx.db.insert("tracks", {
      title: "Test Song 2",
      artist: "Test Artist 2",
      year: 1990,
      externalIds: { youtubeVideoId: "def456" },
      links: {},
      createdAt: Date.now(),
      source: "test",
    })
    await ctx.db.insert("tracks", {
      title: "Test Song 3",
      artist: "Test Artist 3",
      year: 2000,
      externalIds: { youtubeVideoId: "ghi789" },
      links: {},
      createdAt: Date.now(),
      source: "test",
    })
    await ctx.db.insert("tracks", {
      title: "Test Song 4",
      artist: "Test Artist 4",
      year: 2010,
      externalIds: { youtubeVideoId: "jkl012" },
      links: {},
      createdAt: Date.now(),
      source: "test",
    })
    await ctx.db.insert("tracks", {
      title: "Test Song 5",
      artist: "Test Artist 5",
      year: 2020,
      externalIds: { youtubeVideoId: "mno345" },
      links: {},
      createdAt: Date.now(),
      source: "test",
    })
  })
}

test("start creates game with active status", async () => {
  const t = convexTest(schema, modules)

  await seedTestTracks(t)

  const { code } = await t.mutation(api.lobbies.create, {
    sessionId: asSessionId("host-session-start"),
    displayName: "HostStart",
  })

  await t.mutation(api.lobbies.join, {
    code,
    sessionId: asSessionId("player-session-start"),
    displayName: "PlayerStart",
  })

  const lobby = await t.query(api.lobbies.get, { code })

  const result = await t.mutation(api.games.start, {
    lobbyId: lobby!._id,
    sessionId: asSessionId("host-session-start"),
  })

  expect(result.gameId).toBeDefined()
  expect(result.roundId).toBeDefined()

  const updatedLobby = await t.query(api.lobbies.get, { code })
  expect(updatedLobby?.status).toBe("in_game")
  expect(updatedLobby?.activeGameId).toBe(result.gameId)
})

test("start randomizes turn order", async () => {
  const t = convexTest(schema, modules)

  await seedTestTracks(t)

  const { code } = await t.mutation(api.lobbies.create, {
    sessionId: asSessionId("host-session-order"),
    displayName: "HostOrder",
  })

  await t.mutation(api.lobbies.join, {
    code,
    sessionId: asSessionId("player1-session-order"),
    displayName: "Player1",
  })

  await t.mutation(api.lobbies.join, {
    code,
    sessionId: asSessionId("player2-session-order"),
    displayName: "Player2",
  })

  await t.mutation(api.lobbies.join, {
    code,
    sessionId: asSessionId("player3-session-order"),
    displayName: "Player3",
  })

  const lobby = await t.query(api.lobbies.get, { code })

  await t.mutation(api.games.start, {
    lobbyId: lobby!._id,
    sessionId: asSessionId("host-session-order"),
  })

  const game = await t.query(api.games.getCurrent, { lobbyId: lobby!._id })

  expect(game).not.toBeNull()
  expect(game?.turnOrder).toHaveLength(4)
  expect(game?.turnOrder).toContain(game?.turnPlayerId)
})

test("start rejects when less than 2 players", async () => {
  const t = convexTest(schema, modules)

  await seedTestTracks(t)

  const { code } = await t.mutation(api.lobbies.create, {
    sessionId: asSessionId("host-session-min"),
    displayName: "HostMin",
  })

  const lobby = await t.query(api.lobbies.get, { code })

  await expect(
    t.mutation(api.games.start, {
      lobbyId: lobby!._id,
      sessionId: asSessionId("host-session-min"),
    }),
  ).rejects.toThrow("At least 2 players are required to start a game")
})

test("start rejects when caller is not host", async () => {
  const t = convexTest(schema, modules)

  await seedTestTracks(t)

  const { code } = await t.mutation(api.lobbies.create, {
    sessionId: asSessionId("host-session-auth"),
    displayName: "HostAuth",
  })

  await t.mutation(api.lobbies.join, {
    code,
    sessionId: asSessionId("player-session-auth"),
    displayName: "PlayerAuth",
  })

  const lobby = await t.query(api.lobbies.get, { code })

  await expect(
    t.mutation(api.games.start, {
      lobbyId: lobby!._id,
      sessionId: asSessionId("player-session-auth"),
    }),
  ).rejects.toThrow("Only the host can start the game")
})

test("start rejects when game already started", async () => {
  const t = convexTest(schema, modules)

  await seedTestTracks(t)

  const { code } = await t.mutation(api.lobbies.create, {
    sessionId: asSessionId("host-session-started"),
    displayName: "HostStarted",
  })

  await t.mutation(api.lobbies.join, {
    code,
    sessionId: asSessionId("player-session-started"),
    displayName: "PlayerStarted",
  })

  const lobby = await t.query(api.lobbies.get, { code })

  await t.mutation(api.games.start, {
    lobbyId: lobby!._id,
    sessionId: asSessionId("host-session-started"),
  })

  await expect(
    t.mutation(api.games.start, {
      lobbyId: lobby!._id,
      sessionId: asSessionId("host-session-started"),
    }),
  ).rejects.toThrow("Game has already started")
})

test("start creates first round with phase placing", async () => {
  const t = convexTest(schema, modules)

  await seedTestTracks(t)

  const { code } = await t.mutation(api.lobbies.create, {
    sessionId: asSessionId("host-session-round"),
    displayName: "HostRound",
  })

  await t.mutation(api.lobbies.join, {
    code,
    sessionId: asSessionId("player-session-round"),
    displayName: "PlayerRound",
  })

  const lobby = await t.query(api.lobbies.get, { code })

  const result = await t.mutation(api.games.start, {
    lobbyId: lobby!._id,
    sessionId: asSessionId("host-session-round"),
  })

  const game = await t.run(async (ctx) => {
    return await ctx.db.get(result.gameId)
  })

  expect(game?.currentRoundId).toBe(result.roundId)
  expect(game?.currentRoundNumber).toBe(1)

  const round = await t.run(async (ctx) => {
    return await ctx.db.get(result.roundId)
  })

  expect(round).not.toBeNull()
  expect(round?.phase).toBe("placing")
  expect(round?.roundNumber).toBe(1)
})

test("start sets turnPlayerId correctly", async () => {
  const t = convexTest(schema, modules)

  await seedTestTracks(t)

  const { code } = await t.mutation(api.lobbies.create, {
    sessionId: asSessionId("host-session-turn"),
    displayName: "HostTurn",
  })

  await t.mutation(api.lobbies.join, {
    code,
    sessionId: asSessionId("player-session-turn"),
    displayName: "PlayerTurn",
  })

  const lobby = await t.query(api.lobbies.get, { code })

  await t.mutation(api.games.start, {
    lobbyId: lobby!._id,
    sessionId: asSessionId("host-session-turn"),
  })

  const game = await t.query(api.games.getCurrent, { lobbyId: lobby!._id })

  expect(game?.turnPlayerId).toBeDefined()
  expect(game?.turnOrder).toContain(game?.turnPlayerId)
})

test("start creates game with correct structure", async () => {
  const t = convexTest(schema, modules)

  await seedTestTracks(t)

  const { code } = await t.mutation(api.lobbies.create, {
    sessionId: asSessionId("host-session-structure"),
    displayName: "HostStructure",
  })

  await t.mutation(api.lobbies.join, {
    code,
    sessionId: asSessionId("player-session-structure"),
    displayName: "PlayerStructure",
  })

  const lobby = await t.query(api.lobbies.get, { code })

  const result = await t.mutation(api.games.start, {
    lobbyId: lobby!._id,
    sessionId: asSessionId("host-session-structure"),
  })

  const game = await t.run(async (ctx) => {
    return await ctx.db.get(result.gameId)
  })

  expect(game).not.toBeNull()
  expect(game?.status).toBe("active")
  expect(game?.startedAt).toBeDefined()
  expect(game?.currentRoundNumber).toBe(1)
  expect(game?.turnOrder).toHaveLength(2)
  expect(game?.turnOrder).toContain(game?.turnPlayerId)
  expect(game?.winnerPlayerId).toBeUndefined()
  expect(game?.endedAt).toBeUndefined()
})

async function seedMoreTestTracks(t: ReturnType<typeof convexTest>, count = 10) {
  await t.run(async (ctx) => {
    for (let i = 0; i < count; i++) {
      const year = 1950 + i * 5
      await ctx.db.insert("tracks", {
        title: `Test Song ${i}`,
        artist: `Test Artist ${i}`,
        year,
        externalIds: { youtubeVideoId: `abc${i}` },
        links: {},
        createdAt: Date.now(),
        source: "test",
      })
    }
  })
}

async function setupGameForResolve(t: ReturnType<typeof convexTest>) {
  const { code } = await t.mutation(api.lobbies.create, {
    sessionId: asSessionId("host-resolve"),
    displayName: "HostResolve",
  })

  await t.mutation(api.lobbies.join, {
    code,
    sessionId: asSessionId("player1-resolve"),
    displayName: "PlayerResolve",
  })

  const lobby = await t.query(api.lobbies.get, { code })

  await t.mutation(api.games.start, {
    lobbyId: lobby!._id,
    sessionId: asSessionId("host-resolve"),
  })

  const game = await t.query(api.games.getCurrent, { lobbyId: lobby!._id })
  const _roundId = game!.currentRoundId!

  await t.run(async (ctx) => {
    const round = await ctx.db.get(game!.currentRoundId!)
    const track = round ? await ctx.db.get(round.trackId) : null

    if (!(round && track)) {
      return
    }

    const turnPlayer = await ctx.db.get(round.turnPlayerId)

    if (turnPlayer && turnPlayer.timeline.length === 0) {
      await ctx.db.patch(turnPlayer._id, {
        timeline: [
          {
            trackId: track._id,
            year: track.year,
            earnedAtRoundNumber: round.roundNumber,
            earnedBy: "placement",
          },
        ],
        timelineSize: 1,
      })
    }
  })

  return { lobbyId: lobby!._id }
}

async function placeDummyBets(t: ReturnType<typeof convexTest>, lobbyId: string) {
  const game = await t.query(api.games.getCurrent, { lobbyId: lobbyId as Id<"lobbies"> })
  const turnPlayerId = game!.turnPlayerId!

  const players = await t.run(async (ctx) => {
    return await ctx.db
      .query("players")
      .filter((q) => q.eq(q.field("lobbyId"), lobbyId))
      .collect()
  })

  const round = await t.run(async (ctx) => {
    return await ctx.db.get(game!.currentRoundId!)
  })

  const placementIndex = round?.placement?.proposedIndex ?? 0
  const proposedIndex = placementIndex === 0 ? 1 : 0

  for (const player of players) {
    if (player._id === turnPlayerId) {
      continue
    }

    await t.mutation(api.bets.preview, {
      lobbyId: lobbyId as Id<"lobbies">,
      sessionId: asSessionId(player.sessionId),
      proposedIndex,
    })

    await t.mutation(api.bets.lockIn, {
      lobbyId: lobbyId as Id<"lobbies">,
      sessionId: asSessionId(player.sessionId),
    })
  }
}

async function declineAllNonTurnPlayers(t: ReturnType<typeof convexTest>, lobbyId: string) {
  const game = await t.query(api.games.getCurrent, { lobbyId: lobbyId as Id<"lobbies"> })
  const turnPlayerId = game!.turnPlayerId!

  const players = await t.run(async (ctx) => {
    return await ctx.db
      .query("players")
      .filter((q) => q.eq(q.field("lobbyId"), lobbyId))
      .collect()
  })

  for (const player of players) {
    if (player._id === turnPlayerId) {
      continue
    }

    await t.mutation(api.rounds.declineBet, {
      lobbyId: lobbyId as Id<"lobbies">,
      sessionId: asSessionId(player.sessionId),
    })
  }
}

test("skipTurn rejects when caller is not host", async () => {
  const t = convexTest(schema, modules)

  await seedMoreTestTracks(t, 10)

  const { code } = await t.mutation(api.lobbies.create, {
    sessionId: asSessionId("host-skip-auth"),
    displayName: "HostSkipAuth",
  })

  await t.mutation(api.lobbies.join, {
    code,
    sessionId: asSessionId("player-skip-auth"),
    displayName: "PlayerSkipAuth",
  })

  const lobby = await t.query(api.lobbies.get, { code })

  await t.mutation(api.games.start, {
    lobbyId: lobby!._id,
    sessionId: asSessionId("host-skip-auth"),
  })

  await expect(
    t.mutation(api.games.skipTurn, {
      lobbyId: lobby!._id,
      sessionId: asSessionId("player-skip-auth"),
    }),
  ).rejects.toThrow("Only the host can skip a turn")
})

test("skipTurn rejects when no active game", async () => {
  const t = convexTest(schema, modules)

  const { code } = await t.mutation(api.lobbies.create, {
    sessionId: asSessionId("host-skip-game"),
    displayName: "HostSkipGame",
  })

  const lobby = await t.query(api.lobbies.get, { code })

  await expect(
    t.mutation(api.games.skipTurn, {
      lobbyId: lobby!._id,
      sessionId: asSessionId("host-skip-game"),
    }),
  ).rejects.toThrow("No active game in this lobby")
})

test("skipTurn rejects when game is not active", async () => {
  const t = convexTest(schema, modules)

  await seedMoreTestTracks(t, 10)

  const { lobbyId } = await setupGameForResolve(t)

  const game = await t.query(api.games.getCurrent, { lobbyId })

  await t.run(async (ctx) => {
    await ctx.db.patch(game!._id, { status: "finished" })
  })

  await expect(
    t.mutation(api.games.skipTurn, {
      lobbyId,
      sessionId: asSessionId("host-resolve"),
    }),
  ).rejects.toThrow("Game is not active")
})

test("skipTurn advances to next player", async () => {
  const t = convexTest(schema, modules)

  await seedMoreTestTracks(t, 10)

  const { lobbyId } = await setupGameForResolve(t)

  const game = await t.query(api.games.getCurrent, { lobbyId })

  const turnPlayerId = game!.turnPlayerId!

  const nonTurnPlayerId = game!.turnOrder.find((id) => id !== turnPlayerId)!

  const nonTurnPlayer = await t.run(async (ctx) => {
    return await ctx.db.get(nonTurnPlayerId)
  })

  const nonTurnSessionId = nonTurnPlayer?.sessionId ?? "player1-resolve"

  await t.run(async (ctx) => {
    const round = await ctx.db.get(game!.currentRoundId!)
    const track = await ctx.db.get(round!.trackId!)

    await ctx.db.patch(round!._id, {
      phase: "betting",
      placement: { proposedIndex: 100, submittedAt: Date.now() },
    })

    const player = await ctx.db.get(turnPlayerId)
    await ctx.db.patch(player!._id, {
      timeline: [
        {
          trackId: track!._id,
          year: track!.year + 10,
          earnedAtRoundNumber: 1,
          earnedBy: "placement",
        },
      ],
      timelineSize: 1,
    })
  })

  await t.mutation(api.bets.preview, {
    lobbyId,
    sessionId: asSessionId(nonTurnSessionId),
    proposedIndex: 0,
  })

  await t.mutation(api.bets.lockIn, {
    lobbyId,
    sessionId: asSessionId(nonTurnSessionId),
  })

  await t.mutation(api.games.resolveRound, {
    lobbyId,
    sessionId: asSessionId("host-resolve"),
  })

  const updatedOtherPlayer = await t.run(async (ctx) => {
    return await ctx.db.get(nonTurnPlayerId)
  })

  expect(updatedOtherPlayer?.timelineSize).toBe(2)
  expect(updatedOtherPlayer?.timeline).toHaveLength(2)
  expect(updatedOtherPlayer?.coins).toBe(2)
})

test("resolveAndNext sets round phase to resolved", async () => {
  const t = convexTest(schema, modules)

  await seedMoreTestTracks(t, 10)

  const { lobbyId } = await setupGameForResolve(t)

  const game = await t.query(api.games.getCurrent, { lobbyId })
  const roundId = game!.currentRoundId!

  await t.run(async (ctx) => {
    const round = await ctx.db.get(roundId)
    await ctx.db.patch(round!._id, {
      phase: "betting",
      placement: { proposedIndex: 0, submittedAt: Date.now() },
    })
  })

  await placeDummyBets(t, lobbyId)

  await t.mutation(api.games.resolveRound, {
    lobbyId,
    sessionId: asSessionId("host-resolve"),
  })

  const updatedRound = await t.run(async (ctx) => {
    return await ctx.db.get(game!.currentRoundId!)
  })

  expect(updatedRound?.phase).toBe("resolved")
  expect(updatedRound?.resolution).toBeDefined()
  expect(updatedRound?.resolution?.resolvedAt).toBeDefined()
})

test("resolveAndNext handles empty betting phase", async () => {
  const t = convexTest(schema, modules)

  await seedMoreTestTracks(t, 10)

  const { lobbyId } = await setupGameForResolve(t)

  const game = await t.query(api.games.getCurrent, { lobbyId })

  await t.run(async (ctx) => {
    const round = await ctx.db.get(game!.currentRoundId!)
    await ctx.db.patch(round!._id, {
      phase: "betting",
      placement: { proposedIndex: 0, submittedAt: Date.now() },
    })
  })

  await declineAllNonTurnPlayers(t, lobbyId)

  await t.mutation(api.games.resolveRound, {
    lobbyId,
    sessionId: asSessionId("host-resolve"),
  })

  const result = await t.mutation(api.games.resolveAndNext, {
    lobbyId,
    sessionId: asSessionId("host-resolve"),
  })

  expect(result.gameEnded).toBe(false)
  expect(result.nextRoundId).toBeDefined()
})

test("resolveAndNext handles no tracks available", async () => {
  const t = convexTest(schema, modules)

  await t.run(async (ctx) => {
    for (let i = 0; i < 3; i++) {
      await ctx.db.insert("tracks", {
        title: `Track ${i}`,
        artist: "Test Artist",
        year: 1980 + i,
        externalIds: { youtubeVideoId: `abc${i}` },
        links: {},
        createdAt: Date.now(),
        source: "test",
      })
    }
  })

  const { code } = await t.mutation(api.lobbies.create, {
    sessionId: asSessionId("host-notracks"),
    displayName: "HostNoTracks",
  })

  await t.mutation(api.lobbies.join, {
    code,
    sessionId: asSessionId("player1-notracks"),
    displayName: "Player1",
  })

  const lobby = await t.query(api.lobbies.get, { code })

  await t.mutation(api.games.start, {
    lobbyId: lobby!._id,
    sessionId: asSessionId("host-notracks"),
  })

  const game = await t.query(api.games.getCurrent, { lobbyId: lobby!._id })
  const roundId = game!.currentRoundId!

  await t.run(async (ctx) => {
    const round = await ctx.db.get(game!.currentRoundId!)
    await ctx.db.patch(round!._id, {
      phase: "betting",
      placement: { proposedIndex: 0, submittedAt: Date.now() },
    })
  })

  await placeDummyBets(t, lobby!._id)

  await t.mutation(api.games.resolveRound, {
    lobbyId: lobby!._id,
    sessionId: asSessionId("host-notracks"),
  })

  const resolvedRound = await t.run(async (ctx) => {
    return await ctx.db.get(roundId)
  })
  expect(resolvedRound?.phase).toBe("resolved")

  const result = await t.mutation(api.games.resolveAndNext, {
    lobbyId: lobby!._id,
    sessionId: asSessionId("host-notracks"),
  })

  expect(result.gameEnded).toBe(true)
  expect(result.winnerPlayerId).toBeNull()
  expect(result.noTracksAvailable).toBe(true)
})
