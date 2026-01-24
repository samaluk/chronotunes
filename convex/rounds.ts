import { ConvexError, v } from "convex/values"
import { getGameContext, getLobbyPlayers, getPlayerBySession } from "./lib/game-context"
import { mutationWithSession, queryWithSession } from "./lib/sessions"

export const getCurrent = queryWithSession({
  args: { lobbyId: v.id("lobbies") },
  handler: async (ctx, args) => {
    const { lobbyId } = args

    const lobby = await ctx.db.get(lobbyId)

    if (!lobby?.activeGameId) {
      return null
    }

    const game = await ctx.db.get(lobby.activeGameId)

    if (!game?.currentRoundId) {
      return null
    }

    const round = await ctx.db.get(game.currentRoundId)

    if (!round) {
      return null
    }

    const canSeeTrack = round.phase === "resolved"

    const track = await ctx.db.get(round.trackId)

    if (!track) {
      return null
    }

    const trackInfo = canSeeTrack
      ? {
          trackId: track._id,
          title: track.title,
          artist: track.artist,
          year: track.year,
          youtubeVideoId: track.externalIds.youtubeVideoId ?? undefined,
        }
      : {
          trackId: track._id,
          youtubeVideoId: track.externalIds.youtubeVideoId ?? undefined,
        }

    return {
      _id: round._id,
      _creationTime: round._creationTime,
      gameId: round.gameId,
      roundNumber: round.roundNumber,
      turnPlayerId: round.turnPlayerId,
      phase: round.phase,
      startedAt: round.startedAt,
      placementPreview: round.placementPreview,
      placement: round.placement,
      guess: round.guess,
      resolution: round.resolution,
      track: trackInfo,
    }
  },
})

export const setPlacementPreview = mutationWithSession({
  args: { lobbyId: v.id("lobbies"), proposedIndex: v.number() },
  handler: async (ctx, args) => {
    const { lobbyId, proposedIndex } = args
    const { sessionId } = ctx

    const { round } = await getGameContext(ctx, lobbyId)

    if (!round || round.phase !== "placing") {
      throw new ConvexError("Can only preview placement during placing phase")
    }

    const player = await getPlayerBySession(ctx, lobbyId, sessionId)

    if (round.turnPlayerId !== player._id) {
      throw new ConvexError("Only the turn player can preview placement")
    }

    if (proposedIndex < 0) {
      throw new ConvexError("Proposed index cannot be negative")
    }

    await ctx.db.patch(round._id, {
      placementPreview: {
        proposedIndex,
        updatedAt: Date.now(),
      },
    })
  },
})

export const submitPlacement = mutationWithSession({
  args: { lobbyId: v.id("lobbies") },
  handler: async (ctx, args) => {
    const { lobbyId } = args
    const { sessionId } = ctx

    const { round } = await getGameContext(ctx, lobbyId)

    if (!round) {
      throw new ConvexError("No current round in this game")
    }

    if (round.placement) {
      throw new ConvexError("Placement has already been submitted")
    }

    const player = await getPlayerBySession(ctx, lobbyId, sessionId)

    if (round.phase !== "placing") {
      throw new ConvexError("Can only submit placement during placing phase")
    }

    if (round.turnPlayerId !== player._id) {
      throw new ConvexError("Only the turn player can submit placement")
    }

    if (!round.placementPreview) {
      throw new ConvexError("Please preview your placement first")
    }

    await ctx.db.patch(round._id, {
      placement: {
        proposedIndex: round.placementPreview.proposedIndex,
        submittedAt: Date.now(),
      },
      phase: "betting",
    })

    const players = await getLobbyPlayers(ctx, lobbyId)

    const allBets = await ctx.db
      .query("roundBets")
      .withIndex("by_round", (q) => q.eq("roundId", round._id))
      .collect()

    const playersWithBets = new Set(allBets.map((bet) => bet.playerId))

    for (const p of players) {
      if (p._id === round.turnPlayerId) {
        continue
      }
      if (playersWithBets.has(p._id)) {
        continue
      }
      if (p.coins >= 1) {
        continue
      }

      await ctx.db.insert("roundBets", {
        roundId: round._id,
        playerId: p._id,
        proposedIndex: 0,
        placedAt: Date.now(),
        lockedIn: false,
        declinedToBet: true,
        status: "pending",
      })
    }
  },
})

export const declineBet = mutationWithSession({
  args: { lobbyId: v.id("lobbies") },
  handler: async (ctx, args) => {
    const { lobbyId } = args
    const { sessionId } = ctx

    const { round } = await getGameContext(ctx, lobbyId)

    if (!round || round.phase !== "betting") {
      throw new ConvexError("Can only decline bet during betting phase")
    }

    const player = await getPlayerBySession(ctx, lobbyId, sessionId)

    if (round.turnPlayerId === player._id) {
      throw new ConvexError("Turn player cannot decline to bet")
    }

    const existingBet = await ctx.db
      .query("roundBets")
      .withIndex("by_round_and_player", (q) =>
        q.eq("roundId", round._id).eq("playerId", player._id),
      )
      .unique()

    if (existingBet) {
      if (existingBet.lockedIn) {
        throw new ConvexError("Bet has already been locked in")
      }

      await ctx.db.patch(existingBet._id, {
        declinedToBet: true,
        proposedIndex: 0,
        placedAt: Date.now(),
      })
    } else {
      await ctx.db.insert("roundBets", {
        roundId: round._id,
        playerId: player._id,
        proposedIndex: 0,
        placedAt: Date.now(),
        lockedIn: false,
        declinedToBet: true,
        status: "pending",
      })
    }
  },
})
