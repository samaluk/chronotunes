import { Presence } from "@convex-dev/presence";

import { components } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { internalMutation } from "./_generated/server";

const presenceComponent = new Presence(components.presence);

const HEARTBEAT_TIMEOUT_MS = 10_000;
const HOST_TRANSFER_DEADLINE_MS = 30_000;

interface PresenceEntry {
  lastDisconnected?: number;
  online?: boolean;
}

/**
 * Shared presence heuristic of both mutations, extracted verbatim: an entry
 * qualifies when it is marked online, carries a `lastDisconnected` timestamp,
 * and that timestamp predates the cutoff. A lobby/host/player with no
 * qualifying entry takes the "no live presence" path. The published presence
 * type omits `lastDisconnected`, so it is read structurally here. The exact
 * branches are pinned by host_disconnect.test.ts.
 */
export function hasQualifyingPresence(entries: readonly unknown[], cutoffTime: number): boolean {
  return entries.some((rawEntry) => {
    // oxlint-disable-next-line typescript/consistent-type-assertions, typescript/no-unsafe-type-assertion -- presence entries carry lastDisconnected at runtime
    const entry = rawEntry as PresenceEntry;
    return (
      entry.online === true &&
      entry.lastDisconnected !== undefined &&
      entry.lastDisconnected < cutoffTime
    );
  });
}

function isHostTransferPending(lobby: Doc<"lobbies">, now: number): boolean {
  return Boolean(lobby.hostTransferDeadline && lobby.hostTransferDeadline > now);
}

async function pauseActiveGameIfNeeded(ctx: MutationCtx, lobby: Doc<"lobbies">): Promise<void> {
  if (!(lobby.status === "in_game" && lobby.activeGameId)) {
    return;
  }
  const game = await ctx.db.get(lobby.activeGameId);
  if (game?.status === "active") {
    await ctx.db.patch(game._id, { status: "paused" });
  }
}

async function resumePausedGameIfNeeded(ctx: MutationCtx, lobby: Doc<"lobbies">): Promise<void> {
  if (!(lobby.status === "in_game" && lobby.activeGameId)) {
    return;
  }
  const game = await ctx.db.get(lobby.activeGameId);
  if (game?.status === "paused") {
    await ctx.db.patch(game._id, { status: "active" });
  }
}

export const checkHostDisconnect = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const cutoffTime = now - HEARTBEAT_TIMEOUT_MS;

    const lobbies = await ctx.db
      .query("lobbies")
      .filter((q) => q.or(q.eq(q.field("status"), "lobby"), q.eq(q.field("status"), "in_game")))
      .collect();

    await Promise.all(
      lobbies.map(async (lobby) => {
        if (isHostTransferPending(lobby, now)) {
          return;
        }

        const hostPresence = await presenceComponent.listUser(ctx, lobby.hostSessionId, false);

        if (hasQualifyingPresence(hostPresence, cutoffTime)) {
          return;
        }

        await ctx.db.patch(lobby._id, { hostTransferDeadline: now + HOST_TRANSFER_DEADLINE_MS });
        await pauseActiveGameIfNeeded(ctx, lobby);
      }),
    );
  },
});

export const checkHostTransfer = internalMutation({
  handler: async (ctx) => {
    const now = Date.now();

    const lobbies = await ctx.db
      .query("lobbies")
      .filter((q) =>
        q.and(
          q.or(q.eq(q.field("status"), "lobby"), q.eq(q.field("status"), "in_game")),
          q.neq(q.field("hostTransferDeadline"), undefined),
          q.lt(q.field("hostTransferDeadline"), now),
        ),
      )
      .collect();

    await Promise.all(
      lobbies.map(async (lobby) => {
        const players = await ctx.db
          .query("players")
          .filter((q) => q.eq(q.field("lobbyId"), lobby._id))
          .collect();

        const cutoffTime = now - HEARTBEAT_TIMEOUT_MS;

        const onlinePlayers = (
          await Promise.all(
            players.map(async (player) => {
              const presence = await presenceComponent.listUser(ctx, player.sessionId, false);
              return hasQualifyingPresence(presence, cutoffTime) ? player : null;
            }),
          )
        ).filter((player) => player !== null);

        if (onlinePlayers.length === 0) {
          return;
        }

        const randomIndex = Math.floor(Math.random() * onlinePlayers.length);
        // oxlint-disable-next-line typescript/no-non-null-assertion, typescript/no-unnecessary-type-assertion
        const newHost = onlinePlayers[randomIndex]!;

        const oldHost = players.find((p) => p.isHost);

        if (oldHost) {
          await ctx.db.patch(oldHost._id, { isHost: false });
        }

        await ctx.db.patch(newHost._id, { isHost: true });
        await ctx.db.patch(lobby._id, {
          hostSessionId: newHost.sessionId,
          hostTransferDeadline: undefined,
        });

        await resumePausedGameIfNeeded(ctx, lobby);
      }),
    );
  },
});
