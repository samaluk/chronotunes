import { ConvexError } from "convex/values";

import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

export interface GameContext {
  game: Doc<"games">;
  lobby: Doc<"lobbies">;
  round?: Doc<"rounds">;
}

export async function getGameContext(
  ctx: QueryCtx | MutationCtx,
  lobbyId: Id<"lobbies">
): Promise<GameContext> {
  const lobby = await ctx.db.get(lobbyId);

  if (!lobby) {
    throw new ConvexError("Lobby not found");
  }

  if (!lobby.activeGameId) {
    throw new ConvexError("No active game in this lobby");
  }

  const game = await ctx.db.get(lobby.activeGameId);

  if (!game) {
    throw new ConvexError("Game not found");
  }

  let round: Doc<"rounds"> | undefined;

  if (game.currentRoundId) {
    round = (await ctx.db.get(game.currentRoundId)) ?? undefined;
  }

  return { game, lobby, round };
}

export async function getPlayerBySession(
  ctx: QueryCtx | MutationCtx,
  lobbyId: Id<"lobbies">,
  sessionId: string
): Promise<Doc<"players">> {
  const player = await ctx.db
    .query("players")
    .withIndex("by_lobby_and_session", (q) =>
      q.eq("lobbyId", lobbyId).eq("sessionId", sessionId)
    )
    .unique();

  if (!player) {
    throw new ConvexError("Player not found in this lobby");
  }

  return player;
}

export async function getLobbyPlayers(
  ctx: QueryCtx | MutationCtx,
  lobbyId: Id<"lobbies">
): Promise<Doc<"players">[]> {
  return await ctx.db
    .query("players")
    .filter((q) => q.eq(q.field("lobbyId"), lobbyId))
    .collect();
}

export async function getGameAndRound(
  ctx: QueryCtx | MutationCtx,
  lobbyId: Id<"lobbies">
): Promise<{ game: Doc<"games">; round: Doc<"rounds"> }> {
  const lobby = await ctx.db.get(lobbyId);

  if (!lobby?.activeGameId) {
    throw new ConvexError("No active game in this lobby");
  }

  const game = await ctx.db.get(lobby.activeGameId);

  if (!game?.currentRoundId) {
    throw new ConvexError("Game or round not found");
  }

  const round = await ctx.db.get(game.currentRoundId);

  if (!round) {
    throw new ConvexError("Round not found");
  }

  return { game, round };
}
