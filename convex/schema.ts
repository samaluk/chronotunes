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
  allowBetRetraction: v.boolean(),
  allowGuessTitleArtist: v.boolean(),
  bettingWindowSeconds: v.number(),
  maxYear: v.number(),
  minYear: v.number(),
  showLiveBets: v.boolean(),
  startingCoins: v.number(),
  targetTimelineSize: v.number(),
  turnSeconds: v.number(),
});

// Timeline entry for player's timeline (embedded array)
const timelineEntry = v.object({
  earnedAtRoundNumber: v.number(),
  earnedBy: v.union(v.literal("placement"), v.literal("bet"), v.literal("initial")),
  trackId: v.id("tracks"),
  year: v.number(),
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
  awardedCoin: v.boolean(),
  guessedArtist: v.optional(v.string()),
  guessedTitle: v.optional(v.string()),
  isCorrect: v.boolean(),
  submittedAt: v.number(),
});

// Round resolution object
const resolution = v.object({
  awardedPlayerIds: v.array(v.id("players")),
  coinDeltas: v.array(
    v.object({
      delta: v.number(),
      playerId: v.id("players"),
    }),
  ),
  resolvedAt: v.number(),
  turnPlayerWasCorrect: v.boolean(),
  validIndexMax: v.number(),
  validIndexMin: v.number(),
});

// External IDs for tracks (Spotify, YouTube, Deezer)
const externalIds = v.object({
  deezerTrackId: v.optional(v.string()),
  spotifyTrackId: v.optional(v.string()),
  youtubeVideoId: v.optional(v.string()),
});

// Links for tracks
const trackLinks = v.object({
  deezerUrl: v.optional(v.string()),
  spotifyUrl: v.optional(v.string()),
  youtubeUrl: v.optional(v.string()),
});

export default defineSchema({
  // Lobbies table
  lobbies: defineTable({
    activeGameId: v.optional(v.id("games")),
    code: v.string(),
    hostSessionId: v.string(),
    hostTransferDeadline: v.optional(v.number()),
    settings: lobbySettings,
    status: lobbyStatus,
  }).index("by_code", ["code"]),

  // Players table
  players: defineTable({
    coins: v.number(),
    createdAt: v.number(),
    displayName: v.string(),
    isHost: v.boolean(),
    lobbyId: v.id("lobbies"),
    sessionId: v.string(),
    timeline: v.array(timelineEntry),
    timelineSize: v.number(),
  })
    .index("by_lobby", ["lobbyId"])
    .index("by_lobby_and_session", ["lobbyId", "sessionId"]),

  // Games table
  games: defineTable({
    currentRoundId: v.optional(v.id("rounds")),
    currentRoundNumber: v.number(),
    endedAt: v.optional(v.number()),
    lobbyId: v.id("lobbies"),
    startedAt: v.number(),
    status: gameStatus,
    turnOrder: v.array(v.id("players")),
    turnPlayerId: v.optional(v.id("players")),
    winnerPlayerId: v.optional(v.id("players")),
  }).index("by_lobby", ["lobbyId"]),

  // Rounds table
  rounds: defineTable({
    gameId: v.id("games"),
    guess: v.optional(guess),
    phase: roundPhase,
    placement: v.optional(placement),
    placementPreview: v.optional(placementPreview),
    resolution: v.optional(resolution),
    roundNumber: v.number(),
    startedAt: v.number(),
    trackId: v.id("tracks"),
    turnPlayerId: v.id("players"),
  }).index("by_game", ["gameId"]),

  // RoundBets table
  roundBets: defineTable({
    declinedToBet: v.optional(v.boolean()),
    lockedIn: v.boolean(),
    placedAt: v.number(),
    playerId: v.id("players"),
    proposedIndex: v.number(),
    roundId: v.id("rounds"),
    status: betStatus,
  })
    .index("by_round", ["roundId"])
    .index("by_round_and_player", ["roundId", "playerId"]),

  // Tracks table
  tracks: defineTable({
    artist: v.string(),
    createdAt: v.number(),
    durationMs: v.optional(v.number()),
    externalIds,
    links: trackLinks,
    mbid: v.optional(v.string()),
    source: v.string(),
    title: v.string(),
    year: v.number(),
  })
    .index("by_year", ["year"])
    .index("by_year_and_creation", ["year", "createdAt"]),
});
