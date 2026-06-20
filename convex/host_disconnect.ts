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
      .filter((q) =>
        q.or(
          q.eq(q.field("status"), "lobby"),
          q.eq(q.field("status"), "in_game")
        )
      )
      .collect();

    await Promise.all(
      lobbies.map(async (lobby) => {
        if (lobby.hostTransferDeadline && lobby.hostTransferDeadline > now) {
          return;
        }

        const hostPresence = await presenceComponent.listUser(
          ctx,
          lobby.hostSessionId,
          false
        );

        const isHostOnline = hostPresence.some(
          (presence) =>
            presence.online &&
            (presence as { lastDisconnected?: number }).lastDisconnected !==
              undefined &&
            (presence as { lastDisconnected?: number }).lastDisconnected! <
              cutoffTime
        );

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
      })
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
          q.or(
            q.eq(q.field("status"), "lobby"),
            q.eq(q.field("status"), "in_game")
          ),
          q.neq(q.field("hostTransferDeadline"), undefined),
          q.lt(q.field("hostTransferDeadline"), now)
        )
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
              const presence = await presenceComponent.listUser(
                ctx,
                player.sessionId,
                false
              );
              const isOnline = presence.some(
                (entry) =>
                  entry.online &&
                  (entry as { lastDisconnected?: number }).lastDisconnected !==
                    undefined &&
                  (entry as { lastDisconnected?: number }).lastDisconnected! <
                    cutoffTime
              );

              return isOnline ? player : null;
            })
          )
        ).filter((player) => player !== null);

        if (onlinePlayers.length === 0) {
          return;
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
      })
    );
  },
});
