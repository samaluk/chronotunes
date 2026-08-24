import type { Id } from "../../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../../_generated/server";
import {
  generateLobbyCode,
  resolveLobbySettings,
  type LobbySettings,
} from "../../lib/lobby_settings";
import { requireFirstTrackId } from "./shared";
import type { FactoryResult, LobbyOverrides, PlayerOverrides, TestContext } from "./types";

const resolvePlayerOverrides = (
  override: PlayerOverrides | undefined,
  index: number,
  settings: LobbySettings,
): Required<
  Pick<PlayerOverrides, "sessionId" | "displayName" | "coins" | "timeline" | "timelineSize">
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

export async function create(
  t: TestContext,
  sessionId: string,
  displayName: string,
  overrides: LobbyOverrides = {},
): Promise<FactoryResult<"lobbies"> & { hostPlayerId: Id<"players"> }> {
  const code = overrides.code ?? generateLobbyCode();
  const hostSessionId = sessionId;
  const status: "lobby" | "in_game" | "finished" = overrides.status ?? "lobby";
  const settings = resolveLobbySettings(overrides.settings);

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
    // oxlint-disable-next-line typescript/consistent-type-assertions, typescript/no-unsafe-type-assertion
    record: { code, hostSessionId, settings, status } as unknown as Record<string, unknown>,
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
  } = {},
): Promise<FactoryResult<"lobbies"> & { playerIds: Id<"players">[] }> {
  const hostName = options.hostDisplayName ?? "Host";
  const code = generateLobbyCode();
  const status: "lobby" | "in_game" | "finished" = "lobby";
  const settings = resolveLobbySettings(options.settings);

  let lobbyId: Id<"lobbies"> | null = null;
  const playerIds: Id<"players">[] = [];

  await t.run(async (ctx: MutationCtx) => {
    const insertedLobbyId = await ctx.db.insert("lobbies", {
      code,
      hostSessionId,
      settings,
      status,
    });
    lobbyId = insertedLobbyId;

    playerIds.push(
      await ctx.db.insert("players", {
        coins: settings.startingCoins,
        createdAt: Date.now(),
        displayName: hostName,
        isHost: true,
        lobbyId: insertedLobbyId,
        sessionId: hostSessionId,
        timeline: [],
        timelineSize: 0,
      }),
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
            lobbyId: insertedLobbyId,
            sessionId: playerData.sessionId,
            timeline: playerData.timeline,
            timelineSize: playerData.timelineSize,
          });
        }),
      )),
    );
  });

  if (!lobbyId) {
    throw new Error("Failed to create lobby");
  }

  return {
    id: lobbyId,
    playerIds,
    // oxlint-disable-next-line typescript/consistent-type-assertions, typescript/no-unsafe-type-assertion
    record: { code, hostSessionId, settings, status } as unknown as Record<string, unknown>,
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
  } = {},
): Promise<
  FactoryResult<"lobbies"> & {
    gameId: Id<"games">;
    playerIds: Id<"players">[];
    roundId: Id<"rounds">;
  }
> {
  const lobbyResult = await createWithPlayers(t, hostSessionId, playerCount, options);

  let gameId: Id<"games"> | null = null;
  let roundId: Id<"rounds"> | null = null;

  await t.run(async (ctx: MutationCtx) => {
    const turnOrder = lobbyResult.playerIds;
    // oxlint-disable-next-line typescript/no-non-null-assertion, typescript/no-unnecessary-type-assertion
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

    const trackId = await requireFirstTrackId(ctx);

    roundId = await ctx.db.insert("rounds", {
      gameId,
      phase: "placing",
      roundNumber: 1,
      startedAt: Date.now(),
      trackId,
      turnPlayerId,
    });

    await ctx.db.patch(gameId, { currentRoundId: roundId });
  });

  const updatedLobby = await findById(t, lobbyResult.id);

  return {
    ...lobbyResult,
    // oxlint-disable-next-line typescript/no-non-null-assertion
    gameId: gameId!,
    // oxlint-disable-next-line typescript/consistent-type-assertions, typescript/no-non-null-assertion, typescript/no-unnecessary-type-assertion, typescript/no-unsafe-type-assertion
    record: updatedLobby!.record as unknown as Record<string, unknown>,
    // oxlint-disable-next-line typescript/no-non-null-assertion
    roundId: roundId!,
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
      // oxlint-disable-next-line typescript/consistent-type-assertions, typescript/no-unnecessary-type-assertion
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
      // oxlint-disable-next-line typescript/consistent-type-assertions, typescript/no-unnecessary-type-assertion
      result = { id: lobby._id, record: lobby as Record<string, unknown> };
    }
  });

  return result;
}
