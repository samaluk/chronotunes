import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

test("create lobby generates 6-char code", async () => {
  const t = convexTest(schema, modules);
  const result = await t.mutation(api.lobbies.create, {
    sessionId: "test-session-123",
    displayName: "TestHost",
  });
  expect(result.code).toHaveLength(6);
});

test("create lobby returns alphanumeric code only", async () => {
  const t = convexTest(schema, modules);
  const result = await t.mutation(api.lobbies.create, {
    sessionId: "test-session-456",
    displayName: "AnotherHost",
  });
  expect(result.code).toMatch(/^[A-Z2345679]+$/);
});

test("create lobby creates lobby with status lobby", async () => {
  const t = convexTest(schema, modules);
  await t.mutation(api.lobbies.create, {
    sessionId: "test-session-789",
    displayName: "StatusHost",
  });

  const lobby = await t.run(async (ctx) => {
    const lobbies = await ctx.db.query("lobbies").collect();
    return lobbies[0];
  });
  expect(lobby).not.toBeNull();
  expect(lobby?.status).toBe("lobby");
});

test("create lobby creates host player with isHost true", async () => {
  const t = convexTest(schema, modules);
  await t.mutation(api.lobbies.create, {
    sessionId: "test-session-host",
    displayName: "HostPlayer",
  });

  const players = await t.run(async (ctx) => {
    const allPlayers = await ctx.db.query("players").collect();
    return allPlayers;
  });
  expect(players).toHaveLength(1);
  expect(players[0]?.isHost).toBe(true);
  expect(players[0]?.displayName).toBe("HostPlayer");
});

test("create lobby creates host with default starting coins", async () => {
  const t = convexTest(schema, modules);
  await t.mutation(api.lobbies.create, {
    sessionId: "test-session-coins",
    displayName: "CoinsHost",
  });

  const players = await t.run(async (ctx) => {
    const allPlayers = await ctx.db.query("players").collect();
    return allPlayers;
  });
  expect(players[0]?.coins).toBe(3);
});

test("create lobby rejects empty display name", async () => {
  const t = convexTest(schema, modules);
  await expect(
    t.mutation(api.lobbies.create, {
      sessionId: "test-session-empty",
      displayName: "",
    }),
  ).rejects.toThrow();
});

test("create lobby rejects display name too long", async () => {
  const t = convexTest(schema, modules);
  await expect(
    t.mutation(api.lobbies.create, {
      sessionId: "test-session-long",
      displayName: "ThisDisplayNameIsWayTooLongToBeValid",
    }),
  ).rejects.toThrow();
});

test("create lobby generates unique codes", async () => {
  const t = convexTest(schema, modules);
  const codes = new Set<string>();

  for (let i = 0; i < 10; i++) {
    const result = await t.mutation(api.lobbies.create, {
      sessionId: `test-session-${i}`,
      displayName: `Host${i}`,
    });
    codes.add(result.code);
  }

  expect(codes.size).toBe(10);
});

test("join lobby adds player to existing lobby", async () => {
  const t = convexTest(schema, modules);

  const { code } = await t.mutation(api.lobbies.create, {
    sessionId: "host-session",
    displayName: "HostPlayer",
  });

  await t.mutation(api.lobbies.join, {
    code,
    sessionId: "player-session",
    displayName: "NewPlayer",
  });

  const players = await t.run(async (ctx) => {
    const allPlayers = await ctx.db.query("players").collect();
    return allPlayers;
  });

  expect(players).toHaveLength(2);
  const newPlayer = players.find((p) => p.sessionId === "player-session");
  expect(newPlayer).not.toBeUndefined();
  expect(newPlayer?.displayName).toBe("NewPlayer");
  expect(newPlayer?.isHost).toBe(false);
  expect(newPlayer?.coins).toBe(3);
});

test("join lobby returns lobby id", async () => {
  const t = convexTest(schema, modules);

  const { code } = await t.mutation(api.lobbies.create, {
    sessionId: "host-session-return",
    displayName: "HostReturn",
  });

  const result = await t.mutation(api.lobbies.join, {
    code,
    sessionId: "player-session-return",
    displayName: "PlayerReturn",
  });

  expect(result.lobbyId).toBeDefined();
});

