import { convexTest } from "convex-test";
import { expect, test } from "vitest";

import schema from "../schema";
import { modules } from "../test.setup";
import { factories } from "./factories";

test("factory reads return stored records and null for missing records", async () => {
  const t = convexTest(schema, modules);
  await factories.tracks.create(t);
  const lobby = await factories.lobbies.createWithGame(t, "lookup-host", 1);
  const playerId = lobby.playerIds[1];
  if (!playerId) {
    throw new Error("Expected a guest player");
  }
  const bet = await factories.roundBets.create(t, lobby.roundId, playerId);

  expect(await factories.lobbies.findByCode(t, String(lobby.record.code))).toMatchObject({
    id: lobby.id,
  });
  expect(await factories.lobbies.findById(t, lobby.id)).toMatchObject({
    record: { activeGameId: lobby.gameId, status: "in_game" },
  });
  const player = await factories.players.findById(t, playerId);
  expect(player).toMatchObject({ id: playerId, record: { lobbyId: lobby.id } });
  expect(await factories.players.findBySessionId(t, "player-1-session")).toStrictEqual(player);
  expect(await factories.players.getAllInLobby(t, lobby.id)).toHaveLength(2);
  expect(await factories.games.findCurrent(t, lobby.id)).toMatchObject({ id: lobby.gameId });
  expect(await factories.games.findById(t, lobby.gameId)).toMatchObject({
    record: { currentRoundId: lobby.roundId },
  });
  expect(await factories.rounds.findCurrent(t, lobby.gameId)).toMatchObject({ id: lobby.roundId });
  expect(await factories.rounds.findById(t, lobby.roundId)).toMatchObject({ id: lobby.roundId });
  expect(await factories.roundBets.findByPlayerAndRound(t, lobby.roundId, playerId)).toMatchObject(
    bet,
  );
  expect(await factories.roundBets.findAllInRound(t, lobby.roundId)).toMatchObject([bet]);

  await t.run(async (ctx) => {
    await ctx.db.delete(lobby.gameId);
    await ctx.db.delete(lobby.roundId);
    await ctx.db.delete(playerId);
    await ctx.db.delete(lobby.id);
    await ctx.db.delete(bet.id);
  });
  expect(await factories.lobbies.findById(t, lobby.id)).toBeNull();
  expect(await factories.lobbies.findByCode(t, String(lobby.record.code))).toBeNull();
  expect(await factories.players.findById(t, playerId)).toBeNull();
  expect(await factories.players.findBySessionId(t, "player-1-session")).toBeNull();
  expect(await factories.games.findCurrent(t, lobby.id)).toBeNull();
  expect(await factories.games.findById(t, lobby.gameId)).toBeNull();
  expect(await factories.rounds.findCurrent(t, lobby.gameId)).toBeNull();
  expect(await factories.rounds.findById(t, lobby.roundId)).toBeNull();
  expect(await factories.roundBets.findByPlayerAndRound(t, lobby.roundId, playerId)).toBeNull();
  expect(await factories.roundBets.findAllInRound(t, lobby.roundId)).toStrictEqual([]);
});

test("lobby player builders preserve host defaults and guest overrides", async () => {
  const t = convexTest(schema, modules);
  const track = await factories.tracks.create(t);
  const timeline = [
    { earnedAtRoundNumber: 1, earnedBy: "bet" as const, trackId: track.id, year: 1985 },
  ];
  const lobby = await factories.lobbies.createWithPlayers(t, "builder-host", 2, {
    hostDisplayName: "Builder Host",
    settings: { startingCoins: 7 },
    playerOverrides: [
      { sessionId: "guest", displayName: "Guest", coins: 0, timeline, timelineSize: 4 },
    ],
  });
  const players = await factories.players.getAllInLobby(t, lobby.id);
  expect(players.map((player) => player.id)).toStrictEqual(lobby.playerIds);
  expect(players.map((player) => player.record)).toMatchObject([
    {
      sessionId: "builder-host",
      displayName: "Builder Host",
      coins: 7,
      isHost: true,
      timeline: [],
      timelineSize: 0,
    },
    {
      sessionId: "guest",
      displayName: "Guest",
      coins: 0,
      isHost: false,
      timeline,
      timelineSize: 4,
    },
    {
      sessionId: "player-2-session",
      displayName: "Player 2",
      coins: 7,
      isHost: false,
      timeline: [],
      timelineSize: 0,
    },
  ]);
});

test("factory first-result reads tolerate multiple matches and retain insertion order", async () => {
  const t = convexTest(schema, modules);
  const lobby = await factories.lobbies.create(t, "duplicate-session", "First");
  await factories.players.create(t, lobby.id, { sessionId: "duplicate-session" });
  expect(await factories.players.findBySessionId(t, "duplicate-session")).toMatchObject({
    id: lobby.hostPlayerId,
  });
  expect(
    (await factories.players.getAllInLobby(t, lobby.id)).map((player) => player.record.sessionId),
  ).toStrictEqual(["duplicate-session", "duplicate-session"]);
  expect(await factories.games.findCurrent(t, lobby.id)).toBeNull();
  await factories.tracks.create(t);
  const game = await factories.games.create(t, lobby.id, [lobby.hostPlayerId]);
  expect(await factories.rounds.findCurrent(t, game.id)).toBeNull();
  const round = await factories.rounds.create(t, game.id);
  const firstBet = await factories.roundBets.create(t, round.id, lobby.hostPlayerId);
  await factories.roundBets.create(t, round.id, lobby.hostPlayerId, { proposedIndex: 1 });
  expect(
    await factories.roundBets.findByPlayerAndRound(t, round.id, lobby.hostPlayerId),
  ).toMatchObject(firstBet);
  expect(await factories.roundBets.findAllInRound(t, round.id)).toHaveLength(2);
  await t.run(async (ctx) => {
    await ctx.db.patch(game.id, { currentRoundId: round.id });
    await ctx.db.delete(round.id);
  });
  expect(await factories.rounds.findCurrent(t, game.id)).toBeNull();
  await t.run(async (ctx) => ctx.db.delete(game.id));
  expect(await factories.games.findCurrent(t, lobby.id)).toBeNull();
});

