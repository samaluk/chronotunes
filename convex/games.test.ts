import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

async function seedTestTracks(t: ReturnType<typeof convexTest>) {
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
    await ctx.db.insert("tracks", {
      title: "Test Song 3",
      artist: "Test Artist 3",
      year: 2000,
      externalIds: { youtubeVideoId: "ghi789" },
      links: {},
      createdAt: Date.now(),
      source: "test",
    });
  });
}

test("start creates game with active status", async () => {
  const t = convexTest(schema, modules);

  await seedTestTracks(t);

  const { code } = await t.mutation(api.lobbies.create, {
    sessionId: "host-session-start",
    displayName: "HostStart",
  });

  await t.mutation(api.lobbies.join, {
    code,
    sessionId: "player-session-start",
    displayName: "PlayerStart",
  });

  const lobby = await t.query(api.lobbies.get, { code });

  const result = await t.mutation(api.games.start, {
    lobbyId: lobby!._id,
    sessionId: "host-session-start",
  });

  expect(result.gameId).toBeDefined();
  expect(result.roundId).toBeDefined();

  const updatedLobby = await t.query(api.lobbies.get, { code });
  expect(updatedLobby?.status).toBe("in_game");
  expect(updatedLobby?.activeGameId).toBe(result.gameId);
});

test("start randomizes turn order", async () => {
  const t = convexTest(schema, modules);

  await seedTestTracks(t);

  const { code } = await t.mutation(api.lobbies.create, {
    sessionId: "host-session-order",
    displayName: "HostOrder",
  });

  await t.mutation(api.lobbies.join, {
    code,
    sessionId: "player1-session-order",
    displayName: "Player1",
  });

  await t.mutation(api.lobbies.join, {
    code,
    sessionId: "player2-session-order",
    displayName: "Player2",
  });

  await t.mutation(api.lobbies.join, {
    code,
    sessionId: "player3-session-order",
    displayName: "Player3",
  });

  const lobby = await t.query(api.lobbies.get, { code });

  await t.mutation(api.games.start, {
    lobbyId: lobby!._id,
    sessionId: "host-session-order",
  });

  const game = await t.query(api.games.getCurrent, { lobbyId: lobby!._id });

  expect(game).not.toBeNull();
  expect(game?.turnOrder).toHaveLength(4);
  expect(game?.turnPlayerId).toBe(game?.turnOrder[0]);
});

test("start rejects when less than 2 players", async () => {
  const t = convexTest(schema, modules);

  await seedTestTracks(t);

  const { code } = await t.mutation(api.lobbies.create, {
    sessionId: "host-session-min",
    displayName: "HostMin",
  });

  const lobby = await t.query(api.lobbies.get, { code });

  await expect(
    t.mutation(api.games.start, {
      lobbyId: lobby!._id,
      sessionId: "host-session-min",
    }),
  ).rejects.toThrow("At least 2 players are required to start a game");
});

test("start rejects when caller is not host", async () => {
  const t = convexTest(schema, modules);

  await seedTestTracks(t);

  const { code } = await t.mutation(api.lobbies.create, {
    sessionId: "host-session-auth",
    displayName: "HostAuth",
  });

  await t.mutation(api.lobbies.join, {
    code,
    sessionId: "player-session-auth",
    displayName: "PlayerAuth",
  });

  const lobby = await t.query(api.lobbies.get, { code });

  await expect(
    t.mutation(api.games.start, {
      lobbyId: lobby!._id,
      sessionId: "player-session-auth",
    }),
  ).rejects.toThrow("Only the host can start the game");
});

test("start rejects when game already started", async () => {
  const t = convexTest(schema, modules);

  await seedTestTracks(t);

  const { code } = await t.mutation(api.lobbies.create, {
    sessionId: "host-session-started",
    displayName: "HostStarted",
  });

  await t.mutation(api.lobbies.join, {
    code,
    sessionId: "player-session-started",
    displayName: "PlayerStarted",
  });

  const lobby = await t.query(api.lobbies.get, { code });

  await t.mutation(api.games.start, {
    lobbyId: lobby!._id,
    sessionId: "host-session-started",
  });

  await expect(
    t.mutation(api.games.start, {
      lobbyId: lobby!._id,
      sessionId: "host-session-started",
    }),
  ).rejects.toThrow("Game has already started");
});

test("start creates first round with phase placing", async () => {
  const t = convexTest(schema, modules);

  await seedTestTracks(t);

  const { code } = await t.mutation(api.lobbies.create, {
    sessionId: "host-session-round",
    displayName: "HostRound",
  });

  await t.mutation(api.lobbies.join, {
    code,
    sessionId: "player-session-round",
    displayName: "PlayerRound",
  });

  const lobby = await t.query(api.lobbies.get, { code });

  const result = await t.mutation(api.games.start, {
    lobbyId: lobby!._id,
    sessionId: "host-session-round",
  });

  const game = await t.run(async (ctx) => {
    return await ctx.db.get(result.gameId);
  });

  expect(game?.currentRoundId).toBe(result.roundId);
  expect(game?.currentRoundNumber).toBe(1);

  const round = await t.run(async (ctx) => {
    return await ctx.db.get(result.roundId);
  });

  expect(round).not.toBeNull();
  expect(round?.phase).toBe("placing");
  expect(round?.roundNumber).toBe(1);
});

test("start sets turnPlayerId correctly", async () => {
  const t = convexTest(schema, modules);

  await seedTestTracks(t);

  const { code } = await t.mutation(api.lobbies.create, {
    sessionId: "host-session-turn",
    displayName: "HostTurn",
  });

  await t.mutation(api.lobbies.join, {
    code,
    sessionId: "player-session-turn",
    displayName: "PlayerTurn",
  });

  const lobby = await t.query(api.lobbies.get, { code });

  await t.mutation(api.games.start, {
    lobbyId: lobby!._id,
    sessionId: "host-session-turn",
  });

  const game = await t.query(api.games.getCurrent, { lobbyId: lobby!._id });

  expect(game?.turnPlayerId).toBeDefined();
  expect(game?.turnOrder).toContain(game?.turnPlayerId);
});

test("start creates game with correct structure", async () => {
  const t = convexTest(schema, modules);

  await seedTestTracks(t);

  const { code } = await t.mutation(api.lobbies.create, {
    sessionId: "host-session-structure",
    displayName: "HostStructure",
  });

  await t.mutation(api.lobbies.join, {
    code,
    sessionId: "player-session-structure",
    displayName: "PlayerStructure",
  });

  const lobby = await t.query(api.lobbies.get, { code });

  const result = await t.mutation(api.games.start, {
    lobbyId: lobby!._id,
    sessionId: "host-session-structure",
  });

  const game = await t.run(async (ctx) => {
    return await ctx.db.get(result.gameId);
  });

  expect(game).not.toBeNull();
  expect(game?.status).toBe("active");
  expect(game?.startedAt).toBeDefined();
  expect(game?.currentRoundNumber).toBe(1);
  expect(game?.turnOrder).toHaveLength(2);
  expect(game?.turnPlayerId).toBe(game?.turnOrder[0]);
  expect(game?.winnerPlayerId).toBeUndefined();
  expect(game?.endedAt).toBeUndefined();
});

const modules = import.meta.glob("./**/*.ts");
