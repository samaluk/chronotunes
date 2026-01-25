import presenceTest from "@convex-dev/presence/test"
import { convexTest } from "convex-test"
import { describe, expect, test } from "vitest"
import { api, internal } from "./_generated/api"
import { asSessionId } from "./lib/sessions"
import schema from "./schema"
import { modules } from "./test.setup"

const { register } = presenceTest

describe("checkHostDisconnect", () => {
  test("skips lobbies without deadline", async () => {
    const t = convexTest(schema, modules)
    register(t)

    await t.mutation(api.lobbies.create, {
      sessionId: asSessionId("host-session-no-deadline"),
      displayName: "HostNoDeadline",
    })

    await t.mutation(internal.host_disconnect.checkHostTransfer, {})

    const lobby = await t.run(async (ctx) => {
      const lobbies = await ctx.db.query("lobbies").collect()
      return lobbies[0]
    })
    expect(lobby?.hostSessionId).toBe("host-session-no-deadline")
    expect(lobby?.hostTransferDeadline).toBeUndefined()
  })

  test("skips lobbies with future deadline", async () => {
    const t = convexTest(schema, modules)
    presenceTest.register(t)

    await t.mutation(api.lobbies.create, {
      sessionId: asSessionId("host-session-future"),
      displayName: "HostFuture",
    })

    await t.run(async (ctx) => {
      const lobby = await ctx.db.query("lobbies").first()
      if (lobby) {
        await ctx.db.patch(lobby._id, {
          hostTransferDeadline: Date.now() + 60_000,
        })
      }
    })

    await t.mutation(internal.host_disconnect.checkHostTransfer, {})

    const lobby = await t.run(async (ctx) => {
      const lobbies = await ctx.db.query("lobbies").collect()
      return lobbies[0]
    })
    expect(lobby?.hostSessionId).toBe("host-session-future")
  })
})