test("tracks.create creates a track with defaults", async () => {
  const t = convexTest(schema, modules);

  const result = await factories.tracks.create(t, {
    artist: "My Artist",
    title: "My Song",
    year: 1990,
  });

  expect(result.id).toBeDefined();
  expect(result.record.title).toBe("My Song");
  expect(result.record.artist).toBe("My Artist");
  expect(result.record.year).toBe(1990);
  expect(result.record.source).toBe("test");
});

test("tracks.createMany creates multiple tracks", async () => {
  const t = convexTest(schema, modules);

  const results = await factories.tracks.createMany(t, 3, {
    artist: "Artist {n}",
    title: "Song {n}",
  });

  expect(results).toHaveLength(3);
  expect(results[0]?.record.title).toBe("Song 1");
  expect(results[1]?.record.title).toBe("Song 2");
  expect(results[2]?.record.title).toBe("Song 3");
});

test("tracks.createWithYear creates track with specific year", async () => {
  const t = convexTest(schema, modules);

  const result = await factories.tracks.createWithYear(t, 1975);

  expect(result.record.year).toBe(1975);
});

test("players.create creates a player with defaults", async () => {
  const t = convexTest(schema, modules);

  const lobbyResult = await factories.lobbies.create(t, "session-1", "Host");
  const result = await factories.players.create(t, lobbyResult.id, {
    displayName: "Test Player",
  });

  expect(result.id).toBeDefined();
  expect(result.record.displayName).toBe("Test Player");
  expect(result.record.isHost).toBe(false);
  expect(result.record.coins).toBe(3);
  expect(result.record.timeline).toStrictEqual([]);
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

  expect(result.record.isHost).toBe(true);
});

test("players.createMany creates multiple players", async () => {
  const t = convexTest(schema, modules);

  const lobbyResult = await factories.lobbies.create(t, "host-session", "Host");
  const results = await factories.players.createMany(t, lobbyResult.id, 3);

  expect(results).toHaveLength(3);
  expect(results[0]?.record.isHost).toBe(true);
  expect(results[1]?.record.isHost).toBe(false);
  expect(results[2]?.record.isHost).toBe(false);
});

test("lobbies.create creates a lobby with host player", async () => {
  const t = convexTest(schema, modules);

  const result = await factories.lobbies.create(t, "session-host", "Host Player");

  expect(result.id).toBeDefined();
  expect(result.hostPlayerId).toBeDefined();
  expect(String(result.record.code)).toHaveLength(6);
  expect(result.record.status).toBe("lobby");
  expect(result.record.hostSessionId).toBe("session-host");
});

test("lobbies.createWithPlayers creates lobby with multiple players", async () => {
  const t = convexTest(schema, modules);

  const result = await factories.lobbies.createWithPlayers(t, "host-session", 2);

  expect(result.id).toBeDefined();
  expect(result.playerIds).toHaveLength(3);
  expect(result.record.status).toBe("lobby");
});

test("lobbies.createWithGame creates lobby with started game", async () => {
  const t = convexTest(schema, modules);

  await factories.tracks.createMany(t, 10);

  const result = await factories.lobbies.createWithGame(t, "host-session", 1);

  expect(result.id).toBeDefined();
  expect(result.gameId).toBeDefined();
  expect(result.roundId).toBeDefined();
  expect(result.playerIds).toHaveLength(2);
  expect(result.record.status).toBe("in_game");
});

test("games.createInPhase creates game in placing phase", async () => {
  const t = convexTest(schema, modules);

  await factories.tracks.createMany(t, 10);
  const lobby = await factories.lobbies.createWithPlayers(t, "host-session", 2);

  const result = await factories.games.createInPhase(t, lobby.id, "placing");

  expect(result.id).toBeDefined();
  expect(result.roundId).toBeDefined();
  expect(result.record.status).toBe("active");
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
      awardedPlayerIds: [],
      coinDeltas: [],
      resolvedAt: Date.now(),
      turnPlayerWasCorrect: true,
      validIndexMax: 3,
      validIndexMin: 0,
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
  // oxlint-disable-next-line typescript/no-non-null-assertion, typescript/no-unnecessary-type-assertion
  const result = await factories.roundBets.create(t, game.roundId, lobby.playerIds[1]!);

  expect(result.id).toBeDefined();
  expect(result.record.proposedIndex).toBe(0);
  expect(result.record.lockedIn).toBe(false);
  expect(result.record.status).toBe("pending");
});

test("roundBets.createLocked creates a locked bet", async () => {
  const t = convexTest(schema, modules);

  await factories.tracks.createMany(t, 10);
  const lobby = await factories.lobbies.createWithPlayers(t, "host-session", 2);
  const game = await factories.games.createInPhase(t, lobby.id, "betting");

  expect(lobby.playerIds[1]).toBeDefined();
  // oxlint-disable-next-line typescript/no-non-null-assertion, typescript/no-unnecessary-type-assertion
  const result = await factories.roundBets.createLocked(t, game.roundId, lobby.playerIds[1]!, 2);

  expect(result.record.lockedIn).toBe(true);
  expect(result.record.proposedIndex).toBe(2);
});
