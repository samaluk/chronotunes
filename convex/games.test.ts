import { convexTest } from "convex-test"
import { expect, test } from "vitest"
import { api } from "./_generated/api"
import type { TimelineEntry } from "./lib/gameLogic"
import schema from "./schema"

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
  })
}

test("start creates game with active status", async () => {
  const t = convexTest(schema)

  await seedTestTracks(t)

  const { code } = await t.mutation(api.lobbies.create, {
    sessionId: "host-session-start",
    displayName: "HostStart",
  })

  await t.mutation(api.lobbies.join, {
    code,
    sessionId: "player-session-start",
    displayName: "PlayerStart",
  })

  const lobby = await t.query(api.lobbies.get, { code })

  const result = await t.mutation(api.games.start, {
    lobbyId: lobby!._id,
    sessionId: "host-session-start",
  })

  expect(result.gameId).toBeDefined()
  expect(result.roundId).toBeDefined()

  const updatedLobby = await t.query(api.lobbies.get, { code })
  expect(updatedLobby?.status).toBe("in_game")
  expect(updatedLobby?.activeGameId).toBe(result.gameId)
})

test("start randomizes turn order", async () => {
  const t = convexTest(schema)

  await seedTestTracks(t)

  const { code } = await t.mutation(api.lobbies.create, {
    sessionId: "host-session-order",
    displayName: "HostOrder",
  })

  await t.mutation(api.lobbies.join, {
    code,
    sessionId: "player1-session-order",
    displayName: "Player1",
  })

  await t.mutation(api.lobbies.join, {
    code,
    sessionId: "player2-session-order",
    displayName: "Player2",
  })

  await t.mutation(api.lobbies.join, {
    code,
    sessionId: "player3-session-order",
    displayName: "Player3",
  })

  const lobby = await t.query(api.lobbies.get, { code })

  await t.mutation(api.games.start, {
    lobbyId: lobby!._id,
    sessionId: "host-session-order",
  })

  const game = await t.query(api.games.getCurrent, { lobbyId: lobby!._id })

  expect(game).not.toBeNull()
  expect(game?.turnOrder).toHaveLength(4)
  expect(game?.turnPlayerId).toBe(game?.turnOrder[0])
})

test("start rejects when less than 2 players", async () => {
  const t = convexTest(schema)

  await seedTestTracks(t)

  const { code } = await t.mutation(api.lobbies.create, {
    sessionId: "host-session-min",
    displayName: "HostMin",
  })

  const lobby = await t.query(api.lobbies.get, { code })

  await expect(
    t.mutation(api.games.start, {
      lobbyId: lobby!._id,
      sessionId: "host-session-min",
    }),
  ).rejects.toThrow("At least 2 players are required to start a game")
})

test("start rejects when caller is not host", async () => {
  const t = convexTest(schema)

  await seedTestTracks(t)

  const { code } = await t.mutation(api.lobbies.create, {
    sessionId: "host-session-auth",
    displayName: "HostAuth",
  })

  await t.mutation(api.lobbies.join, {
    code,
    sessionId: "player-session-auth",
    displayName: "PlayerAuth",
  })

  const lobby = await t.query(api.lobbies.get, { code })

  await expect(
    t.mutation(api.games.start, {
      lobbyId: lobby!._id,
      sessionId: "player-session-auth",
    }),
  ).rejects.toThrow("Only the host can start the game")
})

test("start rejects when game already started", async () => {
  const t = convexTest(schema)

  await seedTestTracks(t)

  const { code } = await t.mutation(api.lobbies.create, {
    sessionId: "host-session-started",
    displayName: "HostStarted",
  })

  await t.mutation(api.lobbies.join, {
    code,
    sessionId: "player-session-started",
    displayName: "PlayerStarted",
  })

  const lobby = await t.query(api.lobbies.get, { code })

  await t.mutation(api.games.start, {
    lobbyId: lobby!._id,
    sessionId: "host-session-started",
  })

  await expect(
    t.mutation(api.games.start, {
      lobbyId: lobby!._id,
      sessionId: "host-session-started",
    }),
  ).rejects.toThrow("Game has already started")
})

