import { Presence } from "@convex-dev/presence";
import { components } from "./_generated/api";
import { internalMutation } from "./_generated/server";

const presenceComponent = new Presence(components.presence);

const HEARTBEAT_TIMEOUT_MS = 10000;
const HOST_TRANSFER_DEADLINE_MS = 60000;

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
