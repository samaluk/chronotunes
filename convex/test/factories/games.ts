import type { Infer } from "convex/values";
import type { Id } from "../../_generated/dataModel";
import type schema from "../../schema";
import type { TestContext } from "./types";

export type Game = Infer<typeof schema.tables.games.validator>;
export type Round = Infer<typeof schema.tables.rounds.validator>;

export interface GameOverrides {
  status?: Game["status"];
  currentRoundNumber?: number;
  turnOrder?: Game["turnOrder"];
  turnPlayerId?: Game["turnPlayerId"];
}

export interface RoundOverrides {
  roundNumber?: number;
  phase?: Round["phase"];
  trackId?: Round["trackId"];
  turnPlayerId?: Round["turnPlayerId"];
  placement?: Round["placement"];
  placementPreview?: Round["placementPreview"];
  guess?: Round["guess"];
  resolution?: Round["resolution"];
}

export async function create(
  t: TestContext,
  lobbyId: Id<"lobbies">,
  turnOrder: Array<Id<"players">>,
  overrides: GameOverrides = {},
): Promise<{ id: Id<"games">; record: Game }> {
  const turnPlayerId = overrides.turnPlayerId ?? turnOrder[0]!;

  const data: Game = {
    lobbyId,
    status: overrides.status ?? "active",
    startedAt: Date.now(),
    currentRoundNumber: overrides.currentRoundNumber ?? 1,
    turnOrder,
    turnPlayerId,
  };

  let gameId: Id<"games"> | null = null;

  await t.run(async (ctx: any) => {
    gameId = await ctx.db.insert("games", data);
    await ctx.db.patch(lobbyId, { status: "in_game", activeGameId: gameId });
  });

  if (!gameId) {
    throw new Error("Failed to create game");
  }

  return { id: gameId, record: data };
}

export async function createWithRound(
  t: TestContext,
  lobbyId: Id<"lobbies">,
  turnOrder: Array<Id<"players">>,
  options: {
    gameOverrides?: GameOverrides;
    roundOverrides?: RoundOverrides;
  } = {},
): Promise<{ id: Id<"games">; record: Game; roundId: Id<"rounds">; turnPlayerId: Id<"players"> }> {
  const turnPlayerId = options.gameOverrides?.turnPlayerId ?? turnOrder[0]!;
  let trackId: Id<"tracks"> | undefined;

  await t.run(async (ctx: any) => {
    const track = await ctx.db.query("tracks").first();
    trackId = track?._id;
  });

  if (!trackId) {
    throw new Error("No tracks available. Please seed tracks first.");
  }

  const gameData: Game = {
    lobbyId,
    status: options.gameOverrides?.status ?? "active",
    startedAt: Date.now(),
    currentRoundNumber: options.gameOverrides?.currentRoundNumber ?? 1,
    turnOrder,
    turnPlayerId,
  };

  const roundData = {
    gameId: "" as Id<"games">,
    roundNumber: options.roundOverrides?.roundNumber ?? 1,
    turnPlayerId,
    trackId,
    phase: options.roundOverrides?.phase ?? "placing",
    startedAt: Date.now(),
    ...(options.roundOverrides?.placementPreview !== undefined && {
      placementPreview: options.roundOverrides.placementPreview,
    }),
    ...(options.roundOverrides?.placement !== undefined && {
      placement: options.roundOverrides.placement,
    }),
    ...(options.roundOverrides?.guess !== undefined && {
      guess: options.roundOverrides.guess,
    }),
    ...(options.roundOverrides?.resolution !== undefined && {
      resolution: options.roundOverrides.resolution,
    }),
  };

  let gameId: Id<"games"> | null = null;
  let roundId: Id<"rounds"> | null = null;

  await t.run(async (ctx: any) => {
    gameId = await ctx.db.insert("games", gameData);
    await ctx.db.patch(lobbyId, { status: "in_game", activeGameId: gameId });

    roundData.gameId = gameId!;
    roundId = await ctx.db.insert("rounds", roundData);
    await ctx.db.patch(gameId!, { currentRoundId: roundId });
  });

  if (!(gameId && roundId)) {
    throw new Error("Failed to create game or round");
  }

  return {
    id: gameId,
    record: gameData,
    roundId,
    turnPlayerId,
  };
}

