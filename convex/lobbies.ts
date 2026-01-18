import { ConvexError, v } from "convex/values";
import { mutation } from "./_generated/server";

const LOBBY_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const LOBBY_CODE_LENGTH = 6;

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
} as const;

function generateLobbyCode(): string {
  let code = "";
  const randomValues = new Uint8Array(LOBBY_CODE_LENGTH);
  crypto.getRandomValues(randomValues);
  for (let i = 0; i < LOBBY_CODE_LENGTH; i++) {
    const rawIndex = randomValues[i];
    if (rawIndex === undefined) {
      throw new Error("Failed to generate random values");
    }
    const index = rawIndex % LOBBY_CODE_CHARS.length;
    code += LOBBY_CODE_CHARS[index];
  }
  return code;
}

export const create = mutation({
  args: {
    sessionId: v.string(),
    displayName: v.string(),
  },
  handler: async (ctx, args) => {
    const { sessionId, displayName } = args;

    if (displayName.length < 1 || displayName.length > 20) {
      throw new ConvexError("Display name must be between 1 and 20 characters");
    }

    let code: string;
    const maxAttempts = 10;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      code = generateLobbyCode();
      const existing = await ctx.db
        .query("lobbies")
        .filter((q) => q.eq(q.field("code"), code))
        .first();
      if (!existing) {
        break;
      }
      if (attempt === maxAttempts - 1) {
        throw new ConvexError("Failed to generate unique lobby code");
      }
    }

    const lobbyId = await ctx.db.insert("lobbies", {
      code: code!,
      hostSessionId: sessionId,
      status: "lobby",
      settings: DEFAULT_SETTINGS,
      activeGameId: undefined,
    });

    await ctx.db.insert("players", {
      lobbyId,
      sessionId,
      displayName,
      isHost: true,
      coins: DEFAULT_SETTINGS.startingCoins,
      timeline: [],
      timelineSize: 0,
      createdAt: Date.now(),
    });

    return { code: code! };
  },
});