describe("checkHostTransfer with presence", () => {
  test("transfers host to random online player after deadline", async () => {
    const t = convexTest(schema, modules)
    register(t)

    const { code } = await t.mutation(api.lobbies.create, {
      sessionId: asSessionId("host-session-transfer"),
      displayName: "HostTransfer",
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

    const lobbyInfo = await t.query(api.lobbies.get, { code })

    await t.mutation(api.presence.sendHeartbeat, {
      roomId: lobbyInfo!._id,
      userId: "player1-session",
      sessionId: "player1-session",
    })

    await t.mutation(api.presence.sendHeartbeat, {
      roomId: lobbyInfo!._id,
      userId: "player2-session",
      sessionId: "player2-session",
    })

    await t.run(async (ctx) => {
      const lobby = await ctx.db.query("lobbies").first()
      if (lobby) {
        await ctx.db.patch(lobby._id, {
          hostTransferDeadline: Date.now() - 1000,
        })
      }
    })

    await t.mutation(internal.host_disconnect.checkHostTransfer, {})

    const players = await t.run(async (ctx) => {
      const allPlayers = await ctx.db.query("players").collect()
      return allPlayers
    })

    const newHost = players.find((p) => p.isHost)
    expect(newHost).not.toBeUndefined()
    expect(newHost?.sessionId).not.toBe("host-session-transfer")

    const lobby = await t.run(async (ctx) => {
      const lobbies = await ctx.db.query("lobbies").collect()
      return lobbies[0]
    })
    expect(lobby?.hostSessionId).toBe(newHost?.sessionId)
    expect(lobby?.hostTransferDeadline).toBeUndefined()
  })

  test("does not transfer when no online players", async () => {
    const t = convexTest(schema, modules)
    presenceTest.register(t)

    const { code } = await t.mutation(api.lobbies.create, {
      sessionId: asSessionId("host-session-offline"),
      displayName: "HostOffline",
    })

    await t.mutation(api.lobbies.join, {
      code,
      sessionId: asSessionId("player1-offline"),
      displayName: "Player1Offline",
    })

    await t.run(async (ctx) => {
      const lobby = await ctx.db.query("lobbies").first()
      if (lobby) {
        await ctx.db.patch(lobby._id, {
          hostTransferDeadline: Date.now() - 1000,
        })
      }
    })

    await t.mutation(internal.host_disconnect.checkHostTransfer, {})

    const lobby = await t.run(async (ctx) => {
      const lobbies = await ctx.db.query("lobbies").collect()
      return lobbies[0]
    })
    expect(lobby?.hostSessionId).toBe("host-session-offline")
    expect(lobby?.hostTransferDeadline).toBeDefined()
  })

  test("resumes paused game after host transfer", async () => {
    const t = convexTest(schema, modules)
    presenceTest.register(t)

    const { code } = await t.mutation(api.lobbies.create, {
      sessionId: asSessionId("host-session-paused"),
      displayName: "HostPaused",
    })

    await t.mutation(api.lobbies.join, {
      code,
      sessionId: asSessionId("player1-paused"),
      displayName: "Player1Paused",
    })

    const lobbyInfo = await t.query(api.lobbies.get, { code })

    await t.mutation(api.presence.sendHeartbeat, {
      roomId: lobbyInfo!._id,
      userId: "player1-paused",
      sessionId: "player1-paused",
    })

    await t.run(async (ctx) => {
      const lobby = await ctx.db.query("lobbies").first()
      if (lobby) {
        const players = await ctx.db.query("players").collect()
        const firstPlayer = players[0]
        if (firstPlayer) {
          const gameId = await ctx.db.insert("games", {
            lobbyId: lobby._id,
            status: "paused",
            startedAt: Date.now(),
            currentRoundNumber: 1,
            turnOrder: [firstPlayer._id],
            turnPlayerId: firstPlayer._id,
          })
          await ctx.db.patch(lobby._id, {
            status: "in_game",
            activeGameId: gameId,
            hostTransferDeadline: Date.now() - 1000,
          })
        }
      }
    })

    await t.mutation(internal.host_disconnect.checkHostTransfer, {})

    const game = await t.run(async (ctx) => {
      const games = await ctx.db.query("games").collect()
      return games[0]
    })
    expect(game?.status).toBe("active")
  })

  test("clears hostTransferDeadline after successful transfer", async () => {
    const t = convexTest(schema, modules)
    presenceTest.register(t)

    const { code } = await t.mutation(api.lobbies.create, {
      sessionId: asSessionId("host-session-clear"),
      displayName: "HostClear",
    })

    await t.mutation(api.lobbies.join, {
      code,
      sessionId: asSessionId("player-clear"),
      displayName: "PlayerClear",
    })

    const lobbyInfo = await t.query(api.lobbies.get, { code })

    await t.mutation(api.presence.sendHeartbeat, {
      roomId: lobbyInfo!._id,
      userId: "player-clear",
      sessionId: "player-clear",
    })

    await t.run(async (ctx) => {
      const lobby = await ctx.db.query("lobbies").first()
      if (lobby) {
        await ctx.db.patch(lobby._id, {
          hostTransferDeadline: Date.now() - 1000,
        })
      }
    })

    await t.mutation(internal.host_disconnect.checkHostTransfer, {})

    const lobby = await t.run(async (ctx) => {
      const lobbies = await ctx.db.query("lobbies").collect()
      return lobbies[0]
    })
    expect(lobby?.hostTransferDeadline).toBeUndefined()
  })

  test("original host can rejoin as regular player after failover", async () => {
    const t = convexTest(schema, modules)
    presenceTest.register(t)

    const { code } = await t.mutation(api.lobbies.create, {
      sessionId: asSessionId("original-host-session"),
      displayName: "OriginalHost",
    })

    await t.mutation(api.lobbies.join, {
      code,
      sessionId: asSessionId("new-host-session"),
      displayName: "NewHost",
    })

    await t.run(async (ctx) => {
      const lobby = await ctx.db.query("lobbies").first()
      if (lobby) {
        await ctx.db.patch(lobby._id, {
          hostTransferDeadline: Date.now() - 1000,
        })
      }
    })

    await t.mutation(internal.host_disconnect.checkHostTransfer)

    await t.mutation(api.lobbies.leave, {
      code,
      sessionId: asSessionId("original-host-session"),
    })

    await t.mutation(api.lobbies.join, {
      code,
      sessionId: asSessionId("original-host-session"),
      displayName: "OriginalHost",
    })

    const players = await t.run(async (ctx) => {
      const allPlayers = await ctx.db.query("players").collect()
      return allPlayers
    })

    const originalHost = players.find((p) => p.sessionId === "original-host-session")
    expect(originalHost).not.toBeUndefined()
    expect(originalHost?.isHost).toBe(false)
  })
})