export async function createInPhase(
  t: TestContext,
  lobbyId: Id<"lobbies">,
  phase: "placing" | "betting" | "resolved",
  options: {
    playerCount?: number;
    playerIds?: Array<Id<"players">>;
    roundNumber?: number;
    placementIndex?: number;
    resolution?: Round["resolution"];
  } = {},
): Promise<{
  id: Id<"games">;
  record: Game;
  roundId: Id<"rounds">;
  playerIds: Array<Id<"players">>;
}> {
  let playerIds = options.playerIds;

  if (!playerIds) {
    await t.run(async (ctx: any) => {
      const players = await ctx.db
        .query("players")
        .filter((q: any) => q.eq(q.field("lobbyId"), lobbyId))
        .collect();
      playerIds = players.map((p: any) => p._id);
    });
  }

  if (!playerIds || playerIds.length === 0) {
    throw new Error("No players found in lobby");
  }

  const turnPlayerId = playerIds[0]!;
  let trackId: Id<"tracks"> | undefined;

  await t.run(async (ctx: any) => {
    const track = await ctx.db.query("tracks").first();
    trackId = track?._id;
  });

  if (!trackId) {
    throw new Error("No tracks available. Please seed tracks first.");
  }

  const gameData: Game = {
    lobbyId,
    status: "active",
    startedAt: Date.now(),
    currentRoundNumber: options.roundNumber ?? 1,
    turnOrder: playerIds,
    turnPlayerId,
  };

  const roundData: Round = {
    gameId: "" as Id<"games">,
    roundNumber: options.roundNumber ?? 1,
    turnPlayerId,
    trackId,
    phase,
    startedAt: Date.now(),
  };

  if (phase === "betting" || phase === "resolved") {
    roundData.placement = {
      proposedIndex: options.placementIndex ?? 0,
      submittedAt: Date.now(),
    };
  }

  if (phase === "resolved") {
    roundData.resolution = options.resolution ?? {
      validIndexMin: 0,
      validIndexMax: 1,
      turnPlayerWasCorrect: true,
      awardedPlayerIds: [],
      coinDeltas: [],
      resolvedAt: Date.now(),
    };
  }

  let gameId: Id<"games"> | null = null;
  let roundId: Id<"rounds"> | null = null;

  await t.run(async (ctx: any) => {
    gameId = await ctx.db.insert("games", gameData);
    await ctx.db.patch(lobbyId, { status: "in_game", activeGameId: gameId });

    roundData.gameId = gameId!;
    roundId = await ctx.db.insert("rounds", roundData);
    await ctx.db.patch(gameId!, { currentRoundId: roundId });
  });

  if (!(gameId && roundId)) {
    throw new Error("Failed to create game or round");
  }

  return {
    id: gameId,
    record: gameData,
    roundId,
    playerIds,
  };
}

export async function findCurrent(
  t: TestContext,
  lobbyId: Id<"lobbies">,
): Promise<{ id: Id<"games">; record: Game } | null> {
  let result: { id: Id<"games">; record: Game } | null = null;

  await t.run(async (ctx: any) => {
    const lobby = await ctx.db.get(lobbyId);
    if (lobby?.activeGameId) {
      const game = await ctx.db.get(lobby.activeGameId);
      if (game) {
        result = { id: game._id, record: game as Game };
      }
    }
  });

  return result;
}

export async function findById(
  t: TestContext,
  gameId: Id<"games">,
): Promise<{ id: Id<"games">; record: Game } | null> {
  let result: { id: Id<"games">; record: Game } | null = null;

  await t.run(async (ctx: any) => {
    const game = await ctx.db.get(gameId);
    if (game) {
      result = { id: game._id, record: game as Game };
    }
  });

  return result;
}
