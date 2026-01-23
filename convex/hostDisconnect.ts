import { Presence } from "@convex-dev/presence";
import { components } from "./_generated/api";
import { internalMutation } from "./_generated/server";

const presenceComponent = new Presence(components.presence);

const HEARTBEAT_TIMEOUT_MS = 10_000;
const HOST_TRANSFER_DEADLINE_MS = 30_000;

export const checkHostDisconnect = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const cutoffTime = now - HEARTBEAT_TIMEOUT_MS;

    const lobbies = await ctx.db
      .query("lobbies")
      .filter((q) => q.or(q.eq(q.field("status"), "lobby"), q.eq(q.field("status"), "in_game")))
      .collect();

    for (const lobby of lobbies) {
      if (lobby.hostTransferDeadline && lobby.hostTransferDeadline > now) {
        continue;
      }

      const hostPresence = await presenceComponent.listUser(ctx, lobby.hostSessionId, false);

      const isHostOnline =
        hostPresence.length > 0 &&
        (hostPresence[0] as { lastSeen?: number }).lastSeen !== undefined &&
        (hostPresence[0] as { lastSeen?: number }).lastSeen! > cutoffTime;

      if (!isHostOnline) {
        const hostTransferDeadline = now + HOST_TRANSFER_DEADLINE_MS;

        await ctx.db.patch(lobby._id, { hostTransferDeadline });

        if (lobby.status === "in_game" && lobby.activeGameId) {
          const game = await ctx.db.get(lobby.activeGameId);
          if (game && game.status === "active") {
            await ctx.db.patch(game._id, { status: "paused" });
          }
        }
      }
    }
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

    for (const lobby of lobbies) {
      const players = await ctx.db
        .query("players")
        .filter((q) => q.eq(q.field("lobbyId"), lobby._id))
        .collect();

      const cutoffTime = now - HEARTBEAT_TIMEOUT_MS;

      const onlinePlayers: typeof players = [];

      for (const player of players) {
        const presence = await presenceComponent.listUser(ctx, player.sessionId, false);
        const isOnline =
          presence.length > 0 &&
          (presence[0] as { lastSeen?: number }).lastSeen !== undefined &&
          (presence[0] as { lastSeen?: number }).lastSeen! > cutoffTime;

        if (isOnline) {
          onlinePlayers.push(player);
        }
      }

      if (onlinePlayers.length === 0) {
        continue;
      }

      const randomIndex = Math.floor(Math.random() * onlinePlayers.length);
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

      if (lobby.status === "in_game" && lobby.activeGameId) {
        const game = await ctx.db.get(lobby.activeGameId);
        if (game && game.status === "paused") {
          await ctx.db.patch(game._id, { status: "active" });
        }
      }
    }
  },
});