test("join lobby rejects invalid code", async () => {
  const t = convexTest(schema, modules);

  await expect(
    t.mutation(api.lobbies.join, {
      code: "INVALID",
      sessionId: "player-session",
      displayName: "Player",
    }),
  ).rejects.toThrow("Lobby not found");
});

test("join lobby rejects empty display name", async () => {
  const t = convexTest(schema, modules);

  const { code } = await t.mutation(api.lobbies.create, {
    sessionId: "host-session-empty",
    displayName: "HostEmpty",
  });

  await expect(
    t.mutation(api.lobbies.join, {
      code,
      sessionId: "player-session-empty",
      displayName: "",
    }),
  ).rejects.toThrow();
});

test("join lobby rejects display name too long", async () => {
  const t = convexTest(schema, modules);

  const { code } = await t.mutation(api.lobbies.create, {
    sessionId: "host-session-long",
    displayName: "HostLong",
  });

  await expect(
    t.mutation(api.lobbies.join, {
      code,
      sessionId: "player-session-long",
      displayName: "ThisDisplayNameIsWayTooLongToBeValid",
    }),
  ).rejects.toThrow();
});

test("join lobby rejects when session already in lobby", async () => {
  const t = convexTest(schema, modules);

  const { code } = await t.mutation(api.lobbies.create, {
    sessionId: "host-session-dup",
    displayName: "HostDup",
  });

  await t.mutation(api.lobbies.join, {
    code,
    sessionId: "player-session-dup",
    displayName: "AlreadyJoined",
  });

  await expect(
    t.mutation(api.lobbies.join, {
      code,
      sessionId: "player-session-dup",
      displayName: "Again",
    }),
  ).rejects.toThrow("You are already in this lobby");
});

test("join lobby rejects when lobby status is in_game", async () => {
  const t = convexTest(schema, modules);

  const { code } = await t.mutation(api.lobbies.create, {
    sessionId: "host-session-game",
    displayName: "HostGame",
  });

  await t.run(async (ctx) => {
    const lobby = await ctx.db.query("lobbies").first();
    if (lobby) {
      await ctx.db.patch(lobby._id, { status: "in_game" });
    }
  });

  await expect(
    t.mutation(api.lobbies.join, {
      code,
      sessionId: "player-session-game",
      displayName: "PlayerGame",
    }),
  ).rejects.toThrow("Cannot join lobby that is not in lobby status");
});

test("join lobby is case insensitive for code", async () => {
  const t = convexTest(schema, modules);

  const { code } = await t.mutation(api.lobbies.create, {
    sessionId: "host-session-case",
    displayName: "HostCase",
  });

  const lowerCode = code.toLowerCase();

  await t.mutation(api.lobbies.join, {
    code: lowerCode,
    sessionId: "player-session-case",
    displayName: "PlayerCase",
  });

  const players = await t.run(async (ctx) => {
    const allPlayers = await ctx.db.query("players").collect();
    return allPlayers;
  });

  expect(players).toHaveLength(2);
});

test("join lobby uses lobby's starting coins setting", async () => {
  const t = convexTest(schema, modules);

  const { code } = await t.mutation(api.lobbies.create, {
    sessionId: "host-session-coins",
    displayName: "HostCoins",
  });

  await t.run(async (ctx) => {
    const lobby = await ctx.db.query("lobbies").first();
    if (lobby) {
      await ctx.db.patch(lobby._id, { settings: { ...lobby.settings, startingCoins: 5 } });
    }
  });

  await t.mutation(api.lobbies.join, {
    code,
    sessionId: "player-session-coins",
    displayName: "PlayerCoins",
  });

  const players = await t.run(async (ctx) => {
    const allPlayers = await ctx.db.query("players").collect();
    return allPlayers;
  });

  const newPlayer = players.find((p) => p.sessionId === "player-session-coins");
  expect(newPlayer?.coins).toBe(5);
});

const modules = import.meta.glob("./**/*.ts");
