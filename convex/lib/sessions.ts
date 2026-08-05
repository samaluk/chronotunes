import { customAction, customMutation, customQuery } from "convex-helpers/server/customFunctions";
import { runSessionFunctions, SessionIdArg } from "convex-helpers/server/sessions";
import type { SessionId } from "convex-helpers/server/sessions";

import { action, mutation, query } from "../_generated/server";

export type { SessionId } from "convex-helpers/server/sessions";

/**
 * Helper to cast a string to SessionId for testing purposes.
 * Only use this in test files.
 */
export function asSessionId(id: string): SessionId {
  return id as unknown as SessionId;
}

/**
 * Query wrapper that automatically injects sessionId into context.
 * Use for queries that need session context.
 *
 * @example
 * ```ts
 * export const getMe = queryWithSession({
 *   args: { lobbyId: v.id("lobbies") },
 *   handler: async (ctx, { lobbyId }) => {
 *     const player = await ctx.db
 *       .query("players")
 *       .withIndex("by_lobby_and_session", (q) =>
 *         q.eq("lobbyId", lobbyId).eq("sessionId", ctx.sessionId)
 *       )
 *       .unique();
 *     return player;
 *   },
 * });
 * ```
 */
export const queryWithSession = customQuery(query, {
  args: { ...SessionIdArg },
  input: (ctx, { sessionId }) => ({ args: {}, ctx: { ...ctx, sessionId } }),
});

/**
 * Mutation wrapper that automatically injects sessionId into context.
 * Use for mutations that need session context.
 *
 * @example
 * ```ts
 * export const create = mutationWithSession({
 *   args: { displayName: v.string() },
 *   handler: async (ctx, { displayName }) => {
 *     const lobbyId = await ctx.db.insert("lobbies", {
 *       hostSessionId: ctx.sessionId,
 *       // ...
 *     });
 *     return { lobbyId };
 *   },
 * });
 * ```
 */
export const mutationWithSession = customMutation(mutation, {
  args: { ...SessionIdArg },
  input: (ctx, { sessionId }) => ({ args: {}, ctx: { ...ctx, sessionId } }),
});

/**
 * Action wrapper that automatically injects sessionId into context.
 * Use for actions that need session context.
 */
export const actionWithSession = customAction(action, {
  args: { ...SessionIdArg },
  input: (ctx, { sessionId }) => ({
    args: {},
    ctx: {
      ...ctx,
      ...runSessionFunctions(ctx, sessionId),
      sessionId,
    },
  }),
});
