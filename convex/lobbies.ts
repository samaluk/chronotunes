import { ConvexError, v } from "convex/values"
import { vSessionId } from "convex-helpers/server/sessions"
import { query } from "./_generated/server"
import { mutationWithSession } from "./lib/sessions"

const LOBBY_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
const LOBBY_CODE_LENGTH = 6

const DEFAULT_SETTINGS = {
  targetTimelineSize: 10,
  startingCoins: 3,
  turnSeconds: 30,
  bettingWindowSeconds: 15,
  allowGuessTitleArtist: true,
  showLiveBets: true,
  allowBetRetraction: true,
  minYear: 1950,
  maxYear: 2025,
} as const

function generateLobbyCode(): string {
  let code = ""
  const randomValues = new Uint8Array(LOBBY_CODE_LENGTH)
  crypto.getRandomValues(randomValues)
  for (let i = 0; i < LOBBY_CODE_LENGTH; i++) {
    const rawIndex = randomValues[i]
    if (rawIndex === undefined) {
      throw new Error("Failed to generate random values")
    }
    const index = rawIndex % LOBBY_CODE_CHARS.length
    code += LOBBY_CODE_CHARS[index]
  }
  return code
}

export const create = mutationWithSession({
  args: {
    displayName: v.string(),
  },
  handler: async (ctx, args) => {
    const { displayName } = args
    const { sessionId } = ctx

    if (displayName.length < 1 || displayName.length > 20) {
      throw new ConvexError("Display name must be between 1 and 20 characters")
    }

    let code: string
    const maxAttempts = 10
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      code = generateLobbyCode()
      const existing = await ctx.db
        .query("lobbies")
        .filter((q) => q.eq(q.field("code"), code))
        .first()
      if (!existing) {
        break
      }
      if (attempt === maxAttempts - 1) {
        throw new ConvexError("Failed to generate unique lobby code")
      }
    }

    const lobbyId = await ctx.db.insert("lobbies", {
      code: code!,
      hostSessionId: sessionId,
      status: "lobby",
      settings: DEFAULT_SETTINGS,
    })

    await ctx.db.insert("players", {
      lobbyId,
      sessionId,
      displayName,
      isHost: true,
      coins: DEFAULT_SETTINGS.startingCoins,
      timeline: [],
      timelineSize: 0,
      createdAt: Date.now(),
    })

    return { code: code! }
  },
})

export const join = mutationWithSession({
  args: {
    code: v.string(),
    displayName: v.string(),
  },
  handler: async (ctx, args) => {
    const { code, displayName } = args
    const { sessionId } = ctx

    if (displayName.length < 1 || displayName.length > 20) {
      throw new ConvexError("Display name must be between 1 and 20 characters")
    }

    const lobby = await ctx.db
      .query("lobbies")
      .filter((q) => q.eq(q.field("code"), code.toUpperCase()))
      .first()

    if (!lobby) {
      throw new ConvexError("Lobby not found")
    }

    if (lobby.status !== "lobby") {
      throw new ConvexError("Cannot join lobby that is not in lobby status")
    }

    const existingPlayer = await ctx.db
      .query("players")
      .filter((q) =>
        q.and(q.eq(q.field("lobbyId"), lobby._id), q.eq(q.field("sessionId"), sessionId)),
      )
      .first()

    if (existingPlayer) {
      throw new ConvexError("You are already in this lobby")
    }

    await ctx.db.insert("players", {
      lobbyId: lobby._id,
      sessionId,
      displayName,
      isHost: false,
      coins: lobby.settings.startingCoins,
      timeline: [],
      timelineSize: 0,
      createdAt: Date.now(),
    })

    return { lobbyId: lobby._id }
  },
})

export const leave = mutationWithSession({
  args: {
    code: v.string(),
  },
  handler: async (ctx, args) => {
    const { code } = args
    const { sessionId } = ctx

    const lobby = await ctx.db
      .query("lobbies")
      .filter((q) => q.eq(q.field("code"), code.toUpperCase()))
      .first()

    if (!lobby) {
      throw new ConvexError("Lobby not found")
    }

    const player = await ctx.db
      .query("players")
      .filter((q) =>
        q.and(q.eq(q.field("lobbyId"), lobby._id), q.eq(q.field("sessionId"), sessionId)),
      )
      .first()

    if (!player) {
      throw new ConvexError("You are not in this lobby")
    }

    await ctx.db.delete(player._id)

    if (player.isHost) {
      const remainingPlayers = await ctx.db
        .query("players")
        .filter((q) => q.eq(q.field("lobbyId"), lobby._id))
        .collect()

      if (remainingPlayers.length === 0) {
        await ctx.db.delete(lobby._id)
      } else {
        const newHost = remainingPlayers[0]!
        await ctx.db.patch(newHost._id, { isHost: true })
        await ctx.db.patch(lobby._id, { hostSessionId: newHost.sessionId })
      }
    }
  },
})

