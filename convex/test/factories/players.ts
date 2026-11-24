import type { Infer } from "convex/values";

import type { Id } from "../../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../../_generated/server";
import type schema from "../../schema";
import { readResult, readFirstWhere, readAllWhere } from "./shared";
import type { FactoryResult, TestContext } from "./types";
import { uuid } from "./types";

export type Player = Infer<typeof schema.tables.players.validator>;

export interface PlayerOverrides {
  coins?: number;
  displayName?: string;
  isHost?: boolean;
  sessionId?: string;
  timeline?: Player["timeline"];
  timelineSize?: number;
}

export function buildPlayerData(
  lobbyId: Id<"lobbies">,
  overrides: PlayerOverrides,
  index: number,
): Player {
  const sessionId = overrides.sessionId ?? uuid();
  return {
    coins: overrides.coins ?? 3,
    createdAt: Date.now(),
    displayName: overrides.displayName ?? `Player ${index}`,
    isHost: overrides.isHost ?? false,
    lobbyId,
    sessionId,
    timeline: overrides.timeline ?? [],
    timelineSize: overrides.timelineSize ?? overrides.timeline?.length ?? 0,
  };
}

export async function create(
  t: TestContext,
  lobbyId: Id<"lobbies">,
  overrides: PlayerOverrides = {},
): Promise<FactoryResult<"players">> {
  const data = buildPlayerData(lobbyId, overrides, 1);
  return await t.run(async (ctx: MutationCtx) => {
    const playerId = await ctx.db.insert("players", data);
    return { id: playerId, record: data };
  });
}

export function createHost(
  t: TestContext,
  lobbyId: Id<"lobbies">,
  sessionId: string,
  displayName: string,
  overrides: PlayerOverrides = {},
): Promise<FactoryResult<"players">> {
  return create(t, lobbyId, {
    ...overrides,
    displayName,
    isHost: true,
    sessionId,
  });
}

export async function createMany(
  t: TestContext,
  lobbyId: Id<"lobbies">,
  count: number,
  overrides: PlayerOverrides = {},
): Promise<FactoryResult<"players">[]> {
  return await Promise.all(
    Array.from({ length: count }, (_, i) => {
      const isHost = overrides.isHost ?? i === 0;
      const index = i + 1;
      const data = buildPlayerData(lobbyId, { ...overrides, isHost }, index);

      return t.run(async (ctx: MutationCtx) => {
        const playerId = await ctx.db.insert("players", data);
        return { id: playerId, record: data };
      });
    }),
  );
}

export function createWithTimeline(
  t: TestContext,
  lobbyId: Id<"lobbies">,
  timeline: Player["timeline"],
  overrides: PlayerOverrides = {},
): Promise<FactoryResult<"players">> {
  return create(t, lobbyId, {
    ...overrides,
    timeline,
    timelineSize: timeline.length,
  });
}

export function createWithCoins(
  t: TestContext,
  lobbyId: Id<"lobbies">,
  coins: number,
  overrides: PlayerOverrides = {},
): Promise<FactoryResult<"players">> {
  return create(t, lobbyId, {
    ...overrides,
    coins,
  });
}

export function findBySessionId(
  t: TestContext,
  sessionId: string,
): Promise<FactoryResult<"players"> | null> {
  return readFirstWhere(t, "players", (q) => q.eq(q.field("sessionId"), sessionId));
}

export function findById(
  t: TestContext,
  playerId: Id<"players">,
): Promise<FactoryResult<"players"> | null> {
  return readResult(t, async (ctx: QueryCtx) => ctx.db.get(playerId));
}

export function getAllInLobby(
  t: TestContext,
  lobbyId: Id<"lobbies">,
): Promise<FactoryResult<"players">[]> {
  return readAllWhere(t, "players", (q) => q.eq(q.field("lobbyId"), lobbyId));
}
