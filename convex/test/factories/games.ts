import type { Infer } from "convex/values";

import type { Id } from "../../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../../_generated/server";
import type schema from "../../schema";
import type { TestContext } from "./types";

export type Game = Infer<typeof schema.tables.games.validator>;
export type Round = Infer<typeof schema.tables.rounds.validator>;

export interface GameOverrides {
  currentRoundNumber?: number;
  status?: Game["status"];
  turnOrder?: Game["turnOrder"];
  turnPlayerId?: Game["turnPlayerId"];
}

export interface RoundOverrides {
  guess?: Round["guess"];
  phase?: Round["phase"];
  placement?: Round["placement"];
  placementPreview?: Round["placementPreview"];
  resolution?: Round["resolution"];
  roundNumber?: number;
  trackId?: Round["trackId"];
  turnPlayerId?: Round["turnPlayerId"];
}

export async function create(
  t: TestContext,
  lobbyId: Id<"lobbies">,
  turnOrder: Id<"players">[],
  overrides: GameOverrides = {}
): Promise<{ id: Id<"games">; record: Game }> {
  const turnPlayerId = overrides.turnPlayerId ?? turnOrder[0]!;

  const data: Game = {
    currentRoundNumber: overrides.currentRoundNumber ?? 1,
    lobbyId,
    startedAt: Date.now(),
    status: overrides.status ?? "active",
    turnOrder,
    turnPlayerId,
  };

  let gameId: Id<"games"> | null = null;

  await t.run(async (ctx: MutationCtx) => {
    gameId = await ctx.db.insert("games", data);
    await ctx.db.patch(lobbyId, { activeGameId: gameId, status: "in_game" });
  });

  if (!gameId) {
    throw new Error("Failed to create game");
  }

  return { id: gameId, record: data };
}

export async function createWithRound(
  t: TestContext,
  lobbyId: Id<"lobbies">,
  turnOrder: Id<"players">[],
  options: {
    gameOverrides?: GameOverrides;
    roundOverrides?: RoundOverrides;
  } = {}
): Promise<{
  id: Id<"games">;
  record: Game;
  roundId: Id<"rounds">;
  turnPlayerId: Id<"players">;
}> {
  const turnPlayerId = options.gameOverrides?.turnPlayerId ?? turnOrder[0]!;
  let trackId: Id<"tracks"> | undefined;

  await t.run(async (ctx: QueryCtx) => {
    const track = await ctx.db.query("tracks").first();
    trackId = track?._id;
  });

  if (!trackId) {
    throw new Error("No tracks available. Please seed tracks first.");
  }

  const gameData: Game = {
    currentRoundNumber: options.gameOverrides?.currentRoundNumber ?? 1,
    lobbyId,
    startedAt: Date.now(),
    status: options.gameOverrides?.status ?? "active",
    turnOrder,
    turnPlayerId,
  };

  const roundData = {
    gameId: "" as Id<"games">,
    phase: options.roundOverrides?.phase ?? "placing",
    roundNumber: options.roundOverrides?.roundNumber ?? 1,
    startedAt: Date.now(),
    trackId,
    turnPlayerId,
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

  await t.run(async (ctx: MutationCtx) => {
    gameId = await ctx.db.insert("games", gameData);
    await ctx.db.patch(lobbyId, { activeGameId: gameId, status: "in_game" });

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
    playerIds?: Id<"players">[];
    roundNumber?: number;
    placementIndex?: number;
    resolution?: Round["resolution"];
  } = {}
): Promise<{
  id: Id<"games">;
  record: Game;
  roundId: Id<"rounds">;
  playerIds: Id<"players">[];
}> {
  let { playerIds } = options;

  if (!playerIds) {
    await t.run(async (ctx: QueryCtx) => {
      const players = await ctx.db
        .query("players")
        .filter((q) => q.eq(q.field("lobbyId"), lobbyId))
        .collect();
      playerIds = players.map((player) => player._id);
    });
  }

  if (!playerIds || playerIds.length === 0) {
    throw new Error("No players found in lobby");
  }

  const turnPlayerId = playerIds[0]!;
  let trackId: Id<"tracks"> | undefined;

  await t.run(async (ctx: QueryCtx) => {
    const track = await ctx.db.query("tracks").first();
    trackId = track?._id;
  });

  if (!trackId) {
    throw new Error("No tracks available. Please seed tracks first.");
  }

  const gameData: Game = {
    currentRoundNumber: options.roundNumber ?? 1,
    lobbyId,
    startedAt: Date.now(),
    status: "active",
    turnOrder: playerIds,
    turnPlayerId,
  };

  const roundData: Round = {
    gameId: "" as Id<"games">,
    phase,
    roundNumber: options.roundNumber ?? 1,
    startedAt: Date.now(),
    trackId,
    turnPlayerId,
  };

  if (phase === "betting" || phase === "resolved") {
    roundData.placement = {
      proposedIndex: options.placementIndex ?? 0,
      submittedAt: Date.now(),
    };
  }

  if (phase === "resolved") {
    roundData.resolution = options.resolution ?? {
      awardedPlayerIds: [],
      coinDeltas: [],
      resolvedAt: Date.now(),
      turnPlayerWasCorrect: true,
      validIndexMax: 1,
      validIndexMin: 0,
    };
  }

  let gameId: Id<"games"> | null = null;
  let roundId: Id<"rounds"> | null = null;

  await t.run(async (ctx: MutationCtx) => {
    gameId = await ctx.db.insert("games", gameData);
    await ctx.db.patch(lobbyId, { activeGameId: gameId, status: "in_game" });

    roundData.gameId = gameId!;
    roundId = await ctx.db.insert("rounds", roundData);
    await ctx.db.patch(gameId!, { currentRoundId: roundId });
  });

  if (!(gameId && roundId)) {
    throw new Error("Failed to create game or round");
  }

  return {
    id: gameId,
    playerIds,
    record: gameData,
    roundId,
  };
}

export async function findCurrent(
  t: TestContext,
  lobbyId: Id<"lobbies">
): Promise<{ id: Id<"games">; record: Game } | null> {
  let result: { id: Id<"games">; record: Game } | null = null;

  await t.run(async (ctx: QueryCtx) => {
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
  gameId: Id<"games">
): Promise<{ id: Id<"games">; record: Game } | null> {
  let result: { id: Id<"games">; record: Game } | null = null;

  await t.run(async (ctx: QueryCtx) => {
    const game = await ctx.db.get(gameId);
    if (game) {
      result = { id: game._id, record: game as Game };
    }
  });

  return result;
}
