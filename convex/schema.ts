import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// Lobby status enum values
const lobbyStatus = v.union(v.literal("lobby"), v.literal("in_game"), v.literal("finished"));

// Game status enum values
const gameStatus = v.union(v.literal("active"), v.literal("paused"), v.literal("finished"));

// Round phase enum values
const roundPhase = v.union(v.literal("placing"), v.literal("betting"), v.literal("resolved"));

// Bet status enum values
const betStatus = v.union(v.literal("pending"), v.literal("won"), v.literal("lost"));

// Lobby settings object
const lobbySettings = v.object({
  targetTimelineSize: v.number(),
  startingCoins: v.number(),
  turnSeconds: v.number(),
  bettingWindowSeconds: v.number(),
  allowGuessTitleArtist: v.boolean(),
  showLiveBets: v.boolean(),
  allowBetRetraction: v.boolean(),
  minYear: v.number(),
  maxYear: v.number(),
});

// Timeline entry for player's timeline (embedded array)
const timelineEntry = v.object({
  trackId: v.id("tracks"),
  year: v.number(),
  earnedAtRoundNumber: v.number(),
  earnedBy: v.union(v.literal("placement"), v.literal("bet"), v.literal("initial")),
});

// Placement preview object
const placementPreview = v.object({
  proposedIndex: v.number(),
  updatedAt: v.number(),
});

// Placement object
const placement = v.object({
  proposedIndex: v.number(),
  submittedAt: v.number(),
});

// Guess object for title/artist guessing
const guess = v.object({
  guessedTitle: v.optional(v.string()),
  guessedArtist: v.optional(v.string()),
  isCorrect: v.boolean(),
  awardedCoin: v.boolean(),
  submittedAt: v.number(),
});

// Round resolution object
const resolution = v.object({
  validIndexMin: v.number(),
  validIndexMax: v.number(),
  turnPlayerWasCorrect: v.boolean(),
  awardedPlayerIds: v.array(v.id("players")),
  coinDeltas: v.array(
    v.object({
      playerId: v.id("players"),
      delta: v.number(),
    }),
  ),
  resolvedAt: v.number(),
});

// External IDs for tracks (Spotify, YouTube, Deezer)
const externalIds = v.object({
  spotifyTrackId: v.optional(v.string()),
  youtubeVideoId: v.optional(v.string()),
  deezerTrackId: v.optional(v.string()),
});

// Links for tracks
const trackLinks = v.object({
  spotifyUrl: v.optional(v.string()),
  youtubeUrl: v.optional(v.string()),
  deezerUrl: v.optional(v.string()),
});

export default defineSchema({
  // Lobbies table
  lobbies: defineTable({
    code: v.string(),
    hostSessionId: v.string(),
    hostTransferDeadline: v.optional(v.number()),
    status: lobbyStatus,
    settings: lobbySettings,
    activeGameId: v.optional(v.id("games")),
  }).index("by_code", ["code"]),

  // Players table
  players: defineTable({
    lobbyId: v.id("lobbies"),
    sessionId: v.string(),
    displayName: v.string(),
    isHost: v.boolean(),
    coins: v.number(),
    timeline: v.array(timelineEntry),
    timelineSize: v.number(),
    createdAt: v.number(),
  })
    .index("by_lobby", ["lobbyId"])
    .index("by_lobby_and_session", ["lobbyId", "sessionId"]),

  // Games table
  games: defineTable({
    lobbyId: v.id("lobbies"),
    status: gameStatus,
    startedAt: v.number(),
    endedAt: v.optional(v.number()),
    currentRoundNumber: v.number(),
    currentRoundId: v.optional(v.id("rounds")),
    turnPlayerId: v.optional(v.id("players")),
    turnOrder: v.array(v.id("players")),
    winnerPlayerId: v.optional(v.id("players")),
  }).index("by_lobby", ["lobbyId"]),

  // Rounds table
  rounds: defineTable({
    gameId: v.id("games"),
    roundNumber: v.number(),
    turnPlayerId: v.id("players"),
    trackId: v.id("tracks"),
    phase: roundPhase,
    startedAt: v.number(),
    placementPreview: v.optional(placementPreview),
    placement: v.optional(placement),
    guess: v.optional(guess),
    resolution: v.optional(resolution),
  }).index("by_game", ["gameId"]),

  // RoundBets table
  roundBets: defineTable({
    roundId: v.id("rounds"),
    playerId: v.id("players"),
    proposedIndex: v.number(),
    placedAt: v.number(),
    lockedIn: v.boolean(),
    declinedToBet: v.optional(v.boolean()),
    status: betStatus,
  })
    .index("by_round", ["roundId"])
    .index("by_round_and_player", ["roundId", "playerId"]),

  // Tracks table
  tracks: defineTable({
    mbid: v.optional(v.string()),
    title: v.string(),
    artist: v.string(),
    year: v.number(),
    durationMs: v.optional(v.number()),
    externalIds,
    links: trackLinks,
    createdAt: v.number(),
    source: v.string(),
  })
    .index("by_year", ["year"])
    .index("by_year_and_creation", ["year", "createdAt"]),
});
