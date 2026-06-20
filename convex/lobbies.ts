import { vSessionId } from "convex-helpers/server/sessions";
import { ConvexError, v } from "convex/values";

import type { Doc } from "./_generated/dataModel";
import { query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import { mutationWithSession } from "./lib/sessions";

const LOBBY_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const LOBBY_CODE_LENGTH = 6;

const DEFAULT_SETTINGS = {
  allowBetRetraction: true,
  allowGuessTitleArtist: true,
  bettingWindowSeconds: 15,
  maxYear: 2025,
  minYear: 1950,
  showLiveBets: true,
  startingCoins: 3,
  targetTimelineSize: 10,
  turnSeconds: 30,
} as const;

const normalizeLobbyCode = (code: string) => code.trim().toUpperCase();

const assertDisplayName = (displayName: string) => {
  if (displayName.length < 1 || displayName.length > 20) {
    throw new ConvexError("Display name must be between 1 and 20 characters");
  }
};

const getLobbyByCode = async (ctx: MutationCtx, code: string) => {
  const lobby = await ctx.db
    .query("lobbies")
    .filter((q) => q.eq(q.field("code"), normalizeLobbyCode(code)))
    .first();

  if (!lobby) {
    throw new ConvexError("Lobby not found");
  }

  return lobby;
};

const assertHost = (
  lobby: Doc<"lobbies">,
  sessionId: string,
  message: string
) => {
  if (lobby.hostSessionId !== sessionId) {
    throw new ConvexError(message);
  }
};

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

export const create = mutationWithSession({
  args: {
    displayName: v.string(),
  },
  handler: async (ctx, args) => {
    const { displayName } = args;
    const { sessionId } = ctx;

    assertDisplayName(displayName);

    let code: string;
    const maxAttempts = 10;
    /* oxlint-disable eslint/no-await-in-loop -- retry until a unique lobby code is found */
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
    /* oxlint-enable eslint/no-await-in-loop */

    const lobbyId = await ctx.db.insert("lobbies", {
      code: code!,
      hostSessionId: sessionId,
      settings: DEFAULT_SETTINGS,
      status: "lobby",
    });

    await ctx.db.insert("players", {
      coins: 0,
      createdAt: Date.now(),
      displayName,
      isHost: true,
      lobbyId,
      sessionId,
      timeline: [],
      timelineSize: 0,
    });

    return { code: code! };
  },
});

export const join = mutationWithSession({
  args: {
    code: v.string(),
    displayName: v.string(),
  },
  handler: async (ctx, args) => {
    const { code, displayName } = args;
    const { sessionId } = ctx;

    assertDisplayName(displayName);

    const lobby = await getLobbyByCode(ctx, code);

    if (lobby.status !== "lobby") {
      throw new ConvexError("Cannot join lobby that is not in lobby status");
    }

    const existingPlayer = await ctx.db
      .query("players")
      .filter((q) =>
        q.and(
          q.eq(q.field("lobbyId"), lobby._id),
          q.eq(q.field("sessionId"), sessionId)
        )
      )
      .first();

    if (existingPlayer) {
      throw new ConvexError("You are already in this lobby");
    }

    await ctx.db.insert("players", {
      coins: 0,
      createdAt: Date.now(),
      displayName,
      isHost: false,
      lobbyId: lobby._id,
      sessionId,
      timeline: [],
      timelineSize: 0,
    });

    return { lobbyId: lobby._id };
  },
});

export const leave = mutationWithSession({
  args: {
    code: v.string(),
  },
  handler: async (ctx, args) => {
    const { code } = args;
    const { sessionId } = ctx;

    const lobby = await getLobbyByCode(ctx, code);

    const player = await ctx.db
      .query("players")
      .filter((q) =>
        q.and(
          q.eq(q.field("lobbyId"), lobby._id),
          q.eq(q.field("sessionId"), sessionId)
        )
      )
      .first();

    if (!player) {
      throw new ConvexError("You are not in this lobby");
    }

    await ctx.db.delete(player._id);

    if (player.isHost) {
      const remainingPlayers = await ctx.db
        .query("players")
        .filter((q) => q.eq(q.field("lobbyId"), lobby._id))
        .collect();

      if (remainingPlayers.length === 0) {
        await ctx.db.delete(lobby._id);
      } else {
        const newHost = remainingPlayers[0]!;
        await ctx.db.patch(newHost._id, { isHost: true });
        await ctx.db.patch(lobby._id, { hostSessionId: newHost.sessionId });
      }
    }
  },
});

export const get = query({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    const { code } = args;

    const lobby = await ctx.db
      .query("lobbies")
      .filter((q) => q.eq(q.field("code"), normalizeLobbyCode(code)))
      .first();

    return lobby;
  },
});

