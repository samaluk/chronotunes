import type { Id } from "../../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../../_generated/server";
import { generateLobbyCode, resolveLobbySettings } from "../../lib/lobby_settings";
import { buildPlayerData } from "./players";
import { requireFirstTrackId, readResult, readFirstWhere } from "./shared";
import type { FactoryResult, LobbyOverrides, PlayerOverrides, TestContext } from "./types";

async function insertLobbyWithHost(
  ctx: MutationCtx,
  sessionId: string,
  displayName: string,
  overrides: LobbyOverrides = {},
): Promise<FactoryResult<"lobbies"> & { hostPlayerId: Id<"players"> }> {
  const code = overrides.code ?? generateLobbyCode();
  const hostSessionId = sessionId;
  const status: "lobby" | "in_game" | "finished" = overrides.status ?? "lobby";
  const settings = resolveLobbySettings(overrides.settings);

  const record = { code, hostSessionId, settings, status };
  const lobbyId = await ctx.db.insert("lobbies", record);
  const hostPlayerId = await ctx.db.insert(
    "players",
    buildPlayerData(
      lobbyId,
      {
        coins: settings.startingCoins,
        displayName,
        isHost: true,
        sessionId,
      },
      1,
    ),
  );
  return { hostPlayerId, id: lobbyId, record };
}

export async function create(
  t: TestContext,
  sessionId: string,
  displayName: string,
  overrides: LobbyOverrides = {},
): Promise<FactoryResult<"lobbies"> & { hostPlayerId: Id<"players"> }> {
  return await t.run(async (ctx: MutationCtx) =>
    insertLobbyWithHost(ctx, sessionId, displayName, overrides),
  );
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
  return await t.run(async (ctx: MutationCtx) => {
    const {
      id: lobbyId,
      hostPlayerId,
      record,
    } = await insertLobbyWithHost(ctx, hostSessionId, hostName, { settings: options.settings });
    const guestPlayerIds = await Promise.all(
      Array.from({ length: playerCount }, (_, i) => {
        const override = options.playerOverrides?.[i];
        return ctx.db.insert(
          "players",
          buildPlayerData(
            lobbyId,
            {
              ...override,
              coins: override?.coins ?? record.settings.startingCoins,
              sessionId: override?.sessionId ?? `player-${i + 1}-session`,
              isHost: false,
            },
            i + 1,
          ),
        );
      }),
    );
    return { id: lobbyId, playerIds: [hostPlayerId, ...guestPlayerIds], record };
  });
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

  const { gameId, roundId } = await t.run(async (ctx: MutationCtx) => {
    const turnOrder = lobbyResult.playerIds;
    // oxlint-disable-next-line typescript/no-non-null-assertion, typescript/no-unnecessary-type-assertion
    const turnPlayerId = turnOrder[0]!;

    const gameId = await ctx.db.insert("games", {
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

    const roundId = await ctx.db.insert("rounds", {
      gameId,
      phase: "placing",
      roundNumber: 1,
      startedAt: Date.now(),
      trackId,
      turnPlayerId,
    });

    await ctx.db.patch(gameId, { currentRoundId: roundId });
    return { gameId, roundId };
  });

  const updatedLobby = await findById(t, lobbyResult.id);
  if (!updatedLobby) {
    throw new Error("Created lobby not found");
  }

  return {
    ...lobbyResult,
    gameId,
    record: updatedLobby.record,
    roundId,
  };
}

export async function findByCode(
  t: TestContext,
  code: string,
): Promise<FactoryResult<"lobbies"> | null> {
  return await readFirstWhere(t, "lobbies", (q) => q.eq(q.field("code"), code));
}

export async function findById(
  t: TestContext,
  lobbyId: Id<"lobbies">,
): Promise<FactoryResult<"lobbies"> | null> {
  return await readResult(t, async (ctx: QueryCtx) => ctx.db.get(lobbyId));
}