export const get = query({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    const { code } = args

    const lobby = await ctx.db
      .query("lobbies")
      .filter((q) => q.eq(q.field("code"), code.toUpperCase()))
      .first()

    return lobby
  },
})

const lobbySettingsValidator = v.object({
  targetTimelineSize: v.number(),
  startingCoins: v.number(),
  turnSeconds: v.number(),
  bettingWindowSeconds: v.number(),
  allowGuessTitleArtist: v.boolean(),
  showLiveBets: v.boolean(),
  allowBetRetraction: v.boolean(),
  minYear: v.number(),
  maxYear: v.number(),
})

export const updateSettings = mutationWithSession({
  args: {
    code: v.string(),
    settings: lobbySettingsValidator.partial(),
  },
  handler: async (ctx, args) => {
    const { code, settings } = args
    const { sessionId } = ctx

    const lobby = await ctx.db
      .query("lobbies")
      .filter((q) => q.eq(q.field("code"), code.toUpperCase()))
      .first()

    if (!lobby) {
      throw new ConvexError("Lobby not found")
    }

    if (lobby.hostSessionId !== sessionId) {
      throw new ConvexError("Only the host can update settings")
    }

    if (lobby.status !== "lobby") {
      throw new ConvexError("Cannot update settings for a lobby that is not in lobby status")
    }

    if (
      settings?.targetTimelineSize &&
      (settings.targetTimelineSize < 5 || settings.targetTimelineSize > 15)
    ) {
      throw new ConvexError("Target timeline size must be between 5 and 15")
    }

    if (
      settings.startingCoins !== undefined &&
      (settings.startingCoins < 1 || settings.startingCoins > 10)
    ) {
      throw new ConvexError("Starting coins must be between 1 and 10")
    }

    if (settings.turnSeconds && (settings.turnSeconds < 15 || settings.turnSeconds > 120)) {
      throw new ConvexError("Turn seconds must be between 15 and 120")
    }

    if (
      settings.bettingWindowSeconds &&
      (settings.bettingWindowSeconds < 5 || settings.bettingWindowSeconds > 60)
    ) {
      throw new ConvexError("Betting window seconds must be between 5 and 60")
    }

    const currentMaxYear = settings.maxYear ?? lobby.settings.maxYear
    const currentMinYear = settings.minYear ?? lobby.settings.minYear

    if (
      settings.minYear !== undefined &&
      (settings.minYear < 1900 || settings.minYear > currentMaxYear)
    ) {
      throw new ConvexError("Invalid minimum year")
    }

    if (
      settings.maxYear !== undefined &&
      (settings.maxYear > 2030 || settings.maxYear < currentMinYear)
    ) {
      throw new ConvexError("Invalid maximum year")
    }

    await ctx.db.patch(lobby._id, { settings: { ...lobby.settings, ...settings } })
  },
})

export const transferHost = mutationWithSession({
  args: {
    code: v.string(),
    newHostSessionId: vSessionId,
  },
  handler: async (ctx, args) => {
    const { code, newHostSessionId } = args
    const { sessionId } = ctx

    const lobby = await ctx.db
      .query("lobbies")
      .filter((q) => q.eq(q.field("code"), code.toUpperCase()))
      .first()

    if (!lobby) {
      throw new ConvexError("Lobby not found")
    }

    if (lobby.hostSessionId !== sessionId) {
      throw new ConvexError("Only the host can transfer host privileges")
    }

    if (sessionId === newHostSessionId) {
      throw new ConvexError("Cannot transfer host to yourself")
    }

    const currentHostPlayer = await ctx.db
      .query("players")
      .filter((q) =>
        q.and(q.eq(q.field("lobbyId"), lobby._id), q.eq(q.field("sessionId"), sessionId)),
      )
      .first()

    if (!currentHostPlayer) {
      throw new ConvexError("You are not in this lobby")
    }

    const newHostPlayer = await ctx.db
      .query("players")
      .filter((q) =>
        q.and(q.eq(q.field("lobbyId"), lobby._id), q.eq(q.field("sessionId"), newHostSessionId)),
      )
      .first()

    if (!newHostPlayer) {
      throw new ConvexError("New host player is not in this lobby")
    }

    await ctx.db.patch(currentHostPlayer._id, { isHost: false })
    await ctx.db.patch(newHostPlayer._id, { isHost: true })
    await ctx.db.patch(lobby._id, { hostSessionId: newHostSessionId })
  },
})