const lobbySettingsValidator = v.object({
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

const validateTargetTimelineSize = (value?: number) => {
  if (value && (value < 5 || value > 15)) {
    throw new ConvexError("Target timeline size must be between 5 and 15");
  }
};

const validateStartingCoins = (value?: number) => {
  if (value !== undefined && (value < 1 || value > 10)) {
    throw new ConvexError("Starting coins must be between 1 and 10");
  }
};

const validateTurnSeconds = (value?: number) => {
  if (value && (value < 15 || value > 120)) {
    throw new ConvexError("Turn seconds must be between 15 and 120");
  }
};

const validateBettingWindowSeconds = (value?: number) => {
  if (value && (value < 5 || value > 60)) {
    throw new ConvexError("Betting window seconds must be between 5 and 60");
  }
};

const validateYearRange = (
  settings: Partial<Doc<"lobbies">["settings"]>,
  currentSettings: Doc<"lobbies">["settings"]
) => {
  const currentMaxYear = settings.maxYear ?? currentSettings.maxYear;
  const currentMinYear = settings.minYear ?? currentSettings.minYear;

  if (
    settings.minYear !== undefined &&
    (settings.minYear < 1900 || settings.minYear > currentMaxYear)
  ) {
    throw new ConvexError("Invalid minimum year");
  }

  if (
    settings.maxYear !== undefined &&
    (settings.maxYear > 2030 || settings.maxYear < currentMinYear)
  ) {
    throw new ConvexError("Invalid maximum year");
  }
};

const validateSettingsUpdate = (
  settings: Partial<Doc<"lobbies">["settings"]> | undefined,
  currentSettings: Doc<"lobbies">["settings"]
) => {
  if (!settings) {
    return;
  }

  validateTargetTimelineSize(settings.targetTimelineSize);
  validateStartingCoins(settings.startingCoins);
  validateTurnSeconds(settings.turnSeconds);
  validateBettingWindowSeconds(settings.bettingWindowSeconds);
  validateYearRange(settings, currentSettings);
};

export const updateSettings = mutationWithSession({
  args: {
    code: v.string(),
    settings: lobbySettingsValidator.partial(),
  },
  handler: async (ctx, args) => {
    const { code, settings } = args;
    const { sessionId } = ctx;

    const lobby = await getLobbyByCode(ctx, code);

    assertHost(lobby, sessionId, "Only the host can update settings");

    if (lobby.status !== "lobby") {
      throw new ConvexError(
        "Cannot update settings for a lobby that is not in lobby status"
      );
    }

    validateSettingsUpdate(settings, lobby.settings);

    await ctx.db.patch(lobby._id, {
      settings: { ...lobby.settings, ...settings },
    });
  },
});

export const transferHost = mutationWithSession({
  args: {
    code: v.string(),
    newHostSessionId: vSessionId,
  },
  handler: async (ctx, args) => {
    const { code, newHostSessionId } = args;
    const { sessionId } = ctx;

    const lobby = await getLobbyByCode(ctx, code);

    assertHost(lobby, sessionId, "Only the host can transfer host privileges");

    if (sessionId === newHostSessionId) {
      throw new ConvexError("Cannot transfer host to yourself");
    }

    const currentHostPlayer = await ctx.db
      .query("players")
      .filter((q) =>
        q.and(
          q.eq(q.field("lobbyId"), lobby._id),
          q.eq(q.field("sessionId"), sessionId)
        )
      )
      .first();

    if (!currentHostPlayer) {
      throw new ConvexError("You are not in this lobby");
    }

    const newHostPlayer = await ctx.db
      .query("players")
      .filter((q) =>
        q.and(
          q.eq(q.field("lobbyId"), lobby._id),
          q.eq(q.field("sessionId"), newHostSessionId)
        )
      )
      .first();

    if (!newHostPlayer) {
      throw new ConvexError("New host player is not in this lobby");
    }

    await ctx.db.patch(currentHostPlayer._id, { isHost: false });
    await ctx.db.patch(newHostPlayer._id, { isHost: true });
    await ctx.db.patch(lobby._id, { hostSessionId: newHostSessionId });
  },
});
