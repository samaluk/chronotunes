import { v } from "convex/values";

import { query } from "./_generated/server";
import { queryWithSession } from "./lib/sessions";

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

export const getMe = queryWithSession({
  args: { lobbyId: v.id("lobbies") },
  handler: async (ctx, args) => {
    const { lobbyId } = args;
    const { sessionId } = ctx;

    const player = await ctx.db
      .query("players")
      .withIndex("by_lobby_and_session", (q) =>
        q.eq("lobbyId", lobbyId).eq("sessionId", sessionId)
      )
      .unique();

    return player;
  },
});
