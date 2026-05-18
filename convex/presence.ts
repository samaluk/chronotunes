import { Presence } from "@convex-dev/presence";
import { v } from "convex/values";

import { components } from "./_generated/api";
import { mutation, query } from "./_generated/server";

const presenceComponent = new Presence(components.presence);

export const sendHeartbeat = mutation({
  args: {
    interval: v.optional(v.number()),
    roomId: v.string(),
    sessionId: v.string(),
    userId: v.string(),
  },
  handler: async (ctx, { roomId, userId, sessionId, interval }) =>
    await presenceComponent.heartbeat(
      ctx,
      roomId,
      userId,
      sessionId,
      interval ?? 15_000
    ),
});

export const getPresenceList = query({
  args: { roomToken: v.string() },
  handler: async (ctx, { roomToken }) =>
    await presenceComponent.list(ctx, roomToken),
});

export const disconnectPresence = mutation({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) =>
    await presenceComponent.disconnect(ctx, sessionToken),
});

export const getRoomPresence = query({
  args: { onlineOnly: v.optional(v.boolean()), roomId: v.string() },
  handler: async (ctx, { roomId, onlineOnly }) =>
    await presenceComponent.listRoom(ctx, roomId, onlineOnly),
});

export const getPlayerPresence = query({
  args: { onlineOnly: v.optional(v.boolean()), playerId: v.string() },
  handler: async (ctx, { playerId, onlineOnly }) =>
    await presenceComponent.listUser(ctx, playerId, onlineOnly),
});
