import { v } from "convex/values";
import { query } from "./_generated/server";

export const list = query({
  args: { lobbyId: v.id("lobbies") },
  handler: async (ctx, args) => {
    const { lobbyId } = args;

    const players = await ctx.db
      .query("players")
      .filter((q) => q.eq(q.field("lobbyId"), lobbyId))
      .collect();

    return players;
  },
});

export const getMe = query({
  args: { lobbyId: v.id("lobbies"), sessionId: v.string() },
  handler: async (ctx, args) => {
    const { lobbyId, sessionId } = args;

    const player = await ctx.db
      .query("players")
      .filter((q) =>
        q.and(q.eq(q.field("lobbyId"), lobbyId), q.eq(q.field("sessionId"), sessionId)),
      )
      .first();

    return player;
  },
});
