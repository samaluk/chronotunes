import type { Id } from "../../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../../_generated/server";
import type { FactoryResult, LobbyOverrides, PlayerOverrides, TestContext } from "./types";

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

export async function create(
  t: TestContext,
  sessionId: string,
  displayName: string,
  overrides: LobbyOverrides = {},
): Promise<FactoryResult<"lobbies"> & { hostPlayerId: Id<"players"> }> {
  const code = overrides.code ?? generateLobbyCode();
  const hostSessionId = sessionId;
  const status: "lobby" | "in_game" | "finished" = overrides.status ?? "lobby";
  const settings = {
    targetTimelineSize:
      overrides.settings?.targetTimelineSize ?? DEFAULT_SETTINGS.targetTimelineSize,
    startingCoins: overrides.settings?.startingCoins ?? DEFAULT_SETTINGS.startingCoins,
    turnSeconds: overrides.settings?.turnSeconds ?? DEFAULT_SETTINGS.turnSeconds,
    bettingWindowSeconds:
      overrides.settings?.bettingWindowSeconds ?? DEFAULT_SETTINGS.bettingWindowSeconds,
    allowGuessTitleArtist:
      overrides.settings?.allowGuessTitleArtist ?? DEFAULT_SETTINGS.allowGuessTitleArtist,
    showLiveBets: overrides.settings?.showLiveBets ?? DEFAULT_SETTINGS.showLiveBets,
    allowBetRetraction:
      overrides.settings?.allowBetRetraction ?? DEFAULT_SETTINGS.allowBetRetraction,
    minYear: overrides.settings?.minYear ?? DEFAULT_SETTINGS.minYear,
    maxYear: overrides.settings?.maxYear ?? DEFAULT_SETTINGS.maxYear,
  };

  let lobbyId: Id<"lobbies"> | null = null;
  let hostPlayerId: Id<"players"> | null = null;

  await t.run(async (ctx: MutationCtx) => {
    lobbyId = await ctx.db.insert("lobbies", {
      code,
      hostSessionId,
      status,
      settings,
    });

    hostPlayerId = await ctx.db.insert("players", {
      lobbyId,
      sessionId,
      displayName,
      isHost: true,
      coins: settings.startingCoins,
      timeline: [],
      timelineSize: 0,
      createdAt: Date.now(),
    });
  });

  if (!lobbyId || !hostPlayerId) {
    throw new Error("Failed to create lobby");
  }

  return {
    id: lobbyId,
    record: { code, hostSessionId, status, settings } as unknown as Record<string, unknown>,
    hostPlayerId,
  };
}

export async function createWithPlayers(
  t: TestContext,
  hostSessionId: string,
  playerCount: number,
  options: {
    hostDisplayName?: string;
    playerOverrides?: Array<LobbyOverrides["players"]>;
    settings?: LobbyOverrides["settings"];
  } = {},
): Promise<FactoryResult<"lobbies"> & { playerIds: Array<Id<"players">> }> {
  const hostName = options.hostDisplayName ?? "Host";
  const code = generateLobbyCode();
  const status: "lobby" | "in_game" | "finished" = "lobby";
  const settings = {
    targetTimelineSize: options.settings?.targetTimelineSize ?? DEFAULT_SETTINGS.targetTimelineSize,
    startingCoins: options.settings?.startingCoins ?? DEFAULT_SETTINGS.startingCoins,
    turnSeconds: options.settings?.turnSeconds ?? DEFAULT_SETTINGS.turnSeconds,
    bettingWindowSeconds:
      options.settings?.bettingWindowSeconds ?? DEFAULT_SETTINGS.bettingWindowSeconds,
    allowGuessTitleArtist:
      options.settings?.allowGuessTitleArtist ?? DEFAULT_SETTINGS.allowGuessTitleArtist,
    showLiveBets: options.settings?.showLiveBets ?? DEFAULT_SETTINGS.showLiveBets,
    allowBetRetraction: options.settings?.allowBetRetraction ?? DEFAULT_SETTINGS.allowBetRetraction,
    minYear: options.settings?.minYear ?? DEFAULT_SETTINGS.minYear,
    maxYear: options.settings?.maxYear ?? DEFAULT_SETTINGS.maxYear,
  };

  let lobbyId: Id<"lobbies"> | null = null;
  const playerIds: Array<Id<"players">> = [];

  await t.run(async (ctx: MutationCtx) => {
    lobbyId = await ctx.db.insert("lobbies", {
      code,
      hostSessionId,
      status,
      settings,
    });

    playerIds.push(
      await ctx.db.insert("players", {
        lobbyId,
        sessionId: hostSessionId,
        displayName: hostName,
        isHost: true,
        coins: settings.startingCoins,
        timeline: [],
        timelineSize: 0,
        createdAt: Date.now(),
      }),
    );

    for (let i = 0; i < playerCount; i++) {
      const override = options.playerOverrides?.[i] as PlayerOverrides | undefined;
      const pSessionId =
        override && typeof override.sessionId === "string"
          ? override.sessionId
          : `player-${i + 1}-session`;
      const pDisplayName =
        override && typeof override.displayName === "string"
          ? override.displayName
          : `Player ${i + 1}`;
      const pCoins =
        override && typeof override.coins === "number" ? override.coins : settings.startingCoins;
      const pTimeline = override && Array.isArray(override.timeline) ? override.timeline : [];
      const pTimelineSize =
        override && typeof override.timelineSize === "number"
          ? override.timelineSize
          : pTimeline.length;

      playerIds.push(
        await ctx.db.insert("players", {
          lobbyId,
          sessionId: pSessionId,
          displayName: pDisplayName,
          isHost: false,
          coins: pCoins,
          timeline: pTimeline,
          timelineSize: pTimelineSize,
          createdAt: Date.now(),
        }),
      );
    }
  });

  if (!lobbyId) {
    throw new Error("Failed to create lobby");
  }

  return {
    id: lobbyId,
    record: { code, hostSessionId, status, settings } as unknown as Record<string, unknown>,
    playerIds,
  };
}

