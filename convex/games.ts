import { ConvexError, v } from "convex/values"
import type { Id } from "./_generated/dataModel"
import { query } from "./_generated/server"
import { getGameContext, getLobbyPlayers } from "./lib/gameContext"
import { computeValidIndexRange, isPlacementCorrect, type TimelineEntry } from "./lib/gameLogic"
import { createNextRound, shuffleArray } from "./lib/roundManagement"
import { mutationWithSession } from "./lib/sessions"

export const start = mutationWithSession({
  args: { lobbyId: v.id("lobbies") },
  handler: async (ctx, args) => {
    const { lobbyId } = args
    const { sessionId } = ctx

    const lobby = await ctx.db.get(lobbyId)

    if (!lobby) {
      throw new ConvexError("Lobby not found")
    }

    if (lobby.hostSessionId !== sessionId) {
      throw new ConvexError("Only the host can start the game")
    }

    if (lobby.status !== "lobby") {
      throw new ConvexError("Game has already started")
    }

    const players = await getLobbyPlayers(ctx, lobbyId)

    if (players.length < 2) {
      throw new ConvexError("At least 2 players are required to start a game")
    }

    const turnOrder = shuffleArray(players.map((p) => p._id))

    const gameId = await ctx.db.insert("games", {
      lobbyId,
      status: "active",
      startedAt: Date.now(),
      currentRoundNumber: 1,
      turnOrder,
      turnPlayerId: turnOrder[0],
    })

    const tracks = await ctx.db
      .query("tracks")
      .filter((q) =>
        q.and(
          q.gte(q.field("year"), lobby.settings.minYear),
          q.lte(q.field("year"), lobby.settings.maxYear),
        ),
      )
      .collect()

    if (tracks.length < players.length) {
      throw new ConvexError(
        `Not enough tracks for all players. Have ${tracks.length} tracks but need at least ${players.length} tracks (one per player)`,
      )
    }

    const usedTrackIds = new Set<Id<"tracks">>()
    const playerInitialTracks = new Map<Id<"players">, { trackId: Id<"tracks">; year: number }>()

    for (const player of players) {
      const availableTracks = tracks.filter((t) => !usedTrackIds.has(t._id))

      if (availableTracks.length === 0) {
        throw new ConvexError("Not enough unique tracks for all players")
      }

      const randomIndex = Math.floor(Math.random() * availableTracks.length)
      const selectedTrack = availableTracks[randomIndex]!

      usedTrackIds.add(selectedTrack._id)
      playerInitialTracks.set(player._id, {
        trackId: selectedTrack._id,
        year: selectedTrack.year,
      })

      await ctx.db.patch(player._id, {
        timeline: [
          {
            trackId: selectedTrack._id,
            year: selectedTrack.year,
            earnedAtRoundNumber: 0,
            earnedBy: "placement",
          },
        ],
        timelineSize: 1,
      })
    }

    let startingPlayerId: Id<"players"> | null = null
    let oldestYear = Number.POSITIVE_INFINITY

    for (const player of players) {
      const initialTrack = playerInitialTracks.get(player._id)

      if (initialTrack && initialTrack.year < oldestYear) {
        oldestYear = initialTrack.year
        startingPlayerId = player._id
      }
    }

    if (!startingPlayerId) {
      throw new ConvexError("Could not determine starting player")
    }

    await ctx.db.patch(gameId, {
      turnPlayerId: startingPlayerId,
    })

    const usedTrackIdsForRounds = new Set(usedTrackIds)
    const availableRoundTracks = tracks.filter((t) => !usedTrackIdsForRounds.has(t._id))

    if (availableRoundTracks.length === 0) {
      throw new ConvexError("No tracks available for the first round")
    }

    const randomIndex = Math.floor(Math.random() * availableRoundTracks.length)
    const firstTrack = availableRoundTracks[randomIndex]!

    const roundId = await ctx.db.insert("rounds", {
      gameId,
      roundNumber: 1,
      turnPlayerId: startingPlayerId,
      trackId: firstTrack._id,
      phase: "placing",
      startedAt: Date.now(),
    })

    await ctx.db.patch(gameId, { currentRoundId: roundId })

    await ctx.db.patch(lobbyId, {
      status: "in_game",
      activeGameId: gameId,
    })

    return { gameId, roundId }
  },
})

export const getCurrent = query({
  args: { lobbyId: v.id("lobbies") },
  handler: async (ctx, args) => {
    const lobby = await ctx.db.get(args.lobbyId)

    if (!(lobby && lobby.activeGameId)) {
      return null
    }

    return await ctx.db.get(lobby.activeGameId)
  },
})

