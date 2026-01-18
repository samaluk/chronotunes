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

async function seedMoreTestTracks(t: ReturnType<typeof convexTest>, count: number = 10) {
  await t.run(async (ctx) => {
    for (let i = 0; i < count; i++) {
      const year = 1950 + i * 5;
      await ctx.db.insert("tracks", {
        title: `Test Song ${i}`,
        artist: `Test Artist ${i}`,
        year,
        externalIds: { youtubeVideoId: `abc${i}` },
        links: {},
        createdAt: Date.now(),
        source: "test",
      });
    }
  });
}

test("skipTurn rejects when caller is not host", async () => {
  const t = convexTest(schema, modules);

  await seedMoreTestTracks(t, 10);

  const { code } = await t.mutation(api.lobbies.create, {
    sessionId: "host-skip-auth",
    displayName: "HostSkipAuth",
  });

  await t.mutation(api.lobbies.join, {
    code,
    sessionId: "player-skip-auth",
    displayName: "PlayerSkipAuth",
  });

  const lobby = await t.query(api.lobbies.get, { code });

  await t.mutation(api.games.start, {
    lobbyId: lobby!._id,
    sessionId: "host-skip-auth",
  });

  await expect(
    t.mutation(api.games.skipTurn, {
      lobbyId: lobby!._id,
      sessionId: "player-skip-auth",
    }),
  ).rejects.toThrow("Only the host can skip a turn");
});

test("skipTurn rejects when no active game", async () => {
  const t = convexTest(schema, modules);

  const { code } = await t.mutation(api.lobbies.create, {
    sessionId: "host-skip-game",
    displayName: "HostSkipGame",
  });

  const lobby = await t.query(api.lobbies.get, { code });

  await expect(
    t.mutation(api.games.skipTurn, {
      lobbyId: lobby!._id,
      sessionId: "host-skip-game",
    }),
  ).rejects.toThrow("No active game in this lobby");
});

test("skipTurn rejects when game is not active", async () => {
  const t = convexTest(schema, modules);

  await seedTestTracks(t);

  const { code } = await t.mutation(api.lobbies.create, {
    sessionId: "host-skip-active",
    displayName: "HostSkipActive",
  });

  await t.mutation(api.lobbies.join, {
    code,
    sessionId: "player-skip-active",
    displayName: "PlayerSkipActive",
  });

  const lobby = await t.query(api.lobbies.get, { code });

  await t.mutation(api.games.start, {
    lobbyId: lobby!._id,
    sessionId: "host-skip-active",
  });

  const game = await t.query(api.games.getCurrent, { lobbyId: lobby!._id });

  await t.run(async (ctx) => {
    await ctx.db.patch(game!._id, { status: "finished" });
  });

  await expect(
    t.mutation(api.games.skipTurn, {
      lobbyId: lobby!._id,
      sessionId: "host-skip-active",
    }),
  ).rejects.toThrow("Game is not active");
});

test("skipTurn advances to next player", async () => {
  const t = convexTest(schema, modules);

  await seedMoreTestTracks(t, 10);

  const { code } = await t.mutation(api.lobbies.create, {
    sessionId: "host-skip-advance",
    displayName: "HostSkipAdvance",
  });

  await t.mutation(api.lobbies.join, {
    code,
    sessionId: "player1-skip-advance",
    displayName: "Player1",
  });

  await t.mutation(api.lobbies.join, {
    code,
    sessionId: "player2-skip-advance",
    displayName: "Player2",
  });

  const lobby = await t.query(api.lobbies.get, { code });

  await t.mutation(api.games.start, {
    lobbyId: lobby!._id,
    sessionId: "host-skip-advance",
  });

  const gameBefore = await t.query(api.games.getCurrent, { lobbyId: lobby!._id });
  const turnPlayerIdBefore = gameBefore!.turnPlayerId!;

  const result = await t.mutation(api.games.skipTurn, {
    lobbyId: lobby!._id,
    sessionId: "host-skip-advance",
  });

  expect(result.gameEnded).toBe(false);
  expect(result.nextTurnPlayerId).toBeDefined();
  expect(result.nextTurnPlayerId).not.toBe(turnPlayerIdBefore);

  const gameAfter = await t.query(api.games.getCurrent, { lobbyId: lobby!._id });

  expect(gameAfter?.turnPlayerId).toBe(result.nextTurnPlayerId);
  expect(gameAfter?.currentRoundNumber).toBe(2);
  expect(gameAfter?.currentRoundId).toBe(result.nextRoundId);
});

test("skipTurn creates new round", async () => {
  const t = convexTest(schema, modules);

  await seedMoreTestTracks(t, 10);

  const { code } = await t.mutation(api.lobbies.create, {
    sessionId: "host-skip-round",
    displayName: "HostSkipRound",
  });

  await t.mutation(api.lobbies.join, {
    code,
    sessionId: "player-skip-round",
    displayName: "PlayerSkipRound",
  });

  const lobby = await t.query(api.lobbies.get, { code });

  await t.mutation(api.games.start, {
    lobbyId: lobby!._id,
    sessionId: "host-skip-round",
  });

  const gameBefore = await t.query(api.games.getCurrent, { lobbyId: lobby!._id });
  const roundBeforeId = gameBefore!.currentRoundId!;

  const result = await t.mutation(api.games.skipTurn, {
    lobbyId: lobby!._id,
    sessionId: "host-skip-round",
  });

  expect(result.nextRoundId).toBeDefined();
  expect(result.nextRoundId).not.toBe(roundBeforeId);

  const nextRound = await t.run(async (ctx) => {
    return await ctx.db.get(result.nextRoundId!);
  });

  expect(nextRound).not.toBeNull();
  expect(nextRound?.phase).toBe("placing");
  expect(nextRound?.roundNumber).toBe(2);
  expect(nextRound?.trackId).toBeDefined();
});

test("skipTurn handles end of turn order", async () => {
  const t = convexTest(schema, modules);

  await seedMoreTestTracks(t, 10);

  const { code } = await t.mutation(api.lobbies.create, {
    sessionId: "host-skip-end",
    displayName: "HostSkipEnd",
  });

  await t.mutation(api.lobbies.join, {
    code,
    sessionId: "player1-skip-end",
    displayName: "Player1",
  });

  await t.mutation(api.lobbies.join, {
    code,
    sessionId: "player2-skip-end",
    displayName: "Player2",
  });

  const lobby = await t.query(api.lobbies.get, { code });

  await t.mutation(api.games.start, {
    lobbyId: lobby!._id,
    sessionId: "host-skip-end",
  });

  const gameBefore = await t.query(api.games.getCurrent, { lobbyId: lobby!._id });
  const turnOrder = gameBefore!.turnOrder!;
  const lastPlayerId = turnOrder[turnOrder.length - 1]!;

  await t.run(async (ctx) => {
    await ctx.db.patch(gameBefore!._id, { turnPlayerId: lastPlayerId });
  });

  const result = await t.mutation(api.games.skipTurn, {
    lobbyId: lobby!._id,
    sessionId: "host-skip-end",
  });

  expect(result.gameEnded).toBe(false);
  expect(result.nextTurnPlayerId).toBe(turnOrder[0]);
});

const modules = import.meta.glob("./**/*.ts");