export async function createWithGame(
  t: TestContext,
  hostSessionId: string,
  playerCount: number,
  options: {
    hostDisplayName?: string;
    playerOverrides?: Array<LobbyOverrides["players"]>;
    settings?: LobbyOverrides["settings"];
  } = {},
): Promise<
  FactoryResult<"lobbies"> & {
    gameId: Id<"games">;
    playerIds: Array<Id<"players">>;
    roundId: Id<"rounds">;
  }
> {
  const lobbyResult = await createWithPlayers(t, hostSessionId, playerCount, options);

  let gameId: Id<"games"> | null = null;
  let roundId: Id<"rounds"> | null = null;

  await t.run(async (ctx: MutationCtx) => {
    const turnOrder = lobbyResult.playerIds;
    const turnPlayerId = turnOrder[0]!;

    gameId = await ctx.db.insert("games", {
      lobbyId: lobbyResult.id,
      status: "active",
      startedAt: Date.now(),
      currentRoundNumber: 1,
      turnOrder,
      turnPlayerId,
    });

    await ctx.db.patch(lobbyResult.id, { status: "in_game", activeGameId: gameId });

    const track = await ctx.db.query("tracks").first();
    if (!track) {
      throw new Error(
        "No tracks available. Please seed tracks first using factories.tracks.createMany()",
      );
    }

    roundId = await ctx.db.insert("rounds", {
      gameId,
      roundNumber: 1,
      turnPlayerId,
      trackId: track._id,
      phase: "placing",
      startedAt: Date.now(),
    });

    await ctx.db.patch(gameId, { currentRoundId: roundId });
  });

  const updatedLobby = await findById(t, lobbyResult.id);

  return {
    ...lobbyResult,
    gameId: gameId!,
    roundId: roundId!,
    record: updatedLobby!.record as unknown as Record<string, unknown>,
  };
}

export async function findByCode(
  t: TestContext,
  code: string,
): Promise<{ id: Id<"lobbies">; record: Record<string, unknown> } | null> {
  let result: { id: Id<"lobbies">; record: Record<string, unknown> } | null = null;

  await t.run(async (ctx: QueryCtx) => {
    const lobby = await ctx.db
      .query("lobbies")
      .filter((q) => q.eq(q.field("code"), code))
      .first();

    if (lobby) {
      result = { id: lobby._id, record: lobby as Record<string, unknown> };
    }
  });

  return result;
}

export async function findById(
  t: TestContext,
  lobbyId: Id<"lobbies">,
): Promise<{ id: Id<"lobbies">; record: Record<string, unknown> } | null> {
  let result: { id: Id<"lobbies">; record: Record<string, unknown> } | null = null;

  await t.run(async (ctx: QueryCtx) => {
    const lobby = await ctx.db.get(lobbyId);
    if (lobby) {
      result = { id: lobby._id, record: lobby as Record<string, unknown> };
    }
  });

  return result;
}

export { DEFAULT_SETTINGS };
