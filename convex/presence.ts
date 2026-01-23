import { Presence } from "@convex-dev/presence";
import { v } from "convex/values";
import { components } from "./_generated/api";
import { mutation, query } from "./_generated/server";

const presenceComponent = new Presence(components.presence);

export const sendHeartbeat = mutation({
  args: {
    roomId: v.string(),
    userId: v.string(),
    sessionId: v.string(),
    interval: v.optional(v.number()),
  },
  handler: async (ctx, { roomId, userId, sessionId, interval }) => {
    return await presenceComponent.heartbeat(ctx, roomId, userId, sessionId, interval ?? 15_000);
  },
});

export const getPresenceList = query({
  args: { roomToken: v.string() },
  handler: async (ctx, { roomToken }) => {
    return await presenceComponent.list(ctx, roomToken);
  },
});

export const disconnectPresence = mutation({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    return await presenceComponent.disconnect(ctx, sessionToken);
  },
});

export const getRoomPresence = query({
  args: { roomId: v.string(), onlineOnly: v.optional(v.boolean()) },
  handler: async (ctx, { roomId, onlineOnly }) => {
    return await presenceComponent.listRoom(ctx, roomId, onlineOnly);
  },
});

export const getPlayerPresence = query({
  args: { playerId: v.string(), onlineOnly: v.optional(v.boolean()) },
  handler: async (ctx, { playerId, onlineOnly }) => {
    return await presenceComponent.listUser(ctx, playerId, onlineOnly);
  },
});
