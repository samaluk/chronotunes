import type { Infer } from "convex/values"
import type { Id } from "../../_generated/dataModel"
import type { MutationCtx, QueryCtx } from "../../_generated/server"
import type schema from "../../schema"
import type { TestContext } from "./types"
import { uuid } from "./types"

export type Player = Infer<typeof schema.tables.players.validator>

export interface PlayerOverrides {
  sessionId?: string
  displayName?: string
  isHost?: boolean
  coins?: number
  timeline?: Player["timeline"]
  timelineSize?: number
}

function buildPlayerData(
  lobbyId: Id<"lobbies">,
  overrides: PlayerOverrides,
  index: number,
): Player {
  const sessionId = overrides.sessionId ?? uuid()
  return {
    lobbyId,
    sessionId,
    displayName: overrides.displayName ?? `Player ${index}`,
    isHost: overrides.isHost ?? false,
    coins: overrides.coins ?? 3,
    timeline: overrides.timeline ?? [],
    timelineSize: overrides.timelineSize ?? overrides.timeline?.length ?? 0,
    createdAt: Date.now(),
  }
}

export async function create(
  t: TestContext,
  lobbyId: Id<"lobbies">,
  overrides: PlayerOverrides = {},
): Promise<{ id: Id<"players">; record: Player }> {
  const data = buildPlayerData(lobbyId, overrides, 1)
  let playerId: Id<"players"> | null = null

  await t.run(async (ctx: MutationCtx) => {
    playerId = await ctx.db.insert("players", data)
  })

  return { id: playerId!, record: data }
}

export function createHost(
  t: TestContext,
  lobbyId: Id<"lobbies">,
  sessionId: string,
  displayName: string,
  overrides: PlayerOverrides = {},
): Promise<{ id: Id<"players">; record: Player }> {
  return create(t, lobbyId, {
    ...overrides,
    sessionId,
    displayName,
    isHost: true,
  })
}

export async function createMany(
  t: TestContext,
  lobbyId: Id<"lobbies">,
  count: number,
  overrides: PlayerOverrides = {},
): Promise<Array<{ id: Id<"players">; record: Player }>> {
  const results: Array<{ id: Id<"players">; record: Player }> = []

  for (let i = 0; i < count; i++) {
    const isHost = overrides.isHost ?? i === 0
    const index = i + 1
    const data = buildPlayerData(lobbyId, { ...overrides, isHost }, index)
    let playerId: Id<"players"> | null = null

    await t.run(async (ctx: MutationCtx) => {
      playerId = await ctx.db.insert("players", data)
    })

    results.push({ id: playerId!, record: data })
  }

  return results
}

export function createWithTimeline(
  t: TestContext,
  lobbyId: Id<"lobbies">,
  timeline: Player["timeline"],
  overrides: PlayerOverrides = {},
): Promise<{ id: Id<"players">; record: Player }> {
  return create(t, lobbyId, {
    ...overrides,
    timeline,
    timelineSize: timeline.length,
  })
}

export function createWithCoins(
  t: TestContext,
  lobbyId: Id<"lobbies">,
  coins: number,
  overrides: PlayerOverrides = {},
): Promise<{ id: Id<"players">; record: Player }> {
  return create(t, lobbyId, {
    ...overrides,
    coins,
  })
}

export async function findBySessionId(
  t: TestContext,
  sessionId: string,
): Promise<{ id: Id<"players">; record: Player } | null> {
  let result: { id: Id<"players">; record: Player } | null = null

  await t.run(async (ctx: QueryCtx) => {
    const player = await ctx.db
      .query("players")
      .filter((q) => q.eq(q.field("sessionId"), sessionId))
      .first()

    if (player) {
      result = { id: player._id, record: player as Player }
    }
  })

  return result
}

export async function findById(
  t: TestContext,
  playerId: Id<"players">,
): Promise<{ id: Id<"players">; record: Player } | null> {
  let result: { id: Id<"players">; record: Player } | null = null

  await t.run(async (ctx: QueryCtx) => {
    const player = await ctx.db.get(playerId)
    if (player) {
      result = { id: player._id, record: player as Player }
    }
  })

  return result
}

export async function getAllInLobby(
  t: TestContext,
  lobbyId: Id<"lobbies">,
): Promise<Array<{ id: Id<"players">; record: Player }>> {
  let results: Array<{ id: Id<"players">; record: Player }> = []

  await t.run(async (ctx: QueryCtx) => {
    const players = await ctx.db
      .query("players")
      .filter((q) => q.eq(q.field("lobbyId"), lobbyId))
      .collect()

    results = players.map((p) => ({
      id: p._id,
      record: p as Player,
    }))
  })

  return results
}
