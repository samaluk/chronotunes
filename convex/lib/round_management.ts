import type { Doc, Id } from "../_generated/dataModel"
import type { MutationCtx } from "../_generated/server"
import { selectTrackForRound } from "./track_selection"

interface SelectedTrack {
  trackId: Id<"tracks">
  title: string
  artist: string
  year: number
}

interface NextRoundResult {
  nextRoundId: Id<"rounds">
  nextTurnPlayerId: Id<"players">
  selectedTrack: SelectedTrack
}

export async function createNextRound(
  ctx: MutationCtx,
  game: Doc<"games">,
  lobby: Doc<"lobbies">,
): Promise<NextRoundResult | { gameEnded: true; noTracksAvailable: true }> {
  const currentTurnIndex = game.turnOrder.indexOf(game.turnPlayerId!)

  if (currentTurnIndex === -1) {
    throw new ConvexError("Turn player not found in turn order")
  }

  const nextTurnIndex = (currentTurnIndex + 1) % game.turnOrder.length
  const nextTurnPlayerId = game.turnOrder[nextTurnIndex]!
  const nextRoundNumber = game.currentRoundNumber + 1

  const selectedTrack = await selectTrackForRound(ctx, {
    gameId: game._id,
    minYear: lobby.settings.minYear,
    maxYear: lobby.settings.maxYear,
  })

  if (!selectedTrack) {
    await ctx.db.patch(game._id, {
      status: "finished",
      endedAt: Date.now(),
    })

    await ctx.db.patch(lobby._id, { status: "finished" })

    return { gameEnded: true, noTracksAvailable: true }
  }

  const nextRoundId = await ctx.db.insert("rounds", {
    gameId: game._id,
    roundNumber: nextRoundNumber,
    turnPlayerId: nextTurnPlayerId,
    trackId: selectedTrack.trackId,
    phase: "placing",
    startedAt: Date.now(),
  })

  await ctx.db.patch(game._id, {
    currentRoundNumber: nextRoundNumber,
    currentRoundId: nextRoundId,
    turnPlayerId: nextTurnPlayerId,
  })

  return { nextRoundId, nextTurnPlayerId, selectedTrack }
}

export function shuffleArray<T>(array: readonly T[]): T[] {
  const shuffled = [...array]

  for (let i = shuffled.length - 1; i >= 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const temp = shuffled[i]!
    shuffled[i] = shuffled[j]!
    shuffled[j] = temp
  }

  return shuffled
}

import { ConvexError } from "convex/values"
