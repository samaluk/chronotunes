import presenceTest from "@convex-dev/presence/test";
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";

import { api, internal } from "./_generated/api";
import { asSessionId } from "./lib/sessions";
import schema from "./schema";
import { modules } from "./test.setup";

const { register } = presenceTest;

describe("checkHostDisconnect", () => {
  test("skips lobbies without deadline", async () => {
    const t = convexTest(schema, modules);
    register(t);

    await t.mutation(api.lobbies.create, {
      displayName: "HostNoDeadline",
      sessionId: asSessionId("host-session-no-deadline"),
    });

    await t.mutation(internal.host_disconnect.checkHostTransfer, {});

    const lobby = await t.run(async (ctx) => {
      const lobbies = await ctx.db.query("lobbies").collect();
      return lobbies[0];
    });
    expect(lobby?.hostSessionId).toBe("host-session-no-deadline");
    expect(lobby?.hostTransferDeadline).toBeUndefined();
  });

  test("skips lobbies with future deadline", async () => {
    const t = convexTest(schema, modules);
    presenceTest.register(t);

    await t.mutation(api.lobbies.create, {
      displayName: "HostFuture",
      sessionId: asSessionId("host-session-future"),
    });

    await t.run(async (ctx) => {
      const lobby = await ctx.db.query("lobbies").first();
      if (lobby) {
        await ctx.db.patch(lobby._id, {
          hostTransferDeadline: Date.now() + 60_000,
        });
      }
    });

    await t.mutation(internal.host_disconnect.checkHostTransfer, {});

    const lobby = await t.run(async (ctx) => {
      const lobbies = await ctx.db.query("lobbies").collect();
      return lobbies[0];
    });
    expect(lobby?.hostSessionId).toBe("host-session-future");
  });

  test("pauses active game when host has no qualifying presence", async () => {
    const t = convexTest(schema, modules);
    presenceTest.register(t);

    const { code } = await t.mutation(api.lobbies.create, {
      displayName: "HostDisconnect",
      sessionId: asSessionId("host-session-disconnect"),
    });

    await t.mutation(api.lobbies.join, {
      code,
      displayName: "Player1",
      sessionId: asSessionId("player1-disconnect"),
    });

    await t.run(async (ctx) => {
      const lobby = await ctx.db.query("lobbies").first();
      if (lobby) {
        const players = await ctx.db.query("players").collect();
        const firstPlayer = players[0];
        if (firstPlayer) {
          const gameId = await ctx.db.insert("games", {
            currentRoundNumber: 1,
            lobbyId: lobby._id,
            startedAt: Date.now(),
            status: "active",
            turnOrder: [firstPlayer._id],
            turnPlayerId: firstPlayer._id,
          });
          await ctx.db.patch(lobby._id, {
            activeGameId: gameId,
            status: "in_game",
          });
        }
      }
    });

    await t.mutation(internal.host_disconnect.checkHostDisconnect, {});

    const state = await t.run(async (ctx) => {
      const lobbies = await ctx.db.query("lobbies").collect();
      const games = await ctx.db.query("games").collect();
      return { game: games[0], lobby: lobbies[0] };
    });
    expect(state.lobby?.hostTransferDeadline).toBeDefined();
    expect(state.game?.status).toBe("paused");
  });

  test("keeps active game untouched when host heartbeat qualifies", async () => {
    const t = convexTest(schema, modules);
    presenceTest.register(t);

    const { code } = await t.mutation(api.lobbies.create, {
      displayName: "HostStay",
      sessionId: asSessionId("host-session-stay"),
    });

    const lobbyInfo = await t.query(api.lobbies.get, { code });

    // Seed an active game so "untouched" is literally pinned: a qualifying
    // heartbeat must leave both the transfer deadline and the game alone.
    await t.run(async (ctx) => {
      const players = await ctx.db.query("players").collect();
      const firstPlayer = players[0];
      const lobby = await ctx.db.query("lobbies").first();
      if (lobby && firstPlayer) {
        const gameId = await ctx.db.insert("games", {
          currentRoundNumber: 1,
          lobbyId: lobby._id,
          startedAt: Date.now(),
          status: "active",
          turnOrder: [firstPlayer._id],
          turnPlayerId: firstPlayer._id,
        });
        await ctx.db.patch(lobby._id, {
          activeGameId: gameId,
          status: "in_game",
        });
      }
    });

    await t.mutation(api.presence.sendHeartbeat, {
      // oxlint-disable-next-line typescript/no-non-null-assertion
      roomId: lobbyInfo!._id,
      sessionId: "host-session-stay",
      userId: "host-session-stay",
    });

    await t.mutation(internal.host_disconnect.checkHostDisconnect, {});

    const state = await t.run(async (ctx) => {
      const lobbies = await ctx.db.query("lobbies").collect();
      const games = await ctx.db.query("games").collect();
      return { game: games[0], lobby: lobbies[0] };
    });
    expect(state.lobby?.hostTransferDeadline).toBeUndefined();
    expect(state.game?.status).toBe("active");
  });
});

