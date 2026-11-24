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
import type { FactoryResult, TestContext } from "./types";
import { readResult } from "./shared";

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
): Promise<FactoryResult<"games">> {
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

  return await t.run(async (ctx: MutationCtx) => {
    const gameId = await ctx.db.insert("games", data);
    await ctx.db.patch(lobbyId, { activeGameId: gameId, status: "in_game" });
    return { id: gameId, record: data };
  });
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
  const playerIds =
    options.playerIds ??
    (await t.run(async (ctx: QueryCtx) => {
      const players = await ctx.db
        .query("players")
        .filter((q) => q.eq(q.field("lobbyId"), lobbyId))
        .collect();
      return players.map((player) => player._id);
    }));

  if (playerIds.length === 0) {
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

export function findCurrent(
  t: TestContext,
  lobbyId: Id<"lobbies">,
): Promise<FactoryResult<"games"> | null> {
  return readResult(t, async (ctx: QueryCtx) => {
    const lobby = await ctx.db.get(lobbyId);
    if (!lobby?.activeGameId) {
      return null;
    }
    return await ctx.db.get(lobby.activeGameId);
  });
}

export function findById(
  t: TestContext,
  gameId: Id<"games">,
): Promise<FactoryResult<"games"> | null> {
  return readResult(t, async (ctx: QueryCtx) => ctx.db.get(gameId));
}
