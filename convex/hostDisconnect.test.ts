import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";

test("checkHostTransfer transfers host to random online player after deadline", async () => {
  const t = convexTest(schema);

  const { code } = await t.mutation(api.lobbies.create, {
    sessionId: "host-session-transfer",
    displayName: "HostTransfer",
  });

  await t.mutation(api.lobbies.join, {
    code,
    sessionId: "player1-session",
    displayName: "Player1",
  });

  await t.mutation(api.lobbies.join, {
    code,
    sessionId: "player2-session",
    displayName: "Player2",
  });

  await t.run(async (ctx) => {
    const lobby = await ctx.db.query("lobbies").first();
    if (lobby) {
      await ctx.db.patch(lobby._id, {
        hostTransferDeadline: Date.now() - 1000,
      });
    }
  });

  await t.mutation(internal.hostDisconnect.checkHostTransfer, {});

  const players = await t.run(async (ctx) => {
    const allPlayers = await ctx.db.query("players").collect();
    return allPlayers;
  });

  const newHost = players.find((p) => p.isHost);
  expect(newHost).not.toBeUndefined();
  expect(newHost?.sessionId).not.toBe("host-session-transfer");

  const lobby = await t.run(async (ctx) => {
    const lobbies = await ctx.db.query("lobbies").collect();
    return lobbies[0];
  });
  expect(lobby?.hostSessionId).toBe(newHost?.sessionId);
  expect(lobby?.hostTransferDeadline).toBeUndefined();
});

test("checkHostTransfer does not transfer when no online players", async () => {
  const t = convexTest(schema);

  const { code } = await t.mutation(api.lobbies.create, {
    sessionId: "host-session-offline",
    displayName: "HostOffline",
  });

  await t.mutation(api.lobbies.join, {
    code,
    sessionId: "player1-offline",
    displayName: "Player1Offline",
  });

  await t.run(async (ctx) => {
    const lobby = await ctx.db.query("lobbies").first();
    if (lobby) {
      await ctx.db.patch(lobby._id, {
        hostTransferDeadline: Date.now() - 1000,
      });
    }
  });

  await t.mutation(internal.hostDisconnect.checkHostTransfer, {});

  const lobby = await t.run(async (ctx) => {
    const lobbies = await ctx.db.query("lobbies").collect();
    return lobbies[0];
  });
  expect(lobby?.hostSessionId).toBe("host-session-offline");
  expect(lobby?.hostTransferDeadline).toBeDefined();
});

test("checkHostTransfer resumes paused game after host transfer", async () => {
  const t = convexTest(schema);

  const { code } = await t.mutation(api.lobbies.create, {
    sessionId: "host-session-paused",
    displayName: "HostPaused",
  });

  await t.mutation(api.lobbies.join, {
    code,
    sessionId: "player1-paused",
    displayName: "Player1Paused",
  });

  await t.run(async (ctx) => {
    const lobby = await ctx.db.query("lobbies").first();
    if (lobby) {
      const players = await ctx.db.query("players").collect();
      const firstPlayer = players[0];
      if (firstPlayer) {
        const gameId = await ctx.db.insert("games", {
          lobbyId: lobby._id,
          status: "paused",
          startedAt: Date.now(),
          currentRoundNumber: 1,
          turnOrder: [firstPlayer._id],
          turnPlayerId: firstPlayer._id,
        });
        await ctx.db.patch(lobby._id, {
          status: "in_game",
          activeGameId: gameId,
          hostTransferDeadline: Date.now() - 1000,
        });
      }
    }
  });

  await t.mutation(internal.hostDisconnect.checkHostTransfer, {});

  const game = await t.run(async (ctx) => {
    const games = await ctx.db.query("games").collect();
    return games[0];
  });
  expect(game?.status).toBe("active");
});

test("checkHostTransfer skips lobbies without expired deadline", async () => {
  const t = convexTest(schema);

  await t.mutation(api.lobbies.create, {
    sessionId: "host-session-future",
    displayName: "HostFuture",
  });

  await t.run(async (ctx) => {
    const lobby = await ctx.db.query("lobbies").first();
    if (lobby) {
      await ctx.db.patch(lobby._id, {
        hostTransferDeadline: Date.now() + 60000,
      });
    }
  });

  await t.mutation(internal.hostDisconnect.checkHostTransfer, {});

  const lobby = await t.run(async (ctx) => {
    const lobbies = await ctx.db.query("lobbies").collect();
    return lobbies[0];
  });
  expect(lobby?.hostSessionId).toBe("host-session-future");
});

test("checkHostTransfer skips lobbies without deadline", async () => {
  const t = convexTest(schema);

  await t.mutation(api.lobbies.create, {
    sessionId: "host-session-no-deadline",
    displayName: "HostNoDeadline",
  });

  await t.mutation(internal.hostDisconnect.checkHostTransfer, {});

  const lobby = await t.run(async (ctx) => {
    const lobbies = await ctx.db.query("lobbies").collect();
    return lobbies[0];
  });
  expect(lobby?.hostSessionId).toBe("host-session-no-deadline");
  expect(lobby?.hostTransferDeadline).toBeUndefined();
});

test("checkHostTransfer clears hostTransferDeadline after successful transfer", async () => {
  const t = convexTest(schema);

  const { code } = await t.mutation(api.lobbies.create, {
    sessionId: "host-session-clear",
    displayName: "HostClear",
  });

  await t.mutation(api.lobbies.join, {
    code,
    sessionId: "player-clear",
    displayName: "PlayerClear",
  });

  await t.run(async (ctx) => {
    const lobby = await ctx.db.query("lobbies").first();
    if (lobby) {
      await ctx.db.patch(lobby._id, {
        hostTransferDeadline: Date.now() - 1000,
      });
    }
  });

  await t.mutation(internal.hostDisconnect.checkHostTransfer, {});

  const lobby = await t.run(async (ctx) => {
    const lobbies = await ctx.db.query("lobbies").collect();
    return lobbies[0];
  });
  expect(lobby?.hostTransferDeadline).toBeUndefined();
});

test("original host can rejoin as regular player after failover", async () => {
  const t = convexTest(schema);

  const { code } = await t.mutation(api.lobbies.create, {
    sessionId: "original-host-session",
    displayName: "OriginalHost",
  });

  await t.mutation(api.lobbies.join, {
    code,
    sessionId: "new-host-session",
    displayName: "NewHost",
  });

  await t.run(async (ctx) => {
    const lobby = await ctx.db.query("lobbies").first();
    if (lobby) {
      await ctx.db.patch(lobby._id, {
        hostTransferDeadline: Date.now() - 1000,
      });
    }
  });

  await t.mutation(internal.hostDisconnect.checkHostTransfer, {});

  await t.mutation(api.lobbies.join, {
    code,
    sessionId: "original-host-session",
    displayName: "OriginalHost",
  });

  const players = await t.run(async (ctx) => {
    const allPlayers = await ctx.db.query("players").collect();
    return allPlayers;
  });

  const originalHost = players.find((p) => p.sessionId === "original-host-session");
  expect(originalHost).not.toBeUndefined();
  expect(originalHost?.isHost).toBe(false);
});
