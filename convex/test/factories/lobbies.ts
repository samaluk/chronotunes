import type { Id } from "../../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../../_generated/server";
import type {
  FactoryResult,
  LobbyOverrides,
  PlayerOverrides,
  TestContext,
} from "./types";

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

interface LobbySettings {
  allowBetRetraction: boolean;
  allowGuessTitleArtist: boolean;
  bettingWindowSeconds: number;
  maxYear: number;
  minYear: number;
  showLiveBets: boolean;
  startingCoins: number;
  targetTimelineSize: number;
  turnSeconds: number;
}

const resolvePlayerOverrides = (
  override: PlayerOverrides | undefined,
  index: number,
  settings: LobbySettings
): Required<
  Pick<
    PlayerOverrides,
    "sessionId" | "displayName" | "coins" | "timeline" | "timelineSize"
  >
> => {
  const sessionId = override?.sessionId ?? `player-${index + 1}-session`;
  const displayName = override?.displayName ?? `Player ${index + 1}`;
  const coins = override?.coins ?? settings.startingCoins;
  const timeline = override?.timeline ?? [];
  const timelineSize = override?.timelineSize ?? timeline.length;

  return {
    coins,
    displayName,
    sessionId,
    timeline,
    timelineSize,
  };
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

export async function create(
  t: TestContext,
  sessionId: string,
  displayName: string,
  overrides: LobbyOverrides = {}
): Promise<FactoryResult<"lobbies"> & { hostPlayerId: Id<"players"> }> {
  const code = overrides.code ?? generateLobbyCode();
  const hostSessionId = sessionId;
  const status: "lobby" | "in_game" | "finished" = overrides.status ?? "lobby";
  const settings = {
    allowBetRetraction:
      overrides.settings?.allowBetRetraction ??
      DEFAULT_SETTINGS.allowBetRetraction,
    allowGuessTitleArtist:
      overrides.settings?.allowGuessTitleArtist ??
      DEFAULT_SETTINGS.allowGuessTitleArtist,
    bettingWindowSeconds:
      overrides.settings?.bettingWindowSeconds ??
      DEFAULT_SETTINGS.bettingWindowSeconds,
    maxYear: overrides.settings?.maxYear ?? DEFAULT_SETTINGS.maxYear,
    minYear: overrides.settings?.minYear ?? DEFAULT_SETTINGS.minYear,
    showLiveBets:
      overrides.settings?.showLiveBets ?? DEFAULT_SETTINGS.showLiveBets,
    startingCoins:
      overrides.settings?.startingCoins ?? DEFAULT_SETTINGS.startingCoins,
    targetTimelineSize:
      overrides.settings?.targetTimelineSize ??
      DEFAULT_SETTINGS.targetTimelineSize,
    turnSeconds:
      overrides.settings?.turnSeconds ?? DEFAULT_SETTINGS.turnSeconds,
  };

  let lobbyId: Id<"lobbies"> | null = null;
  let hostPlayerId: Id<"players"> | null = null;

  await t.run(async (ctx: MutationCtx) => {
    lobbyId = await ctx.db.insert("lobbies", {
      code,
      hostSessionId,
      settings,
      status,
    });

    hostPlayerId = await ctx.db.insert("players", {
      coins: settings.startingCoins,
      createdAt: Date.now(),
      displayName,
      isHost: true,
      lobbyId,
      sessionId,
      timeline: [],
      timelineSize: 0,
    });
  });

  if (!(lobbyId && hostPlayerId)) {
    throw new Error("Failed to create lobby");
  }

  return {
    hostPlayerId,
    id: lobbyId,
    record: { code, hostSessionId, settings, status } as unknown as Record<
      string,
      unknown
    >,
  };
}

export async function createWithPlayers(
  t: TestContext,
  hostSessionId: string,
  playerCount: number,
  options: {
    hostDisplayName?: string;
    playerOverrides?: PlayerOverrides[];
    settings?: LobbyOverrides["settings"];
  } = {}
): Promise<FactoryResult<"lobbies"> & { playerIds: Id<"players">[] }> {
  const hostName = options.hostDisplayName ?? "Host";
  const code = generateLobbyCode();
  const status: "lobby" | "in_game" | "finished" = "lobby";
  const settings = {
    allowBetRetraction:
      options.settings?.allowBetRetraction ??
      DEFAULT_SETTINGS.allowBetRetraction,
    allowGuessTitleArtist:
      options.settings?.allowGuessTitleArtist ??
      DEFAULT_SETTINGS.allowGuessTitleArtist,
    bettingWindowSeconds:
      options.settings?.bettingWindowSeconds ??
      DEFAULT_SETTINGS.bettingWindowSeconds,
    maxYear: options.settings?.maxYear ?? DEFAULT_SETTINGS.maxYear,
    minYear: options.settings?.minYear ?? DEFAULT_SETTINGS.minYear,
    showLiveBets:
      options.settings?.showLiveBets ?? DEFAULT_SETTINGS.showLiveBets,
    startingCoins:
      options.settings?.startingCoins ?? DEFAULT_SETTINGS.startingCoins,
    targetTimelineSize:
      options.settings?.targetTimelineSize ??
      DEFAULT_SETTINGS.targetTimelineSize,
    turnSeconds: options.settings?.turnSeconds ?? DEFAULT_SETTINGS.turnSeconds,
  };

  let lobbyId: Id<"lobbies"> | null = null;
  const playerIds: Id<"players">[] = [];

  await t.run(async (ctx: MutationCtx) => {
    lobbyId = await ctx.db.insert("lobbies", {
      code,
      hostSessionId,
      settings,
      status,
    });

    playerIds.push(
      await ctx.db.insert("players", {
        coins: settings.startingCoins,
        createdAt: Date.now(),
        displayName: hostName,
        isHost: true,
        lobbyId,
        sessionId: hostSessionId,
        timeline: [],
        timelineSize: 0,
      })
    );

    playerIds.push(
      ...(await Promise.all(
        Array.from({ length: playerCount }, (_, i) => {
          const override = options.playerOverrides?.[i];
          const playerData = resolvePlayerOverrides(override, i, settings);

          return ctx.db.insert("players", {
            coins: playerData.coins,
            createdAt: Date.now(),
            displayName: playerData.displayName,
            isHost: false,
            lobbyId,
            sessionId: playerData.sessionId,
            timeline: playerData.timeline,
            timelineSize: playerData.timelineSize,
          });
        })
      ))
    );
  });

  if (!lobbyId) {
    throw new Error("Failed to create lobby");
  }

  return {
    id: lobbyId,
    playerIds,
    record: { code, hostSessionId, settings, status } as unknown as Record<
      string,
      unknown
    >,
  };
}

export async function createWithGame(
  t: TestContext,
  hostSessionId: string,
  playerCount: number,
  options: {
    hostDisplayName?: string;
    playerOverrides?: PlayerOverrides[];
    settings?: LobbyOverrides["settings"];
  } = {}
): Promise<
  FactoryResult<"lobbies"> & {
    gameId: Id<"games">;
    playerIds: Id<"players">[];
    roundId: Id<"rounds">;
  }
> {
  const lobbyResult = await createWithPlayers(
    t,
    hostSessionId,
    playerCount,
    options
  );

  let gameId: Id<"games"> | null = null;
  let roundId: Id<"rounds"> | null = null;

  await t.run(async (ctx: MutationCtx) => {
    const turnOrder = lobbyResult.playerIds;
    const turnPlayerId = turnOrder[0]!;

    gameId = await ctx.db.insert("games", {
      currentRoundNumber: 1,
      lobbyId: lobbyResult.id,
      startedAt: Date.now(),
      status: "active",
      turnOrder,
      turnPlayerId,
    });

    await ctx.db.patch(lobbyResult.id, {
      activeGameId: gameId,
      status: "in_game",
    });

    const track = await ctx.db.query("tracks").first();
    if (!track) {
      throw new Error(
        "No tracks available. Please seed tracks first using factories.tracks.createMany()"
      );
    }

    roundId = await ctx.db.insert("rounds", {
      gameId,
      phase: "placing",
      roundNumber: 1,
      startedAt: Date.now(),
      trackId: track._id,
      turnPlayerId,
    });

    await ctx.db.patch(gameId, { currentRoundId: roundId });
  });

  const updatedLobby = await findById(t, lobbyResult.id);

  return {
    ...lobbyResult,
    gameId: gameId!,
    record: updatedLobby!.record as unknown as Record<string, unknown>,
    roundId: roundId!,
  };
}

export async function findByCode(
  t: TestContext,
  code: string
): Promise<{ id: Id<"lobbies">; record: Record<string, unknown> } | null> {
  let result: { id: Id<"lobbies">; record: Record<string, unknown> } | null =
    null;

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
  lobbyId: Id<"lobbies">
): Promise<{ id: Id<"lobbies">; record: Record<string, unknown> } | null> {
  let result: { id: Id<"lobbies">; record: Record<string, unknown> } | null =
    null;

  await t.run(async (ctx: QueryCtx) => {
    const lobby = await ctx.db.get(lobbyId);
    if (lobby) {
      result = { id: lobby._id, record: lobby as Record<string, unknown> };
    }
  });

  return result;
}

export { DEFAULT_SETTINGS };