describe("checkHostTransfer with presence", () => {
  test("transfers host to random online player after deadline", async () => {
    const t = convexTest(schema, modules);
    register(t);

    const { code } = await t.mutation(api.lobbies.create, {
      displayName: "HostTransfer",
      sessionId: asSessionId("host-session-transfer"),
    });

    await t.mutation(api.lobbies.join, {
      code,
      displayName: "Player1",
      sessionId: asSessionId("player1-session"),
    });

    await t.mutation(api.lobbies.join, {
      code,
      displayName: "Player2",
      sessionId: asSessionId("player2-session"),
    });

    const lobbyInfo = await t.query(api.lobbies.get, { code });

    await t.mutation(api.presence.sendHeartbeat, {
      // oxlint-disable-next-line typescript/no-non-null-assertion
      roomId: lobbyInfo!._id,
      sessionId: "player1-session",
      userId: "player1-session",
    });

    await t.mutation(api.presence.sendHeartbeat, {
      // oxlint-disable-next-line typescript/no-non-null-assertion
      roomId: lobbyInfo!._id,
      sessionId: "player2-session",
      userId: "player2-session",
    });

    await t.run(async (ctx) => {
      const lobby = await ctx.db.query("lobbies").first();
      if (lobby) {
        await ctx.db.patch(lobby._id, {
          hostTransferDeadline: Date.now() - 1000,
        });
      }
    });

    await t.mutation(internal.host_disconnect.checkHostTransfer, {});

    const players = await t.run(async (ctx) => {
      const allPlayers = await ctx.db.query("players").collect();
      return allPlayers;
    });

    const newHost = players.find((p) => p.isHost);
    expect(newHost).toBeDefined();
    expect(newHost?.sessionId).not.toBe("host-session-transfer");

    const lobby = await t.run(async (ctx) => {
      const lobbies = await ctx.db.query("lobbies").collect();
      return lobbies[0];
    });
    expect(lobby?.hostSessionId).toBe(newHost?.sessionId);
    expect(lobby?.hostTransferDeadline).toBeUndefined();
  });

  test("does not transfer when no online players", async () => {
    const t = convexTest(schema, modules);
    presenceTest.register(t);

    const { code } = await t.mutation(api.lobbies.create, {
      displayName: "HostOffline",
      sessionId: asSessionId("host-session-offline"),
    });

    await t.mutation(api.lobbies.join, {
      code,
      displayName: "Player1Offline",
      sessionId: asSessionId("player1-offline"),
    });

    await t.run(async (ctx) => {
      const lobby = await ctx.db.query("lobbies").first();
      if (lobby) {
        await ctx.db.patch(lobby._id, {
          hostTransferDeadline: Date.now() - 1000,
        });
      }
    });

    await t.mutation(internal.host_disconnect.checkHostTransfer, {});

    const lobby = await t.run(async (ctx) => {
      const lobbies = await ctx.db.query("lobbies").collect();
      return lobbies[0];
    });
    expect(lobby?.hostSessionId).toBe("host-session-offline");
    expect(lobby?.hostTransferDeadline).toBeDefined();
  });

  test("resumes paused game after host transfer", async () => {
    const t = convexTest(schema, modules);
    presenceTest.register(t);

    const { code } = await t.mutation(api.lobbies.create, {
      displayName: "HostPaused",
      sessionId: asSessionId("host-session-paused"),
    });

    await t.mutation(api.lobbies.join, {
      code,
      displayName: "Player1Paused",
      sessionId: asSessionId("player1-paused"),
    });

    const lobbyInfo = await t.query(api.lobbies.get, { code });

    await t.mutation(api.presence.sendHeartbeat, {
      // oxlint-disable-next-line typescript/no-non-null-assertion
      roomId: lobbyInfo!._id,
      sessionId: "player1-paused",
      userId: "player1-paused",
    });

    await t.run(async (ctx) => {
      const lobby = await ctx.db.query("lobbies").first();
      if (lobby) {
        const players = await ctx.db.query("players").collect();
        const firstPlayer = players[0];
        if (firstPlayer) {
          const gameId = await ctx.db.insert("games", {
            currentRoundNumber: 1,
            lobbyId: lobby._id,
            startedAt: Date.now(),
            status: "paused",
            turnOrder: [firstPlayer._id],
            turnPlayerId: firstPlayer._id,
          });
          await ctx.db.patch(lobby._id, {
            activeGameId: gameId,
            hostTransferDeadline: Date.now() - 1000,
            status: "in_game",
          });
        }
      }
    });

    await t.mutation(internal.host_disconnect.checkHostTransfer, {});

    const game = await t.run(async (ctx) => {
      const games = await ctx.db.query("games").collect();
      return games[0];
    });
    expect(game?.status).toBe("active");
  });

  test("clears hostTransferDeadline after successful transfer", async () => {
    const t = convexTest(schema, modules);
    presenceTest.register(t);

    const { code } = await t.mutation(api.lobbies.create, {
      displayName: "HostClear",
      sessionId: asSessionId("host-session-clear"),
    });

    await t.mutation(api.lobbies.join, {
      code,
      displayName: "PlayerClear",
      sessionId: asSessionId("player-clear"),
    });

    const lobbyInfo = await t.query(api.lobbies.get, { code });

    await t.mutation(api.presence.sendHeartbeat, {
      // oxlint-disable-next-line typescript/no-non-null-assertion
      roomId: lobbyInfo!._id,
      sessionId: "player-clear",
      userId: "player-clear",
    });

    await t.run(async (ctx) => {
      const lobby = await ctx.db.query("lobbies").first();
      if (lobby) {
        await ctx.db.patch(lobby._id, {
          hostTransferDeadline: Date.now() - 1000,
        });
      }
    });

    await t.mutation(internal.host_disconnect.checkHostTransfer, {});

    const lobby = await t.run(async (ctx) => {
      const lobbies = await ctx.db.query("lobbies").collect();
      return lobbies[0];
    });
    expect(lobby?.hostTransferDeadline).toBeUndefined();
  });

  test("original host can rejoin as regular player after failover", async () => {
    const t = convexTest(schema, modules);
    presenceTest.register(t);

    const { code } = await t.mutation(api.lobbies.create, {
      displayName: "OriginalHost",
      sessionId: asSessionId("original-host-session"),
    });

    await t.mutation(api.lobbies.join, {
      code,
      displayName: "NewHost",
      sessionId: asSessionId("new-host-session"),
    });

    await t.run(async (ctx) => {
      const lobby = await ctx.db.query("lobbies").first();
      if (lobby) {
        await ctx.db.patch(lobby._id, {
          hostTransferDeadline: Date.now() - 1000,
        });
      }
    });

    await t.mutation(internal.host_disconnect.checkHostTransfer);

    await t.mutation(api.lobbies.leave, {
      code,
      sessionId: asSessionId("original-host-session"),
    });

    await t.mutation(api.lobbies.join, {
      code,
      displayName: "OriginalHost",
      sessionId: asSessionId("original-host-session"),
    });

    const players = await t.run(async (ctx) => {
      const allPlayers = await ctx.db.query("players").collect();
      return allPlayers;
    });

    const originalHost = players.find((p) => p.sessionId === "original-host-session");
    expect(originalHost).toBeDefined();
    expect(originalHost?.isHost).toBeFalsy();
  });
});