export const skipTurn = mutationWithSession({
  args: { lobbyId: v.id("lobbies") },
  handler: async (ctx, args) => {
    const { lobbyId } = args
    const { sessionId } = ctx

    const lobby = await ctx.db.get(lobbyId)

    if (!lobby) {
      throw new ConvexError("Lobby not found")
    }

    if (lobby.hostSessionId !== sessionId) {
      throw new ConvexError("Only the host can skip a turn")
    }

    const { game } = await getGameContext(ctx, lobbyId)

    if (game.status !== "active") {
      throw new ConvexError("Game is not active")
    }

    const result = await createNextRound(ctx, game, lobby)

    if ("gameEnded" in result) {
      return { gameEnded: true, winnerPlayerId: null, noTracksAvailable: true }
    }

    return {
      gameEnded: false,
      winnerPlayerId: null,
      nextRoundId: result.nextRoundId,
      nextTurnPlayerId: result.nextTurnPlayerId,
    }
  },
})

export const resolveAndNext = mutationWithSession({
  args: { lobbyId: v.id("lobbies") },
  handler: async (ctx, args) => {
    const { lobbyId } = args
    const { sessionId } = ctx

    const lobby = await ctx.db.get(lobbyId)

    if (!lobby) {
      throw new ConvexError("Lobby not found")
    }

    if (lobby.hostSessionId !== sessionId) {
      throw new ConvexError("Only the host can start the next round")
    }

    const { game, round } = await getGameContext(ctx, lobbyId)

    if (game.status !== "active") {
      throw new ConvexError("Game is not active")
    }

    if (!round) {
      throw new ConvexError("No current round in this game")
    }

    if (round.phase !== "resolved") {
      throw new ConvexError("Can only start next round when round is resolved")
    }

    if (!round.placement) {
      throw new ConvexError("Round placement has not been submitted")
    }

    if (!round.resolution) {
      throw new ConvexError("Round has not been resolved")
    }

    const result = await createNextRound(ctx, game, lobby)

    if ("gameEnded" in result) {
      return {
        gameEnded: true,
        winnerPlayerId: null,
        nextRoundId: null,
        nextTurnPlayerId: null,
        noTracksAvailable: true,
      }
    }

    return {
      gameEnded: false,
      winnerPlayerId: null,
      nextRoundId: result.nextRoundId,
      nextTurnPlayerId: result.nextTurnPlayerId,
    }
  },
})

export const resolveRound = mutationWithSession({
  args: { lobbyId: v.id("lobbies") },
  handler: async (ctx, args) => {
    const { lobbyId } = args
    const { sessionId } = ctx

    const lobby = await ctx.db.get(lobbyId)

    if (!lobby) {
      throw new ConvexError("Lobby not found")
    }

    if (lobby.hostSessionId !== sessionId) {
      throw new ConvexError("Only the host can resolve the round")
    }

    const { game, round } = await getGameContext(ctx, lobbyId)

    if (game.status !== "active") {
      throw new ConvexError("Game is not active")
    }

    if (!round || round.phase !== "betting" || !round.placement) {
      throw new ConvexError("Cannot resolve round")
    }

    const track = await ctx.db.get(round.trackId)

    if (!track) {
      throw new ConvexError("Track not found")
    }

    const turnPlayer = await ctx.db.get(round.turnPlayerId)

    if (!turnPlayer) {
      throw new ConvexError("Turn player not found")
    }

    const players = await getLobbyPlayers(ctx, lobbyId)

    const allBets = await ctx.db
      .query("roundBets")
      .withIndex("by_round", (q) => q.eq("roundId", round._id))
      .collect()

    const lockedBets = allBets.filter((bet) => bet.lockedIn)
    const declinedBets = allBets.filter((bet) => bet.declinedToBet)

    const nonTurnPlayers = players.filter((p) => p._id !== round.turnPlayerId)

    const allNonTurnPlayersActed =
      nonTurnPlayers.length === 0 ||
      nonTurnPlayers.every(
        (player) =>
          lockedBets.some((bet) => bet.playerId === player._id) ||
          declinedBets.some((bet) => bet.playerId === player._id),
      )

    if (!allNonTurnPlayersActed) {
      throw new ConvexError("Not all players have placed bets or declined")
    }

    const validRange = computeValidIndexRange(turnPlayer.timeline, track.year)
    const turnPlayerWasCorrect = isPlacementCorrect(round.placement.proposedIndex, validRange)

    const coinDeltas: { playerId: Id<"players">; delta: number }[] = []
    const awardedPlayerIds: Id<"players">[] = []

    const timelineUpdates = new Map<
      Id<"players">,
      { newTimeline: TimelineEntry[]; newTimelineSize: number }
    >()

    for (const player of players) {
      timelineUpdates.set(player._id, {
        newTimeline: [...player.timeline],
        newTimelineSize: player.timelineSize,
      })
    }

    if (turnPlayerWasCorrect) {
      const turnPlayerUpdate = timelineUpdates.get(turnPlayer._id)!

      turnPlayerUpdate.newTimeline.splice(round.placement.proposedIndex, 0, {
        trackId: track._id,
        year: track.year,
        earnedAtRoundNumber: round.roundNumber,
        earnedBy: "placement",
      })

      turnPlayerUpdate.newTimelineSize += 1
      awardedPlayerIds.push(turnPlayer._id)
    }

    for (const bet of lockedBets) {
      const bettor = await ctx.db.get(bet.playerId)

      if (!bettor) {
        continue
      }

      const bettorWasCorrect = isPlacementCorrect(bet.proposedIndex, validRange)

      if (turnPlayerWasCorrect) {
        coinDeltas.push({ playerId: bettor._id, delta: 0 })
        await ctx.db.patch(bet._id, { status: "lost" })
      } else if (bettorWasCorrect) {
        const bettorUpdate = timelineUpdates.get(bettor._id)!

        bettorUpdate.newTimeline.splice(bet.proposedIndex, 0, {
          trackId: track._id,
          year: track.year,
          earnedAtRoundNumber: round.roundNumber,
          earnedBy: "bet",
        })

        bettorUpdate.newTimelineSize += 1
        awardedPlayerIds.push(bettor._id)
        coinDeltas.push({ playerId: bettor._id, delta: 0 })
        await ctx.db.patch(bet._id, { status: "won" })
      } else {
        coinDeltas.push({ playerId: bettor._id, delta: 0 })
        await ctx.db.patch(bet._id, { status: "lost" })
      }
    }

    for (const bet of declinedBets) {
      await ctx.db.patch(bet._id, { status: "lost" })
    }

    for (const [playerId, update] of timelineUpdates) {
      await ctx.db.patch(playerId, {
        timeline: update.newTimeline,
        timelineSize: update.newTimelineSize,
      })
    }

    await ctx.db.patch(round._id, {
      phase: "resolved",
      resolution: {
        validIndexMin: validRange.min,
        validIndexMax: validRange.max,
        turnPlayerWasCorrect,
        awardedPlayerIds,
        coinDeltas,
        resolvedAt: Date.now(),
      },
    })

    return {
      success: true,
      turnPlayerWasCorrect,
      awardedPlayerIds,
    }
  },
})

