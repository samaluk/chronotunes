import type { SystemTableNames } from "convex/server"
import type { convexTest } from "convex-test"
import type { Id, TableNames } from "../../_generated/dataModel"

export type TestContext = ReturnType<typeof convexTest>

export interface FactoryResult<T extends TableNames | SystemTableNames> {
  id: Id<T>
  record: Record<string, unknown>
}

export type CreateManyOptions = {
  startIndex?: number
}

export type GamePhase = "placing" | "betting" | "resolved"
export type GameStatus = "active" | "paused" | "finished"
export type LobbyStatus = "lobby" | "in_game" | "finished"
export type BetStatus = "pending" | "won" | "lost"

export interface TimelineEntry {
  trackId: Id<"tracks">
  year: number
  earnedAtRoundNumber: number
  earnedBy: "placement" | "bet"
}

export interface PlayerOverrides {
  sessionId?: string
  displayName?: string
  isHost?: boolean
  coins?: number
  timeline?: TimelineEntry[]
  timelineSize?: number
}

export interface LobbyOverrides {
  code?: string
  hostSessionId?: string
  status?: LobbyStatus
  settings?: {
    targetTimelineSize?: number
    startingCoins?: number
    turnSeconds?: number
    bettingWindowSeconds?: number
    allowGuessTitleArtist?: boolean
    showLiveBets?: boolean
    allowBetRetraction?: boolean
    minYear?: number
    maxYear?: number
  }
  players?: PlayerOverrides[]
}

export interface GameOverrides {
  status?: GameStatus
  currentRoundNumber?: number
  turnOrder?: Id<"players">[]
  turnPlayerId?: Id<"players">
}

export interface RoundOverrides {
  roundNumber?: number
  phase?: GamePhase
  trackId?: Id<"tracks">
  turnPlayerId?: Id<"players">
  placement?: {
    proposedIndex: number
    submittedAt: number
  }
  placementPreview?: {
    proposedIndex: number
    updatedAt: number
  }
  guess?: {
    guessedTitle?: string
    guessedArtist?: string
    isCorrect: boolean
    awardedCoin: boolean
    submittedAt: number
  }
  resolution?: {
    validIndexMin: number
    validIndexMax: number
    turnPlayerWasCorrect: boolean
    awardedPlayerIds: Id<"players">[]
    coinDeltas: Array<{
      playerId: Id<"players">
      delta: number
    }>
    resolvedAt: number
  }
}

export interface BetOverrides {
  proposedIndex?: number
  lockedIn?: boolean
  status?: BetStatus
}

export function withIndex(str: string, index: number): string {
  return str.replace("{n}", String(index))
}

export function uuid(): string {
  return `session-${crypto.randomUUID().slice(0, 8)}`
}
