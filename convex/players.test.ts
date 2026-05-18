import { convexTest } from "convex-test"
import { expect, test } from "vitest"
import { api } from "./_generated/api"
import { asSessionId } from "./lib/sessions"
import schema from "./schema"
import { modules } from "./test.setup"

test("list returns all players in lobby", async () => {
  const t = convexTest(schema, modules)

  const { code } = await t.mutation(api.lobbies.create, {
    sessionId: asSessionId("list-host-session"),
    displayName: "ListHost",
  })

  await t.mutation(api.lobbies.join, {
    code,
    sessionId: asSessionId("list-player1-session"),
    displayName: "Player1",
  })

  await t.mutation(api.lobbies.join, {
    code,
    sessionId: asSessionId("list-player2-session"),
    displayName: "Player2",
  })

  const lobby = await t.query(api.lobbies.get, { code })
  const players = await t.query(api.players.list, { lobbyId: lobby!._id })

  expect(players).toHaveLength(3)
  const displayNames = players.map((p) => p.displayName).sort()
  expect(displayNames).toEqual(["ListHost", "Player1", "Player2"])
})

test("list returns empty array for lobby with no players", async () => {
  const t = convexTest(schema, modules)

  const { code } = await t.mutation(api.lobbies.create, {
    sessionId: asSessionId("list-empty-host"),
    displayName: "ListEmptyHost",
  })

  const lobby = await t.query(api.lobbies.get, { code })
  const players = await t.query(api.players.list, { lobbyId: lobby!._id })

  expect(players).toHaveLength(1)
})

test("list returns players with correct properties", async () => {
  const t = convexTest(schema, modules)

  const { code } = await t.mutation(api.lobbies.create, {
    sessionId: asSessionId("list-props-host"),
    displayName: "ListPropsHost",
  })

  await t.mutation(api.lobbies.join, {
    code,
    sessionId: asSessionId("list-props-player"),
    displayName: "ListPropsPlayer",
  })

  const lobby = await t.query(api.lobbies.get, { code })
  const players = await t.query(api.players.list, { lobbyId: lobby!._id })

  const host = players.find((p) => p.isHost)
  const player = players.find((p) => !p.isHost)

  expect(host).toBeDefined()
  expect(host?.sessionId).toBe("list-props-host")
  expect(host?.displayName).toBe("ListPropsHost")
  expect(host?.coins).toBe(0)
  expect(host?.timeline).toEqual([])
  expect(host?.timelineSize).toBe(0)
  expect(host?.createdAt).toBeDefined()

  expect(player).toBeDefined()
  expect(player?.sessionId).toBe("list-props-player")
  expect(player?.displayName).toBe("ListPropsPlayer")
  expect(player?.isHost).toBe(false)
})

test("getMe returns current player by sessionId", async () => {
  const t = convexTest(schema, modules)

  const { code } = await t.mutation(api.lobbies.create, {
    sessionId: asSessionId("me-host-session"),
    displayName: "MeHost",
  })

  await t.mutation(api.lobbies.join, {
    code,
    sessionId: asSessionId("me-player-session"),
    displayName: "MePlayer",
  })

  const lobby = await t.query(api.lobbies.get, { code })

  const me = await t.query(api.players.getMe, {
    lobbyId: lobby!._id,
    sessionId: asSessionId("me-player-session"),
  })

  expect(me).not.toBeNull()
  expect(me?.displayName).toBe("MePlayer")
  expect(me?.sessionId).toBe("me-player-session")
  expect(me?.isHost).toBe(false)
})

test("getMe returns host player", async () => {
  const t = convexTest(schema, modules)

  const { code } = await t.mutation(api.lobbies.create, {
    sessionId: asSessionId("me-real-host-session"),
    displayName: "MeRealHost",
  })

  const lobby = await t.query(api.lobbies.get, { code })

  const me = await t.query(api.players.getMe, {
    lobbyId: lobby!._id,
    sessionId: asSessionId("me-real-host-session"),
  })

  expect(me).not.toBeNull()
  expect(me?.displayName).toBe("MeRealHost")
  expect(me?.isHost).toBe(true)
})

test("getMe returns null when session not in lobby", async () => {
  const t = convexTest(schema, modules)

  const { code } = await t.mutation(api.lobbies.create, {
    sessionId: asSessionId("me-not-in-session"),
    displayName: "MeNotInHost",
  })

  const lobby = await t.query(api.lobbies.get, { code })

  const me = await t.query(api.players.getMe, {
    lobbyId: lobby!._id,
    sessionId: asSessionId("random-session-not-in-lobby"),
  })

  expect(me).toBeNull()
})
