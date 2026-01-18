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

const modules = import.meta.glob("./**/*.ts");
