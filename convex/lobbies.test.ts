import { convexTest } from "convex-test"
import { describe, expect, test } from "vitest"
import { api } from "./_generated/api"
import { asSessionId } from "./lib/sessions"
import schema from "./schema"
import { modules } from "./test.setup"

describe("lobbies", () => {
  test("create lobby generates 6-char code", async () => {
    const t = convexTest(schema, modules)
    const result = await t.mutation(api.lobbies.create, {
      sessionId: asSessionId("test-session-123"),
      displayName: "TestHost",
    })
    expect(result.code).toHaveLength(6)
  })

  test("create lobby returns alphanumeric code only", async () => {
    const t = convexTest(schema, modules)
    const result = await t.mutation(api.lobbies.create, {
      sessionId: asSessionId("test-session-456"),
      displayName: "AnotherHost",
    })
    expect(result.code).toMatch(/^[A-Z2345679]+$/)
  })

  test("create lobby creates lobby with status lobby", async () => {
    const t = convexTest(schema, modules)
    await t.mutation(api.lobbies.create, {
      sessionId: asSessionId("test-session-789"),
      displayName: "StatusHost",
    })

    const lobby = await t.run(async (ctx) => {
      const lobbies = await ctx.db.query("lobbies").collect()
      return lobbies[0]
    })
    expect(lobby).not.toBeNull()
    expect(lobby?.status).toBe("lobby")
  })

  test("create lobby creates host player with isHost true", async () => {
    const t = convexTest(schema, modules)
    await t.mutation(api.lobbies.create, {
      sessionId: asSessionId("test-session-host"),
      displayName: "HostPlayer",
    })

    const players = await t.run(async (ctx) => {
      const allPlayers = await ctx.db.query("players").collect()
      return allPlayers
    })

    expect(players).toHaveLength(1)
    expect(players[0]?.isHost).toBe(true)
    expect(players[0]?.displayName).toBe("HostPlayer")
  })

  test("create lobby creates host with default starting coins", async () => {
    const t = convexTest(schema, modules)
    await t.mutation(api.lobbies.create, {
      sessionId: asSessionId("test-session-coins"),
      displayName: "CoinsHost",
    })

    const players = await t.run(async (ctx) => {
      const allPlayers = await ctx.db.query("players").collect()
      return allPlayers
    })

    expect(players[0]?.coins).toBe(3)
  })

  test("create lobby rejects empty display name", async () => {
    const t = convexTest(schema, modules)
    await expect(
      t.mutation(api.lobbies.create, {
        sessionId: asSessionId("test-session-empty"),
        displayName: "",
      }),
    ).rejects.toThrow()
  })

  test("create lobby rejects display name too long", async () => {
    const t = convexTest(schema, modules)
    await expect(
      t.mutation(api.lobbies.create, {
        sessionId: asSessionId("test-session-long"),
        displayName: "A".repeat(51),
      }),
    ).rejects.toThrow()
  })

  test("create lobby generates unique codes", async () => {
    const t = convexTest(schema, modules)
    const result1 = await t.mutation(api.lobbies.create, {
      sessionId: asSessionId("unique-session-1"),
      displayName: "Host1",
    })
    const result2 = await t.mutation(api.lobbies.create, {
      sessionId: asSessionId("unique-session-2"),
      displayName: "Host2",
    })
    expect(result1.code).not.toBe(result2.code)
  })

  test("join lobby adds player to existing lobby", async () => {
    const t = convexTest(schema, modules)
    const { code } = await t.mutation(api.lobbies.create, {
      sessionId: asSessionId("join-host-session"),
      displayName: "JoinHost",
    })

    await t.mutation(api.lobbies.join, {
      code,
      sessionId: asSessionId("join-player-session"),
      displayName: "JoinPlayer",
    })

    const players = await t.run(async (ctx) => {
      const allPlayers = await ctx.db.query("players").collect()
      return allPlayers
    })

    expect(players).toHaveLength(2)
  })

  test("join lobby returns lobby id", async () => {
    const t = convexTest(schema, modules)
    const { code } = await t.mutation(api.lobbies.create, {
      sessionId: asSessionId("join-id-host"),
      displayName: "JoinIdHost",
    })

    const result = await t.mutation(api.lobbies.join, {
      code,
      sessionId: asSessionId("join-id-player"),
      displayName: "JoinIdPlayer",
    })

    expect(result.lobbyId).toBeDefined()
  })

  test("join lobby rejects invalid code", async () => {
    const t = convexTest(schema, modules)
    await expect(
      t.mutation(api.lobbies.join, {
        code: "INVALID",
        sessionId: asSessionId("invalid-session"),
        displayName: "InvalidPlayer",
      }),
    ).rejects.toThrow()
  })

  test("join lobby rejects empty display name", async () => {
    const t = convexTest(schema, modules)
    const { code } = await t.mutation(api.lobbies.create, {
      sessionId: asSessionId("empty-display-host"),
      displayName: "Host",
    })

    await expect(
      t.mutation(api.lobbies.join, {
        code,
        sessionId: asSessionId("empty-display-session"),
        displayName: "",
      }),
    ).rejects.toThrow()
  })

  test("join lobby rejects display name too long", async () => {
    const t = convexTest(schema, modules)
    const { code } = await t.mutation(api.lobbies.create, {
      sessionId: asSessionId("long-name-host"),
      displayName: "Host",
    })

    await expect(
      t.mutation(api.lobbies.join, {
        code,
        sessionId: asSessionId("long-name-session"),
        displayName: "A".repeat(51),
      }),
    ).rejects.toThrow()
  })

  test("join lobby rejects when session already in lobby", async () => {
    const t = convexTest(schema, modules)
    const { code } = await t.mutation(api.lobbies.create, {
      sessionId: asSessionId("duplicate-session"),
      displayName: "Host",
    })

    await expect(
      t.mutation(api.lobbies.join, {
        code,
        sessionId: asSessionId("duplicate-session"),
        displayName: "Player",
      }),
    ).rejects.toThrow()
  })

  test("join lobby rejects when lobby status is in_game", async () => {
    const t = convexTest(schema, modules)
    const { code } = await t.mutation(api.lobbies.create, {
      sessionId: asSessionId("game-host"),
      displayName: "Host",
    })

    await t.run(async (ctx) => {
      const lobby = await ctx.db.query("lobbies").first()
      if (lobby) {
        await ctx.db.patch(lobby._id, { status: "in_game" })
      }
    })

    await expect(
      t.mutation(api.lobbies.join, {
        code,
        sessionId: asSessionId("game-player"),
        displayName: "Player",
      }),
    ).rejects.toThrow()
  })

  test("join lobby is case insensitive for code", async () => {
    const t = convexTest(schema, modules)
    const { code } = await t.mutation(api.lobbies.create, {
      sessionId: asSessionId("case-host"),
      displayName: "Host",
    })

    const upperCode = code.toUpperCase()
    const lowerCode = code.toLowerCase()

    const result1 = await t.mutation(api.lobbies.join, {
      code: upperCode,
      sessionId: asSessionId("case-player-1"),
      displayName: "Player1",
    })
    const result2 = await t.mutation(api.lobbies.join, {
      code: lowerCode,
      sessionId: asSessionId("case-player-2"),
      displayName: "Player2",
    })

    expect(result1.lobbyId).toBe(result2.lobbyId)
  })

  test("join lobby uses lobby's starting coins setting", async () => {
    const t = convexTest(schema, modules)
    const { code } = await t.mutation(api.lobbies.create, {
      sessionId: asSessionId("coins-host"),
      displayName: "Host",
    })

    await t.run(async (ctx) => {
      const lobby = await ctx.db.query("lobbies").first()
      if (lobby) {
        await ctx.db.patch(lobby._id, { settings: { ...lobby.settings, startingCoins: 5 } })
      }
    })

    await t.mutation(api.lobbies.join, {
      code,
      sessionId: asSessionId("coins-player"),
      displayName: "Player",
    })

    const player = await t.run(async (ctx) => {
      const player = await ctx.db
        .query("players")
        .filter((q) => q.eq(q.field("sessionId"), "coins-player"))
        .first()
      return player
    })

    expect(player?.coins).toBe(5)
  })

  test("leave lobby removes player from lobby", async () => {
    const t = convexTest(schema, modules)
    const { code } = await t.mutation(api.lobbies.create, {
      sessionId: asSessionId("leave-host"),
      displayName: "Host",
    })

    await t.mutation(api.lobbies.join, {
      code,
      sessionId: asSessionId("leave-player"),
      displayName: "Player",
    })

    await t.mutation(api.lobbies.leave, {
      code,
      sessionId: asSessionId("leave-player"),
    })

    const players = await t.run(async (ctx) => {
      const allPlayers = await ctx.db.query("players").collect()
      return allPlayers
    })

    expect(players).toHaveLength(1)
  })

  test("leave lobby rejects when player not in lobby", async () => {
    const t = convexTest(schema, modules)
    const { code } = await t.mutation(api.lobbies.create, {
      sessionId: asSessionId("not-in-lobby-host"),
      displayName: "Host",
    })

    await expect(
      t.mutation(api.lobbies.leave, {
        code,
        sessionId: asSessionId("not-in-lobby-player"),
      }),
    ).rejects.toThrow()
  })

  test("leave lobby rejects when lobby not found", async () => {
    const t = convexTest(schema, modules)
    await expect(
      t.mutation(api.lobbies.leave, {
        code: "NOTFOUND",
        sessionId: asSessionId("not-found-session"),
      }),
    ).rejects.toThrow()
  })

  test("leave lobby transfers host when host leaves and players remain", async () => {
    const t = convexTest(schema, modules)
    const { code } = await t.mutation(api.lobbies.create, {
      sessionId: asSessionId("transfer-host"),
      displayName: "Host",
    })

    await t.mutation(api.lobbies.join, {
      code,
      sessionId: asSessionId("transfer-player"),
      displayName: "Player",
    })

    await t.mutation(api.lobbies.leave, {
      code,
      sessionId: asSessionId("transfer-host"),
    })

    const players = await t.run(async (ctx) => {
      const allPlayers = await ctx.db.query("players").collect()
      return allPlayers
    })

    const remainingPlayer = players.find((p) => p.sessionId === "transfer-player")
    expect(remainingPlayer?.isHost).toBe(true)
  })

  test("leave lobby deletes lobby when last player leaves", async () => {
    const t = convexTest(schema, modules)
    const { code } = await t.mutation(api.lobbies.create, {
      sessionId: asSessionId("delete-host"),
      displayName: "Host",
    })

    await t.mutation(api.lobbies.leave, {
      code,
      sessionId: asSessionId("delete-host"),
    })

    const lobby = await t.query(api.lobbies.get, { code })
    expect(lobby).toBeNull()
  })

  test("leave lobby is case insensitive for code", async () => {
    const t = convexTest(schema, modules)
    const { code } = await t.mutation(api.lobbies.create, {
      sessionId: asSessionId("case-leave-host"),
      displayName: "Host",
    })

    await t.mutation(api.lobbies.join, {
      code,
      sessionId: asSessionId("case-leave-player"),
      displayName: "Player",
    })

    await t.mutation(api.lobbies.leave, {
      code: code.toUpperCase(),
      sessionId: asSessionId("case-leave-player"),
    })

    const players = await t.run(async (ctx) => {
      const allPlayers = await ctx.db.query("players").collect()
      return allPlayers
    })

    expect(players).toHaveLength(1)
  })

  test("leave lobby works when non-host leaves", async () => {
    const t = convexTest(schema, modules)
    const { code } = await t.mutation(api.lobbies.create, {
      sessionId: asSessionId("non-host-leave-host"),
      displayName: "Host",
    })

    await t.mutation(api.lobbies.join, {
      code,
      sessionId: asSessionId("non-host-leave-player"),
      displayName: "Player",
    })

    await t.mutation(api.lobbies.leave, {
      code,
      sessionId: asSessionId("non-host-leave-player"),
    })

    const players = await t.run(async (ctx) => {
      const allPlayers = await ctx.db.query("players").collect()
      return allPlayers
    })

    expect(players).toHaveLength(1)
    expect(players[0]?.isHost).toBe(true)
  })

  test("get lobby returns lobby by code", async () => {
    const t = convexTest(schema, modules)
    const { code } = await t.mutation(api.lobbies.create, {
      sessionId: asSessionId("get-host"),
      displayName: "Host",
    })

    const lobby = await t.query(api.lobbies.get, { code })

    expect(lobby).not.toBeNull()
    expect(lobby?.code).toBe(code)
  })

  test("get lobby returns null for invalid code", async () => {
    const t = convexTest(schema, modules)
    const lobby = await t.query(api.lobbies.get, { code: "INVALID" })
    expect(lobby).toBeNull()
  })

  test("get lobby is case insensitive for code", async () => {
    const t = convexTest(schema, modules)
    const { code } = await t.mutation(api.lobbies.create, {
      sessionId: asSessionId("case-get-host"),
      displayName: "Host",
    })

    const lobby1 = await t.query(api.lobbies.get, { code: code.toUpperCase() })
    const lobby2 = await t.query(api.lobbies.get, { code: code.toLowerCase() })

    expect(lobby1?.code).toBe(lobby2?.code)
  })

  test("get lobby returns lobby with settings", async () => {
    const t = convexTest(schema, modules)
    const { code } = await t.mutation(api.lobbies.create, {
      sessionId: asSessionId("settings-host"),
      displayName: "Host",
    })

    const lobby = await t.query(api.lobbies.get, { code })

    expect(lobby).not.toBeNull()
    expect(lobby?.settings).toBeDefined()
    expect(lobby?.settings?.targetTimelineSize).toBe(10)
    expect(lobby?.settings?.startingCoins).toBe(3)
  })

  test("updateSettings allows host to update targetTimelineSize", async () => {
    const t = convexTest(schema, modules)
    const { code } = await t.mutation(api.lobbies.create, {
      sessionId: asSessionId("update-target-host"),
      displayName: "Host",
    })

    await t.mutation(api.lobbies.updateSettings, {
      code,
      sessionId: asSessionId("update-target-host"),
      settings: { targetTimelineSize: 12 },
    })

    const lobby = await t.query(api.lobbies.get, { code })
    expect(lobby?.settings.targetTimelineSize).toBe(12)
  })

  test("updateSettings allows host to update startingCoins", async () => {
    const t = convexTest(schema, modules)
    const { code } = await t.mutation(api.lobbies.create, {
      sessionId: asSessionId("update-coins-host"),
      displayName: "Host",
    })

    await t.mutation(api.lobbies.updateSettings, {
      code,
      sessionId: asSessionId("update-coins-host"),
      settings: { startingCoins: 5 },
    })

    const lobby = await t.query(api.lobbies.get, { code })
    expect(lobby?.settings.startingCoins).toBe(5)
  })

  test("updateSettings allows host to update turnSeconds", async () => {
    const t = convexTest(schema, modules)
    const { code } = await t.mutation(api.lobbies.create, {
      sessionId: asSessionId("update-turn-host"),
      displayName: "Host",
    })

    await t.mutation(api.lobbies.updateSettings, {
      code,
      sessionId: asSessionId("update-turn-host"),
      settings: { turnSeconds: 60 },
    })

    const lobby = await t.query(api.lobbies.get, { code })
    expect(lobby?.settings.turnSeconds).toBe(60)
  })

  test("updateSettings allows host to update year range", async () => {
    const t = convexTest(schema, modules)
    const { code } = await t.mutation(api.lobbies.create, {
      sessionId: asSessionId("update-year-host"),
      displayName: "Host",
    })

    await t.mutation(api.lobbies.updateSettings, {
      code,
      sessionId: asSessionId("update-year-host"),
      settings: { minYear: 1950, maxYear: 2000 },
    })

    const lobby = await t.query(api.lobbies.get, { code })
    expect(lobby?.settings.minYear).toBe(1950)
    expect(lobby?.settings.maxYear).toBe(2000)
  })

  test("updateSettings rejects non-host", async () => {
    const t = convexTest(schema, modules)
    const { code } = await t.mutation(api.lobbies.create, {
      sessionId: asSessionId("non-host-update-host"),
      displayName: "Host",
    })

    await t.mutation(api.lobbies.join, {
      code,
      sessionId: asSessionId("non-host-update-player"),
      displayName: "Player",
    })

    await expect(
      t.mutation(api.lobbies.updateSettings, {
        code,
        sessionId: asSessionId("non-host-update-player"),
        settings: { targetTimelineSize: 15 },
      }),
    ).rejects.toThrow()
  })

  test("updateSettings rejects targetTimelineSize below 5", async () => {
    const t = convexTest(schema, modules)
    const { code } = await t.mutation(api.lobbies.create, {
      sessionId: asSessionId("min-target-host"),
      displayName: "Host",
    })

    await expect(
      t.mutation(api.lobbies.updateSettings, {
        code,
        sessionId: asSessionId("min-target-host"),
        settings: { targetTimelineSize: 4 },
      }),
    ).rejects.toThrow()
  })

  test("updateSettings rejects targetTimelineSize above 15", async () => {
    const t = convexTest(schema, modules)
    const { code } = await t.mutation(api.lobbies.create, {
      sessionId: asSessionId("max-target-host"),
      displayName: "Host",
    })

    await expect(
      t.mutation(api.lobbies.updateSettings, {
        code,
        sessionId: asSessionId("max-target-host"),
        settings: { targetTimelineSize: 16 },
      }),
    ).rejects.toThrow()
  })

  test("updateSettings rejects startingCoins below 1", async () => {
    const t = convexTest(schema, modules)
    const { code } = await t.mutation(api.lobbies.create, {
      sessionId: asSessionId("min-coins-host"),
      displayName: "Host",
    })

    await expect(
      t.mutation(api.lobbies.updateSettings, {
        code,
        sessionId: asSessionId("min-coins-host"),
        settings: { startingCoins: 0 },
      }),
    ).rejects.toThrow()
  })

  test("updateSettings rejects startingCoins above 10", async () => {
    const t = convexTest(schema, modules)
    const { code } = await t.mutation(api.lobbies.create, {
      sessionId: asSessionId("max-coins-host"),
      displayName: "Host",
    })

    await expect(
      t.mutation(api.lobbies.updateSettings, {
        code,
        sessionId: asSessionId("max-coins-host"),
        settings: { startingCoins: 11 },
      }),
    ).rejects.toThrow()
  })

  test("updateSettings rejects turnSeconds below 15", async () => {
    const t = convexTest(schema, modules)
    const { code } = await t.mutation(api.lobbies.create, {
      sessionId: asSessionId("min-turn-host"),
      displayName: "Host",
    })

    await expect(
      t.mutation(api.lobbies.updateSettings, {
        code,
        sessionId: asSessionId("min-turn-host"),
        settings: { turnSeconds: 14 },
      }),
    ).rejects.toThrow()
  })

  test("updateSettings rejects turnSeconds above 120", async () => {
    const t = convexTest(schema, modules)
    const { code } = await t.mutation(api.lobbies.create, {
      sessionId: asSessionId("max-turn-host"),
      displayName: "Host",
    })

    await expect(
      t.mutation(api.lobbies.updateSettings, {
        code,
        sessionId: asSessionId("max-turn-host"),
        settings: { turnSeconds: 121 },
      }),
    ).rejects.toThrow()
  })

  test("updateSettings rejects bettingWindowSeconds below 5", async () => {
    const t = convexTest(schema, modules)
    const { code } = await t.mutation(api.lobbies.create, {
      sessionId: asSessionId("min-bet-host"),
      displayName: "Host",
    })

    await expect(
      t.mutation(api.lobbies.updateSettings, {
        code,
        sessionId: asSessionId("min-bet-host"),
        settings: { bettingWindowSeconds: 4 },
      }),
    ).rejects.toThrow()
  })

  test("updateSettings rejects bettingWindowSeconds above 60", async () => {
    const t = convexTest(schema, modules)
    const { code } = await t.mutation(api.lobbies.create, {
      sessionId: asSessionId("max-bet-host"),
      displayName: "Host",
    })

    await expect(
      t.mutation(api.lobbies.updateSettings, {
        code,
        sessionId: asSessionId("max-bet-host"),
        settings: { bettingWindowSeconds: 61 },
      }),
    ).rejects.toThrow()
  })

  test("updateSettings rejects minYear below 1900", async () => {
    const t = convexTest(schema, modules)
    const { code } = await t.mutation(api.lobbies.create, {
      sessionId: asSessionId("min-year-host"),
      displayName: "Host",
    })

    await expect(
      t.mutation(api.lobbies.updateSettings, {
        code,
        sessionId: asSessionId("min-year-host"),
        settings: { minYear: 1899 },
      }),
    ).rejects.toThrow()
  })

  test("updateSettings rejects minYear above maxYear", async () => {
    const t = convexTest(schema, modules)
    const { code } = await t.mutation(api.lobbies.create, {
      sessionId: asSessionId("year-range-host"),
      displayName: "Host",
    })

    await t.run(async (ctx) => {
      const lobby = await ctx.db.query("lobbies").first()
      if (lobby) {
        await ctx.db.patch(lobby._id, {
          settings: { ...lobby.settings, minYear: 2000, maxYear: 2020 },
        })
      }
    })

    await expect(
      t.mutation(api.lobbies.updateSettings, {
        code,
        sessionId: asSessionId("year-range-host"),
        settings: { minYear: 2025 },
      }),
    ).rejects.toThrow()
  })

  test("updateSettings rejects maxYear below minYear", async () => {
    const t = convexTest(schema, modules)
    const { code } = await t.mutation(api.lobbies.create, {
      sessionId: asSessionId("max-min-year-host"),
      displayName: "Host",
    })

    await t.run(async (ctx) => {
      const lobby = await ctx.db.query("lobbies").first()
      if (lobby) {
        await ctx.db.patch(lobby._id, {
          settings: { ...lobby.settings, minYear: 2000, maxYear: 2020 },
        })
      }
    })

    await expect(
      t.mutation(api.lobbies.updateSettings, {
        code,
        sessionId: asSessionId("max-min-year-host"),
        settings: { maxYear: 1990 },
      }),
    ).rejects.toThrow()
  })

  test("updateSettings rejects maxYear above 2030", async () => {
    const t = convexTest(schema, modules)
    const { code } = await t.mutation(api.lobbies.create, {
      sessionId: asSessionId("max-max-year-host"),
      displayName: "Host",
    })

    await expect(
      t.mutation(api.lobbies.updateSettings, {
        code,
        sessionId: asSessionId("max-max-year-host"),
        settings: { maxYear: 2031 },
      }),
    ).rejects.toThrow()
  })

  test("updateSettings rejects when lobby not found", async () => {
    const t = convexTest(schema, modules)
    await expect(
      t.mutation(api.lobbies.updateSettings, {
        code: "NOTFOUND",
        sessionId: asSessionId("not-found-session"),
        settings: { targetTimelineSize: 12 },
      }),
    ).rejects.toThrow()
  })

  test("updateSettings rejects when lobby status is in_game", async () => {
    const t = convexTest(schema, modules)
    const { code } = await t.mutation(api.lobbies.create, {
      sessionId: asSessionId("game-update-host"),
      displayName: "Host",
    })

    await t.run(async (ctx) => {
      const lobby = await ctx.db.query("lobbies").first()
      if (lobby) {
        await ctx.db.patch(lobby._id, { status: "in_game" })
      }
    })

    await expect(
      t.mutation(api.lobbies.updateSettings, {
        code,
        sessionId: asSessionId("game-update-host"),
        settings: { targetTimelineSize: 12 },
      }),
    ).rejects.toThrow()
  })

  test("updateSettings is case insensitive for code", async () => {
    const t = convexTest(schema, modules)
    const { code } = await t.mutation(api.lobbies.create, {
      sessionId: asSessionId("case-update-host"),
      displayName: "Host",
    })

    await t.mutation(api.lobbies.updateSettings, {
      code: code.toUpperCase(),
      sessionId: asSessionId("case-update-host"),
      settings: { targetTimelineSize: 12 },
    })

    const lobby = await t.query(api.lobbies.get, { code: code.toLowerCase() })
    expect(lobby?.settings.targetTimelineSize).toBe(12)
  })

  test("updateSettings allows host to toggle boolean settings", async () => {
    const t = convexTest(schema, modules)
    const { code } = await t.mutation(api.lobbies.create, {
      sessionId: asSessionId("toggle-host"),
      displayName: "Host",
    })

    await t.mutation(api.lobbies.updateSettings, {
      code,
      sessionId: asSessionId("toggle-host"),
      settings: { allowGuessTitleArtist: true, showLiveBets: false },
    })

    const lobby = await t.query(api.lobbies.get, { code })
    expect(lobby?.settings.allowGuessTitleArtist).toBe(true)
    expect(lobby?.settings.showLiveBets).toBe(false)
  })
})