export const getResults = query({
  args: { lobbyId: v.id("lobbies") },
  handler: async (ctx, args) => {
    const lobby = await ctx.db.get(args.lobbyId)

    if (!(lobby && lobby.activeGameId)) {
      return null
    }

    const game = await ctx.db.get(lobby.activeGameId)

    if (!game) {
      return null
    }

    const players = await getLobbyPlayers(ctx, args.lobbyId)

    const rounds = await ctx.db
      .query("rounds")
      .withIndex("by_game", (q) => q.eq("gameId", game._id))
      .collect()

    const roundsWithTracks = await Promise.all(
      rounds.map(async (round) => {
        const track = await ctx.db.get(round.trackId)

        return {
          ...round,
          track: track
            ? {
                _id: track._id,
                title: track.title,
                artist: track.artist,
                year: track.year,
              }
            : null,
        }
      }),
    )

    return {
      game: {
        _id: game._id,
        status: game.status,
        startedAt: game.startedAt,
        endedAt: game.endedAt,
        currentRoundNumber: game.currentRoundNumber,
        winnerPlayerId: game.winnerPlayerId,
      },
      players: players.map((p) => ({
        _id: p._id,
        displayName: p.displayName,
        timelineSize: p.timelineSize,
        timeline: p.timeline,
        coins: p.coins,
        isHost: p.isHost,
      })),
      rounds: roundsWithTracks,
    }
  },
})

export const playAgain = mutationWithSession({
  args: { lobbyId: v.id("lobbies") },
  handler: async (ctx, args) => {
    const { lobbyId } = args
    const { sessionId } = ctx

    const lobby = await ctx.db.get(lobbyId)

    if (!lobby) {
      throw new ConvexError("Lobby not found")
    }

    if (lobby.hostSessionId !== sessionId) {
      throw new ConvexError("Only the host can restart the game")
    }

    if (lobby.status !== "finished") {
      throw new ConvexError("Game is not finished")
    }

    await ctx.db.patch(lobbyId, {
      status: "lobby",
      activeGameId: undefined,
    })

    const players = await getLobbyPlayers(ctx, lobbyId)

    for (const player of players) {
      await ctx.db.patch(player._id, {
        coins: lobby.settings.startingCoins,
        timeline: [],
        timelineSize: 0,
      })
    }

    if (lobby.activeGameId) {
      const rounds = await ctx.db
        .query("rounds")
        .filter((q) => q.eq(q.field("gameId"), lobby.activeGameId))
        .collect()

      for (const round of rounds) {
        await ctx.db.delete(round._id)
      }

      const game = await ctx.db.get(lobby.activeGameId)

      if (game) {
        await ctx.db.delete(game._id)
      }
    }

    return { success: true }
  },
})