test("start creates first round with phase placing", async () => {
  const t = convexTest(schema)

  await seedTestTracks(t)

  const { code } = await t.mutation(api.lobbies.create, {
    sessionId: "host-session-round",
    displayName: "HostRound",
  })

  await t.mutation(api.lobbies.join, {
    code,
    sessionId: "player-session-round",
    displayName: "PlayerRound",
  })

  const lobby = await t.query(api.lobbies.get, { code })

  const result = await t.mutation(api.games.start, {
    lobbyId: lobby!._id,
    sessionId: "host-session-round",
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
  const t = convexTest(schema)

  await seedTestTracks(t)

  const { code } = await t.mutation(api.lobbies.create, {
    sessionId: "host-session-turn",
    displayName: "HostTurn",
  })

  await t.mutation(api.lobbies.join, {
    code,
    sessionId: "player-session-turn",
    displayName: "PlayerTurn",
  })

  const lobby = await t.query(api.lobbies.get, { code })

  await t.mutation(api.games.start, {
    lobbyId: lobby!._id,
    sessionId: "host-session-turn",
  })

  const game = await t.query(api.games.getCurrent, { lobbyId: lobby!._id })

  expect(game?.turnPlayerId).toBeDefined()
  expect(game?.turnOrder).toContain(game?.turnPlayerId)
})

test("start creates game with correct structure", async () => {
  const t = convexTest(schema)

  await seedTestTracks(t)

  const { code } = await t.mutation(api.lobbies.create, {
    sessionId: "host-session-structure",
    displayName: "HostStructure",
  })

  await t.mutation(api.lobbies.join, {
    code,
    sessionId: "player-session-structure",
    displayName: "PlayerStructure",
  })

  const lobby = await t.query(api.lobbies.get, { code })

  const result = await t.mutation(api.games.start, {
    lobbyId: lobby!._id,
    sessionId: "host-session-structure",
  })

  const game = await t.run(async (ctx) => {
    return await ctx.db.get(result.gameId)
  })

  expect(game).not.toBeNull()
  expect(game?.status).toBe("active")
  expect(game?.startedAt).toBeDefined()
  expect(game?.currentRoundNumber).toBe(1)
  expect(game?.turnOrder).toHaveLength(2)
  expect(game?.turnPlayerId).toBe(game?.turnOrder[0])
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

test("skipTurn rejects when caller is not host", async () => {
  const t = convexTest(schema)

  await seedMoreTestTracks(t, 10)

  const { code } = await t.mutation(api.lobbies.create, {
    sessionId: "host-skip-auth",
    displayName: "HostSkipAuth",
  })

  await t.mutation(api.lobbies.join, {
    code,
    sessionId: "player-skip-auth",
    displayName: "PlayerSkipAuth",
  })

  const lobby = await t.query(api.lobbies.get, { code })

  await t.mutation(api.games.start, {
    lobbyId: lobby!._id,
    sessionId: "host-skip-auth",
  })

  await expect(
    t.mutation(api.games.skipTurn, {
      lobbyId: lobby!._id,
      sessionId: "player-skip-auth",
    }),
  ).rejects.toThrow("Only the host can skip a turn")
})

test("skipTurn rejects when no active game", async () => {
  const t = convexTest(schema)

  const { code } = await t.mutation(api.lobbies.create, {
    sessionId: "host-skip-game",
    displayName: "HostSkipGame",
  })

  const lobby = await t.query(api.lobbies.get, { code })

  await expect(
    t.mutation(api.games.skipTurn, {
      lobbyId: lobby!._id,
      sessionId: "host-skip-game",
    }),
  ).rejects.toThrow("No active game in this lobby")
})

test("skipTurn rejects when game is not active", async () => {
  const t = convexTest(schema)

  await seedTestTracks(t)

  const { code } = await t.mutation(api.lobbies.create, {
    sessionId: "host-skip-active",
    displayName: "HostSkipActive",
  })

  await t.mutation(api.lobbies.join, {
    code,
    sessionId: "player-skip-active",
    displayName: "PlayerSkipActive",
  })

  const lobby = await t.query(api.lobbies.get, { code })

  await t.mutation(api.games.start, {
    lobbyId: lobby!._id,
    sessionId: "host-skip-active",
  })

  const game = await t.query(api.games.getCurrent, { lobbyId: lobby!._id })

  await t.run(async (ctx) => {
    await ctx.db.patch(game!._id, { status: "finished" })
  })

  await expect(
    t.mutation(api.games.skipTurn, {
      lobbyId: lobby!._id,
      sessionId: "host-skip-active",
    }),
  ).rejects.toThrow("Game is not active")
})

test("skipTurn advances to next player", async () => {
  const t = convexTest(schema)

  await seedMoreTestTracks(t, 10)

  const { code } = await t.mutation(api.lobbies.create, {
    sessionId: "host-skip-advance",
    displayName: "HostSkipAdvance",
  })

  await t.mutation(api.lobbies.join, {
    code,
    sessionId: "player1-skip-advance",
    displayName: "Player1",
  })

  await t.mutation(api.lobbies.join, {
    code,
    sessionId: "player2-skip-advance",
    displayName: "Player2",
  })

  const lobby = await t.query(api.lobbies.get, { code })

  await t.mutation(api.games.start, {
    lobbyId: lobby!._id,
    sessionId: "host-skip-advance",
  })

  const gameBefore = await t.query(api.games.getCurrent, { lobbyId: lobby!._id })
  const turnPlayerIdBefore = gameBefore!.turnPlayerId!

  const result = await t.mutation(api.games.skipTurn, {
    lobbyId: lobby!._id,
    sessionId: "host-skip-advance",
  })

  expect(result.gameEnded).toBe(false)
  expect(result.nextTurnPlayerId).toBeDefined()
  expect(result.nextTurnPlayerId).not.toBe(turnPlayerIdBefore)

  const gameAfter = await t.query(api.games.getCurrent, { lobbyId: lobby!._id })

  expect(gameAfter?.turnPlayerId).toBe(result.nextTurnPlayerId)
  expect(gameAfter?.currentRoundNumber).toBe(2)
  expect(gameAfter?.currentRoundId).toBe(result.nextRoundId)
})

test("skipTurn creates new round", async () => {
  const t = convexTest(schema)

  await seedMoreTestTracks(t, 10)

  const { code } = await t.mutation(api.lobbies.create, {
    sessionId: "host-skip-round",
    displayName: "HostSkipRound",
  })

  await t.mutation(api.lobbies.join, {
    code,
    sessionId: "player-skip-round",
    displayName: "PlayerSkipRound",
  })

  const lobby = await t.query(api.lobbies.get, { code })

  await t.mutation(api.games.start, {
    lobbyId: lobby!._id,
    sessionId: "host-skip-round",
  })

  const gameBefore = await t.query(api.games.getCurrent, { lobbyId: lobby!._id })
  const roundBeforeId = gameBefore!.currentRoundId!

  const result = await t.mutation(api.games.skipTurn, {
    lobbyId: lobby!._id,
    sessionId: "host-skip-round",
  })

  expect(result.nextRoundId).toBeDefined()
  expect(result.nextRoundId).not.toBe(roundBeforeId)

  const nextRound = await t.run(async (ctx) => {
    return await ctx.db.get(result.nextRoundId!)
  })

  expect(nextRound).not.toBeNull()
  expect(nextRound?.phase).toBe("placing")
  expect(nextRound?.roundNumber).toBe(2)
  expect(nextRound?.trackId).toBeDefined()
})

test("skipTurn handles end of turn order", async () => {
  const t = convexTest(schema)

  await seedMoreTestTracks(t, 10)

  const { code } = await t.mutation(api.lobbies.create, {
    sessionId: "host-skip-end",
    displayName: "HostSkipEnd",
  })

  await t.mutation(api.lobbies.join, {
    code,
    sessionId: "player1-skip-end",
    displayName: "Player1",
  })

  await t.mutation(api.lobbies.join, {
    code,
    sessionId: "player2-skip-end",
    displayName: "Player2",
  })

  const lobby = await t.query(api.lobbies.get, { code })

  await t.mutation(api.games.start, {
    lobbyId: lobby!._id,
    sessionId: "host-skip-end",
  })

  const gameBefore = await t.query(api.games.getCurrent, { lobbyId: lobby!._id })
  const turnOrder = gameBefore!.turnOrder!
  const lastPlayerId = turnOrder.at(-1)!

  await t.run(async (ctx) => {
    await ctx.db.patch(gameBefore!._id, { turnPlayerId: lastPlayerId })
  })

  const result = await t.mutation(api.games.skipTurn, {
    lobbyId: lobby!._id,
    sessionId: "host-skip-end",
  })

  expect(result.gameEnded).toBe(false)
  expect(result.nextTurnPlayerId).toBe(turnOrder[0])
})

async function setupGameForResolve(t: ReturnType<typeof convexTest>) {
  const { code } = await t.mutation(api.lobbies.create, {
    sessionId: "host-resolve",
    displayName: "HostResolve",
  })

  await t.mutation(api.lobbies.join, {
    code,
    sessionId: "player1-resolve",
    displayName: "Player1",
  })

  await t.mutation(api.lobbies.join, {
    code,
    sessionId: "player2-resolve",
    displayName: "Player2",
  })

  const lobby = await t.query(api.lobbies.get, { code })

  await t.mutation(api.games.start, {
    lobbyId: lobby!._id,
    sessionId: "host-resolve",
  })

  const game = await t.query(api.games.getCurrent, { lobbyId: lobby!._id })

  return { code, lobbyId: lobby!._id, gameId: game!._id, game }
}

test("resolveAndNext rejects when caller is not host", async () => {
  const t = convexTest(schema)

  await seedMoreTestTracks(t, 10)

  const { lobbyId } = await setupGameForResolve(t)

  await expect(
    t.mutation(api.games.resolveAndNext, {
      lobbyId,
      sessionId: "player1-resolve",
    }),
  ).rejects.toThrow("Only the host can resolve the round")
})

test("resolveAndNext rejects when no active game", async () => {
  const t = convexTest(schema)

  const { code: code2 } = await t.mutation(api.lobbies.create, {
    sessionId: "host-resolve-game",
    displayName: "HostResolveGame",
  })

  const lobby = await t.query(api.lobbies.get, { code: code2 })

  await expect(
    t.mutation(api.games.resolveAndNext, {
      lobbyId: lobby!._id,
      sessionId: "host-resolve-game",
    }),
  ).rejects.toThrow("No active game in this lobby")
})

test("resolveAndNext rejects when game is not active", async () => {
  const t = convexTest(schema)

  await seedMoreTestTracks(t, 10)

  const { lobbyId } = await setupGameForResolve(t)

  const game = await t.query(api.games.getCurrent, { lobbyId })

  await t.run(async (ctx) => {
    await ctx.db.patch(game!._id, { status: "finished" })
  })

  await expect(
    t.mutation(api.games.resolveAndNext, {
      lobbyId,
      sessionId: "host-resolve",
    }),
  ).rejects.toThrow("Game is not active")
})

test("resolveAndNext rejects when round is not in betting phase", async () => {
  const t = convexTest(schema)

  await seedMoreTestTracks(t, 10)

  const { lobbyId } = await setupGameForResolve(t)

  await expect(
    t.mutation(api.games.resolveAndNext, {
      lobbyId,
      sessionId: "host-resolve",
    }),
  ).rejects.toThrow("Can only resolve round during betting phase")
})

test("resolveAndNext rejects when placement not submitted", async () => {
  const t = convexTest(schema)

  await seedMoreTestTracks(t, 10)

  const { lobbyId } = await setupGameForResolve(t)

  const game = await t.query(api.games.getCurrent, { lobbyId })

  await t.run(async (ctx) => {
    const round = await ctx.db.get(game!.currentRoundId!)
    await ctx.db.patch(round!._id, { phase: "betting" })
  })

  await expect(
    t.mutation(api.games.resolveAndNext, {
      lobbyId,
      sessionId: "host-resolve",
    }),
  ).rejects.toThrow("Round placement has not been submitted")
})

test("resolveAndNext adds card to turn player when correct", async () => {
  const t = convexTest(schema)

  await seedMoreTestTracks(t, 10)

  const { lobbyId } = await setupGameForResolve(t)

  const game = await t.query(api.games.getCurrent, { lobbyId })

  const turnPlayerId = game!.turnPlayerId!

  await t.run(async (ctx) => {
    const round = await ctx.db.get(game!.currentRoundId!)
    await ctx.db.patch(round!._id, {
      phase: "betting",
      placement: { proposedIndex: 0, submittedAt: Date.now() },
    })

    const player = await ctx.db.get(turnPlayerId)
    const track = await ctx.db.get(round!.trackId!)

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

  const result = await t.mutation(api.games.resolveAndNext, {
    lobbyId,
    sessionId: "host-resolve",
  })

  expect(result.gameEnded).toBe(false)

  const updatedPlayer = await t.run(async (ctx) => {
    return await ctx.db.get(turnPlayerId)
  })

  expect(updatedPlayer?.timelineSize).toBe(2)
  expect(updatedPlayer?.timeline).toHaveLength(2)
})

test("resolveAndNext discards card when turn player wrong", async () => {
  const t = convexTest(schema)

  await seedMoreTestTracks(t, 10)

  const { lobbyId } = await setupGameForResolve(t)

  const game = await t.query(api.games.getCurrent, { lobbyId })

  const turnPlayerId = game!.turnPlayerId!

  await t.run(async (ctx) => {
    const round = await ctx.db.get(game!.currentRoundId!)
    await ctx.db.patch(round!._id, {
      phase: "betting",
      placement: { proposedIndex: 100, submittedAt: Date.now() },
    })
  })

  const result = await t.mutation(api.games.resolveAndNext, {
    lobbyId,
    sessionId: "host-resolve",
  })

  expect(result.gameEnded).toBe(false)

  const updatedPlayer = await t.run(async (ctx) => {
    return await ctx.db.get(turnPlayerId)
  })

  expect(updatedPlayer?.timelineSize).toBe(0)
  expect(updatedPlayer?.timeline).toHaveLength(0)
})

test("resolveAndNext ends game when win condition met", async () => {
  const t = convexTest(schema)

  await seedMoreTestTracks(t, 20)

  const { code } = await t.mutation(api.lobbies.create, {
    sessionId: "host-win",
    displayName: "HostWin",
  })

  await t.mutation(api.lobbies.join, {
    code,
    sessionId: "player1-win",
    displayName: "Player1",
  })

  const lobby = await t.query(api.lobbies.get, { code })

  await t.mutation(api.games.start, {
    lobbyId: lobby!._id,
    sessionId: "host-win",
  })

  const game = await t.query(api.games.getCurrent, { lobbyId: lobby!._id })
  const turnPlayerId = game!.turnPlayerId!

  await t.run(async (ctx) => {
    const round = await ctx.db.get(game!.currentRoundId!)
    await ctx.db.patch(round!._id, {
      phase: "betting",
      placement: { proposedIndex: 9, submittedAt: Date.now() },
    })

    const player = await ctx.db.get(turnPlayerId)
    if (player) {
      const tracks = await ctx.db.query("tracks").collect()
      const timelineEntries: TimelineEntry[] = []
      for (let i = 0; i < Math.min(9, tracks.length); i++) {
        timelineEntries.push({
          trackId: tracks[i]!._id,
          year: tracks[i]!.year,
          earnedAtRoundNumber: 1,
          earnedBy: "placement" as const,
        })
      }
      await ctx.db.patch(player._id, {
        timeline: timelineEntries,
        timelineSize: timelineEntries.length,
      })
    }
  })

  const playerAfterSetup = await t.run(async (ctx) => {
    return await ctx.db.get(turnPlayerId)
  })

  expect(playerAfterSetup?.timelineSize).toBeGreaterThanOrEqual(9)

  const result = await t.mutation(api.games.resolveAndNext, {
    lobbyId: lobby!._id,
    sessionId: "host-win",
  })

  expect(result.gameEnded).toBe(true)
  expect(result.winnerPlayerId).toBe(turnPlayerId)

  const updatedGame = await t.query(api.games.getCurrent, { lobbyId: lobby!._id })
  expect(updatedGame?.status).toBe("finished")
  expect(updatedGame?.winnerPlayerId).toBe(turnPlayerId)
})

test("resolveAndNext creates next round after resolution", async () => {
  const t = convexTest(schema)

  await seedMoreTestTracks(t, 20)

  const { lobbyId } = await setupGameForResolve(t)

  const game = await t.query(api.games.getCurrent, { lobbyId })
  const oldRoundId = game!.currentRoundId!
  const oldTurnPlayerId = game!.turnPlayerId!

  const turnOrder = game!.turnOrder!
  const currentTurnIndex = turnOrder.indexOf(oldTurnPlayerId)
  const nextTurnIndex = (currentTurnIndex + 1) % turnOrder.length
  const expectedNextTurnPlayerId = turnOrder[nextTurnIndex]!

  await t.run(async (ctx) => {
    const round = await ctx.db.get(oldRoundId)
    await ctx.db.patch(round!._id, {
      phase: "betting",
      placement: { proposedIndex: 0, submittedAt: Date.now() },
    })
  })

  const result = await t.mutation(api.games.resolveAndNext, {
    lobbyId,
    sessionId: "host-resolve",
  })

  expect(result.gameEnded).toBe(false)
  expect(result.nextRoundId).toBeDefined()
  expect(result.nextRoundId).not.toBe(oldRoundId)
  expect(result.nextTurnPlayerId).toBe(expectedNextTurnPlayerId)

  const updatedGame = await t.query(api.games.getCurrent, { lobbyId })
  expect(updatedGame?.currentRoundId).toBe(result.nextRoundId)
  expect(updatedGame?.currentRoundNumber).toBe(2)
  expect(updatedGame?.turnPlayerId).toBe(expectedNextTurnPlayerId)

  const nextRound = await t.run(async (ctx) => {
    return await ctx.db.get(result.nextRoundId!)
  })
  expect(nextRound?.phase).toBe("placing")
  expect(nextRound?.roundNumber).toBe(2)
})

test("resolveAndNext handles betting outcomes correctly", async () => {
  const t = convexTest(schema)

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
      placement: { proposedIndex: 0, submittedAt: Date.now() },
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
      coins: 3,
    })

    const otherPlayer = await ctx.db.get(nonTurnPlayerId)
    await ctx.db.patch(otherPlayer!._id, { coins: 3 })
  })

  await t.mutation(api.bets.preview, {
    lobbyId,
    sessionId: nonTurnSessionId,
    proposedIndex: 1,
  })

  await t.mutation(api.bets.lockIn, {
    lobbyId,
    sessionId: nonTurnSessionId,
  })

  const result = await t.mutation(api.games.resolveAndNext, {
    lobbyId,
    sessionId: "host-resolve",
  })

  expect(result.gameEnded).toBe(false)

  const updatedOtherPlayer = await t.run(async (ctx) => {
    return await ctx.db.get(nonTurnPlayerId)
  })

  expect(updatedOtherPlayer?.coins).toBe(2)
})

test("resolveAndNext awards card to bettor when turn player wrong and bettor correct", async () => {
  const t = convexTest(schema)

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
    sessionId: nonTurnSessionId,
    proposedIndex: 0,
  })

  await t.mutation(api.bets.lockIn, {
    lobbyId,
    sessionId: nonTurnSessionId,
  })

  const result = await t.mutation(api.games.resolveAndNext, {
    lobbyId,
    sessionId: "host-resolve",
  })

  expect(result.gameEnded).toBe(false)

  const updatedOtherPlayer = await t.run(async (ctx) => {
    return await ctx.db.get(nonTurnPlayerId)
  })

  expect(updatedOtherPlayer?.timelineSize).toBe(1)
  expect(updatedOtherPlayer?.timeline).toHaveLength(1)
  expect(updatedOtherPlayer?.coins).toBe(2)
})

