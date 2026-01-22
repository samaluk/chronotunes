import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import schema from "../schema";
import { modules } from "../test.setup";
import { factories } from "./factories";

test("tracks.create creates a track with defaults", async () => {
  const t = convexTest(schema, modules);

  const result = await factories.tracks.create(t, {
    title: "My Song",
    artist: "My Artist",
    year: 1990,
  });

  expect(result.id).toBeDefined();
  expect(result.record["title"]).toBe("My Song");
  expect(result.record["artist"]).toBe("My Artist");
  expect(result.record["year"]).toBe(1990);
  expect(result.record["source"]).toBe("test");
});

test("tracks.createMany creates multiple tracks", async () => {
  const t = convexTest(schema, modules);

  const results = await factories.tracks.createMany(t, 3, {
    title: "Song {n}",
    artist: "Artist {n}",
  });

  expect(results).toHaveLength(3);
  expect(results[0]?.record["title"]).toBe("Song 1");
  expect(results[1]?.record["title"]).toBe("Song 2");
  expect(results[2]?.record["title"]).toBe("Song 3");
});

test("tracks.createWithYear creates track with specific year", async () => {
  const t = convexTest(schema, modules);

  const result = await factories.tracks.createWithYear(t, 1975);

  expect(result.record["year"]).toBe(1975);
});

test("players.create creates a player with defaults", async () => {
  const t = convexTest(schema, modules);

  const lobbyResult = await factories.lobbies.create(t, "session-1", "Host");
  const result = await factories.players.create(t, lobbyResult.id, {
    displayName: "Test Player",
  });

  expect(result.id).toBeDefined();
  expect(result.record["displayName"]).toBe("Test Player");
  expect(result.record["isHost"]).toBe(false);
  expect(result.record["coins"]).toBe(3);
  expect(result.record["timeline"]).toEqual([]);
});

test("players.createHost creates a host player", async () => {
  const t = convexTest(schema, modules);

  const lobbyResult = await factories.lobbies.create(t, "session-host", "Host Player");
  const result = await factories.players.createHost(
    t,
    lobbyResult.id,
    "session-host",
    "Host Player",
  );

  expect(result.record["isHost"]).toBe(true);
});

test("players.createMany creates multiple players", async () => {
  const t = convexTest(schema, modules);

  const lobbyResult = await factories.lobbies.create(t, "host-session", "Host");
  const results = await factories.players.createMany(t, lobbyResult.id, 3);

  expect(results).toHaveLength(3);
  expect(results[0]?.record["isHost"]).toBe(true);
  expect(results[1]?.record["isHost"]).toBe(false);
  expect(results[2]?.record["isHost"]).toBe(false);
});

test("lobbies.create creates a lobby with host player", async () => {
  const t = convexTest(schema, modules);

  const result = await factories.lobbies.create(t, "session-host", "Host Player");

  expect(result.id).toBeDefined();
  expect(result.hostPlayerId).toBeDefined();
  expect(String(result.record["code"]).length).toBe(6);
  expect(result.record["status"]).toBe("lobby");
  expect(result.record["hostSessionId"]).toBe("session-host");
});

test("lobbies.createWithPlayers creates lobby with multiple players", async () => {
  const t = convexTest(schema, modules);

  const result = await factories.lobbies.createWithPlayers(t, "host-session", 2);

  expect(result.id).toBeDefined();
  expect(result.playerIds).toHaveLength(3);
  expect(result.record["status"]).toBe("lobby");
});

test("lobbies.createWithGame creates lobby with started game", async () => {
  const t = convexTest(schema, modules);

  await factories.tracks.createMany(t, 10);

  const result = await factories.lobbies.createWithGame(t, "host-session", 1);

  expect(result.id).toBeDefined();
  expect(result.gameId).toBeDefined();
  expect(result.roundId).toBeDefined();
  expect(result.playerIds).toHaveLength(2);
  expect(result.record["status"]).toBe("in_game");
});

test("games.createInPhase creates game in placing phase", async () => {
  const t = convexTest(schema, modules);

  await factories.tracks.createMany(t, 10);
  const lobby = await factories.lobbies.createWithPlayers(t, "host-session", 2);

  const result = await factories.games.createInPhase(t, lobby.id, "placing");

  expect(result.id).toBeDefined();
  expect(result.roundId).toBeDefined();
  expect(result.record["status"]).toBe("active");
});

test("games.createInPhase creates game in betting phase", async () => {
  const t = convexTest(schema, modules);

  await factories.tracks.createMany(t, 10);
  const lobby = await factories.lobbies.createWithPlayers(t, "host-session", 2);
  const game = await factories.games.createInPhase(t, lobby.id, "betting", {
    placementIndex: 2,
  });

  expect(game.id).toBeDefined();
  expect(game.roundId).toBeDefined();
});

test("games.createInPhase creates game in resolved phase", async () => {
  const t = convexTest(schema, modules);

  await factories.tracks.createMany(t, 10);
  const lobby = await factories.lobbies.createWithPlayers(t, "host-session", 2);
  const game = await factories.games.createInPhase(t, lobby.id, "resolved", {
    resolution: {
      validIndexMin: 0,
      validIndexMax: 3,
      turnPlayerWasCorrect: true,
      awardedPlayerIds: [],
      coinDeltas: [],
      resolvedAt: Date.now(),
    },
  });

  expect(game.id).toBeDefined();
  expect(game.roundId).toBeDefined();
});

test("roundBets.create creates a bet with defaults", async () => {
  const t = convexTest(schema, modules);

  await factories.tracks.createMany(t, 10);
  const lobby = await factories.lobbies.createWithPlayers(t, "host-session", 2);
  const game = await factories.games.createInPhase(t, lobby.id, "betting");

  expect(lobby.playerIds[1]).toBeDefined();
  const result = await factories.roundBets.create(t, game.roundId, lobby.playerIds[1]!);

  expect(result.id).toBeDefined();
  expect(result.record["proposedIndex"]).toBe(0);
  expect(result.record["lockedIn"]).toBe(false);
  expect(result.record["status"]).toBe("pending");
});

test("roundBets.createLocked creates a locked bet", async () => {
  const t = convexTest(schema, modules);

  await factories.tracks.createMany(t, 10);
  const lobby = await factories.lobbies.createWithPlayers(t, "host-session", 2);
  const game = await factories.games.createInPhase(t, lobby.id, "betting");

  expect(lobby.playerIds[1]).toBeDefined();
  const result = await factories.roundBets.createLocked(t, game.roundId, lobby.playerIds[1]!, 2);

  expect(result.record["lockedIn"]).toBe(true);
  expect(result.record["proposedIndex"]).toBe(2);
});
