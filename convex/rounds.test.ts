import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

async function seedTestData(t: ReturnType<typeof convexTest>) {
  await t.run(async (ctx) => {
    await ctx.db.insert("tracks", {
      title: "Test Song 1",
      artist: "Test Artist 1",
      year: 1980,
      externalIds: { youtubeVideoId: "abc123" },
      links: {},
      createdAt: Date.now(),
      source: "test",
    });
    await ctx.db.insert("tracks", {
      title: "Test Song 2",
      artist: "Test Artist 2",
      year: 1990,
      externalIds: { youtubeVideoId: "def456" },
      links: {},
      createdAt: Date.now(),
      source: "test",
    });
  });
}

test("getCurrent returns null when no active game", async () => {
  const t = convexTest(schema, modules);

  await seedTestData(t);

  const { code } = await t.mutation(api.lobbies.create, {
    sessionId: "host-session-empty",
    displayName: "HostEmpty",
  });

  const lobby = await t.query(api.lobbies.get, { code });

  const result = await t.query(api.rounds.getCurrent, {
    lobbyId: lobby!._id,
    sessionId: "host-session-empty",
  });

  expect(result).toBeNull();
});

test("getCurrent returns current round for active game", async () => {
  const t = convexTest(schema, modules);

  await seedTestData(t);

  const { code } = await t.mutation(api.lobbies.create, {
    sessionId: "host-session-current",
    displayName: "HostCurrent",
  });

  await t.mutation(api.lobbies.join, {
    code,
    sessionId: "player-session-current",
    displayName: "PlayerCurrent",
  });

  const lobby = await t.query(api.lobbies.get, { code });

  await t.mutation(api.games.start, {
    lobbyId: lobby!._id,
    sessionId: "host-session-current",
  });

  const result = await t.query(api.rounds.getCurrent, {
    lobbyId: lobby!._id,
    sessionId: "host-session-current",
  });

  expect(result).not.toBeNull();
  expect(result?.phase).toBe("placing");
  expect(result?.roundNumber).toBe(1);
  expect(result?.turnPlayerId).toBeDefined();
  expect(result?.startedAt).toBeDefined();
});

test("getCurrent hides track details during placing phase for non-host", async () => {
  const t = convexTest(schema, modules);

  await seedTestData(t);

  const { code } = await t.mutation(api.lobbies.create, {
    sessionId: "host-session-hide",
    displayName: "HostHide",
  });

  await t.mutation(api.lobbies.join, {
    code,
    sessionId: "player-session-hide",
    displayName: "PlayerHide",
  });

  const lobby = await t.query(api.lobbies.get, { code });

  await t.mutation(api.games.start, {
    lobbyId: lobby!._id,
    sessionId: "host-session-hide",
  });

  const result = await t.query(api.rounds.getCurrent, {
    lobbyId: lobby!._id,
    sessionId: "player-session-hide",
  });

  expect(result).not.toBeNull();
  expect(result?.phase).toBe("placing");
  expect(result?.track).not.toBeNull();
  expect((result?.track as unknown as Record<string, unknown>).trackId).toBeDefined();
  expect((result?.track as unknown as Record<string, unknown>).title).toBeUndefined();
  expect((result?.track as unknown as Record<string, unknown>).artist).toBeUndefined();
  expect((result?.track as unknown as Record<string, unknown>).year).toBeUndefined();
  expect(result?.isHost).toBe(false);
});

test("getCurrent shows track details during placing phase for host", async () => {
  const t = convexTest(schema, modules);

  await seedTestData(t);

  const { code } = await t.mutation(api.lobbies.create, {
    sessionId: "host-session-show",
    displayName: "HostShow",
  });

  await t.mutation(api.lobbies.join, {
    code,
    sessionId: "player-session-show",
    displayName: "PlayerShow",
  });

  const lobby = await t.query(api.lobbies.get, { code });

  await t.mutation(api.games.start, {
    lobbyId: lobby!._id,
    sessionId: "host-session-show",
  });

  const result = await t.query(api.rounds.getCurrent, {
    lobbyId: lobby!._id,
    sessionId: "host-session-show",
  });

  expect(result).not.toBeNull();
  expect(result?.phase).toBe("placing");
  expect(result?.track).not.toBeNull();
  expect((result?.track as unknown as Record<string, unknown>).trackId).toBeDefined();
  expect((result?.track as unknown as Record<string, unknown>).title).toMatch(/Test Song/);
  expect((result?.track as unknown as Record<string, unknown>).artist).toMatch(/Test Artist/);
  expect((result?.track as unknown as Record<string, unknown>).year).toBeDefined();
  expect(result?.isHost).toBe(true);
});

test("getCurrent includes placementPreview", async () => {
  const t = convexTest(schema, modules);

  await seedTestData(t);

  const { code } = await t.mutation(api.lobbies.create, {
    sessionId: "host-session-preview",
    displayName: "HostPreview",
  });

  await t.mutation(api.lobbies.join, {
    code,
    sessionId: "player-session-preview",
    displayName: "PlayerPreview",
  });

  const lobby = await t.query(api.lobbies.get, { code });

  await t.mutation(api.games.start, {
    lobbyId: lobby!._id,
    sessionId: "host-session-preview",
  });

  const game = await t.query(api.games.getCurrent, { lobbyId: lobby!._id });

  const roundId = game?.currentRoundId;

  await t.run(async (ctx) => {
    if (roundId) {
      await ctx.db.patch(roundId, {
        placementPreview: { proposedIndex: 2, updatedAt: Date.now() },
      });
    }
  });

  const result = await t.query(api.rounds.getCurrent, {
    lobbyId: lobby!._id,
    sessionId: "host-session-preview",
  });

  expect(result).not.toBeNull();
  expect(result?.placementPreview).not.toBeNull();
  expect(result?.placementPreview?.proposedIndex).toBe(2);
});

const modules = import.meta.glob("./**/*.ts");