test("resolveAndNext sets round phase to resolved", async () => {
  const t = convexTest(schema)

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

  await t.mutation(api.games.resolveAndNext, {
    lobbyId,
    sessionId: "host-resolve",
  })

  const updatedRound = await t.run(async (ctx) => {
    return await ctx.db.get(game!.currentRoundId!)
  })

  expect(updatedRound?.phase).toBe("resolved")
  expect(updatedRound?.resolution).toBeDefined()
  expect(updatedRound?.resolution?.resolvedAt).toBeDefined()
})

test("resolveAndNext handles empty betting phase", async () => {
  const t = convexTest(schema)

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

  const result = await t.mutation(api.games.resolveAndNext, {
    lobbyId,
    sessionId: "host-resolve",
  })

  expect(result.gameEnded).toBe(false)
  expect(result.nextRoundId).toBeDefined()
})

test("resolveAndNext handles no tracks available", async () => {
  const t = convexTest(schema)

  await t.run(async (ctx) => {
    await ctx.db.insert("tracks", {
      title: "Only Track",
      artist: "Test Artist",
      year: 1980,
      externalIds: { youtubeVideoId: "abc123" },
      links: {},
      createdAt: Date.now(),
      source: "test",
    })
  })

  const { code } = await t.mutation(api.lobbies.create, {
    sessionId: "host-notracks",
    displayName: "HostNoTracks",
  })

  await t.mutation(api.lobbies.join, {
    code,
    sessionId: "player1-notracks",
    displayName: "Player1",
  })

  const lobby = await t.query(api.lobbies.get, { code })

  await t.mutation(api.games.start, {
    lobbyId: lobby!._id,
    sessionId: "host-notracks",
  })

  const game = await t.query(api.games.getCurrent, { lobbyId: lobby!._id })

  await t.run(async (ctx) => {
    const round = await ctx.db.get(game!.currentRoundId!)
    await ctx.db.patch(round!._id, {
      phase: "betting",
      placement: { proposedIndex: 0, submittedAt: Date.now() },
    })
  })

  const result = await t.mutation(api.games.resolveAndNext, {
    lobbyId: lobby!._id,
    sessionId: "host-notracks",
  })

  expect(result.gameEnded).toBe(true)
  expect(result.winnerPlayerId).toBeNull()
  expect(result.noTracksAvailable).toBe(true)
})
