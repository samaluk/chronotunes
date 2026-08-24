import type { Infer } from "convex/values";

import type { Id } from "../../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../../_generated/server";
import type schema from "../../schema";
import {
  create as createRound,
  createInPhase as createRoundInPhase,
  type Round,
  type RoundOverrides,
} from "./rounds";
import type { TestContext } from "./types";

export type Game = Infer<typeof schema.tables.games.validator>;
export type { Round, RoundOverrides };

export interface GameOverrides {
  currentRoundNumber?: number;
  status?: Game["status"];
  turnOrder?: Game["turnOrder"];
  turnPlayerId?: Game["turnPlayerId"];
}

export async function create(
  t: TestContext,
  lobbyId: Id<"lobbies">,
  turnOrder: Id<"players">[],
  overrides: GameOverrides = {},
): Promise<{ id: Id<"games">; record: Game }> {
  // oxlint-disable-next-line typescript/no-non-null-assertion, typescript/no-unnecessary-type-assertion
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
  } = {},
): Promise<{
  id: Id<"games">;
  record: Game;
  roundId: Id<"rounds">;
  turnPlayerId: Id<"players">;
}> {
  const game = await create(t, lobbyId, turnOrder, options.gameOverrides);
  const round = await createRound(t, game.id, options.roundOverrides);

  await t.run(async (ctx: MutationCtx) => {
    await ctx.db.patch(game.id, { currentRoundId: round.id });
  });

  return {
    id: game.id,
    record: game.record,
    roundId: round.id,
    turnPlayerId: round.record.turnPlayerId,
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
  } = {},
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

  const game = await create(t, lobbyId, playerIds, {
    currentRoundNumber: options.roundNumber,
  });
  const round = await createRoundInPhase(t, game.id, phase, options);

  await t.run(async (ctx: MutationCtx) => {
    await ctx.db.patch(game.id, { currentRoundId: round.id });
  });

  return { id: game.id, playerIds, record: game.record, roundId: round.id };
}

export async function findCurrent(
  t: TestContext,
  lobbyId: Id<"lobbies">,
): Promise<{ id: Id<"games">; record: Game } | null> {
  let result: { id: Id<"games">; record: Game } | null = null;

  await t.run(async (ctx: QueryCtx) => {
    const lobby = await ctx.db.get(lobbyId);
    if (lobby?.activeGameId) {
      const game = await ctx.db.get(lobby.activeGameId);
      if (game) {
        // oxlint-disable-next-line typescript/consistent-type-assertions, typescript/no-unnecessary-type-assertion
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

  await t.run(async (ctx: QueryCtx) => {
    const game = await ctx.db.get(gameId);
    if (game) {
      // oxlint-disable-next-line typescript/consistent-type-assertions, typescript/no-unnecessary-type-assertion
      result = { id: game._id, record: game as Game };
    }
  });

  return result;
}
