import { convexTest } from "convex-test";
import { expect, test } from "vitest";

import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { asSessionId } from "./lib/sessions";
import schema from "./schema";
import { modules } from "./test.setup";

async function seedTestTracks(t: ReturnType<typeof convexTest>) {
  await t.run(async (ctx) => {
    await ctx.db.insert("tracks", {
      artist: "Test Artist 1",
      createdAt: Date.now(),
      externalIds: { youtubeVideoId: "abc123" },
      links: {},
      source: "test",
      title: "Test Song 1",
      year: 1980,
    });
    await ctx.db.insert("tracks", {
      artist: "Test Artist 2",
      createdAt: Date.now(),
      externalIds: { youtubeVideoId: "def456" },
      links: {},
      source: "test",
      title: "Test Song 2",
      year: 1990,
    });
    await ctx.db.insert("tracks", {
      artist: "Test Artist 3",
      createdAt: Date.now(),
      externalIds: { youtubeVideoId: "ghi789" },
      links: {},
      source: "test",
      title: "Test Song 3",
      year: 2000,
    });
    await ctx.db.insert("tracks", {
      artist: "Test Artist 4",
      createdAt: Date.now(),
      externalIds: { youtubeVideoId: "jkl012" },
      links: {},
      source: "test",
      title: "Test Song 4",
      year: 2010,
    });
    await ctx.db.insert("tracks", {
      artist: "Test Artist 5",
      createdAt: Date.now(),
      externalIds: { youtubeVideoId: "mno345" },
      links: {},
      source: "test",
      title: "Test Song 5",
      year: 2020,
    });
  });
}

test("start creates game with active status", async () => {
  const t = convexTest(schema, modules);

  await seedTestTracks(t);

  const { code } = await t.mutation(api.lobbies.create, {
    displayName: "HostStart",
    sessionId: asSessionId("host-session-start"),
  });

  await t.mutation(api.lobbies.join, {
    code,
    displayName: "PlayerStart",
    sessionId: asSessionId("player-session-start"),
  });

  const lobby = await t.query(api.lobbies.get, { code });

  const result = await t.mutation(api.games.start, {
    lobbyId: lobby!._id,
    sessionId: asSessionId("host-session-start"),
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
    displayName: "HostOrder",
    sessionId: asSessionId("host-session-order"),
  });

  await t.mutation(api.lobbies.join, {
    code,
    displayName: "Player1",
    sessionId: asSessionId("player1-session-order"),
  });

  await t.mutation(api.lobbies.join, {
    code,
    displayName: "Player2",
    sessionId: asSessionId("player2-session-order"),
  });

  await t.mutation(api.lobbies.join, {
    code,
    displayName: "Player3",
    sessionId: asSessionId("player3-session-order"),
  });

  const lobby = await t.query(api.lobbies.get, { code });

  await t.mutation(api.games.start, {
    lobbyId: lobby!._id,
    sessionId: asSessionId("host-session-order"),
  });

  const game = await t.query(api.games.getCurrent, { lobbyId: lobby!._id });

  expect(game).not.toBeNull();
  expect(game?.turnOrder).toHaveLength(4);
  expect(game?.turnOrder).toContain(game?.turnPlayerId);
});

test("start rejects when less than 2 players", async () => {
  const t = convexTest(schema, modules);

  await seedTestTracks(t);

  const { code } = await t.mutation(api.lobbies.create, {
    displayName: "HostMin",
    sessionId: asSessionId("host-session-min"),
  });

  const lobby = await t.query(api.lobbies.get, { code });

  await expect(
    t.mutation(api.games.start, {
      lobbyId: lobby!._id,
      sessionId: asSessionId("host-session-min"),
    }),
  ).rejects.toThrow("At least 2 players are required to start a game");
});

test("start rejects when caller is not host", async () => {
  const t = convexTest(schema, modules);

  await seedTestTracks(t);

  const { code } = await t.mutation(api.lobbies.create, {
    displayName: "HostAuth",
    sessionId: asSessionId("host-session-auth"),
  });

  await t.mutation(api.lobbies.join, {
    code,
    displayName: "PlayerAuth",
    sessionId: asSessionId("player-session-auth"),
  });

  const lobby = await t.query(api.lobbies.get, { code });

  await expect(
    t.mutation(api.games.start, {
      lobbyId: lobby!._id,
      sessionId: asSessionId("player-session-auth"),
    }),
  ).rejects.toThrow("Only the host can start the game");
});

test("start rejects when game already started", async () => {
  const t = convexTest(schema, modules);

  await seedTestTracks(t);

  const { code } = await t.mutation(api.lobbies.create, {
    displayName: "HostStarted",
    sessionId: asSessionId("host-session-started"),
  });

  await t.mutation(api.lobbies.join, {
    code,
    displayName: "PlayerStarted",
    sessionId: asSessionId("player-session-started"),
  });

  const lobby = await t.query(api.lobbies.get, { code });

  await t.mutation(api.games.start, {
    lobbyId: lobby!._id,
    sessionId: asSessionId("host-session-started"),
  });

  await expect(
    t.mutation(api.games.start, {
      lobbyId: lobby!._id,
      sessionId: asSessionId("host-session-started"),
    }),
  ).rejects.toThrow("Game has already started");
});

test("start creates first round with phase placing", async () => {
  const t = convexTest(schema, modules);

  await seedTestTracks(t);

  const { code } = await t.mutation(api.lobbies.create, {
    displayName: "HostRound",
    sessionId: asSessionId("host-session-round"),
  });

  await t.mutation(api.lobbies.join, {
    code,
    displayName: "PlayerRound",
    sessionId: asSessionId("player-session-round"),
  });

  const lobby = await t.query(api.lobbies.get, { code });

  const result = await t.mutation(api.games.start, {
    lobbyId: lobby!._id,
    sessionId: asSessionId("host-session-round"),
  });

  const game = await t.run(async (ctx) => await ctx.db.get(result.gameId));

  expect(game?.currentRoundId).toBe(result.roundId);
  expect(game?.currentRoundNumber).toBe(1);

  const round = await t.run(async (ctx) => await ctx.db.get(result.roundId));

  expect(round).not.toBeNull();
  expect(round?.phase).toBe("placing");
  expect(round?.roundNumber).toBe(1);
});

test("start sets turnPlayerId correctly", async () => {
  const t = convexTest(schema, modules);

  await seedTestTracks(t);

  const { code } = await t.mutation(api.lobbies.create, {
    displayName: "HostTurn",
    sessionId: asSessionId("host-session-turn"),
  });

  await t.mutation(api.lobbies.join, {
    code,
    displayName: "PlayerTurn",
    sessionId: asSessionId("player-session-turn"),
  });

  const lobby = await t.query(api.lobbies.get, { code });

  await t.mutation(api.games.start, {
    lobbyId: lobby!._id,
    sessionId: asSessionId("host-session-turn"),
  });

  const game = await t.query(api.games.getCurrent, { lobbyId: lobby!._id });

  expect(game?.turnPlayerId).toBeDefined();
  expect(game?.turnOrder).toContain(game?.turnPlayerId);
});

test("start creates game with correct structure", async () => {
  const t = convexTest(schema, modules);

  await seedTestTracks(t);

  const { code } = await t.mutation(api.lobbies.create, {
    displayName: "HostStructure",
    sessionId: asSessionId("host-session-structure"),
  });

  await t.mutation(api.lobbies.join, {
    code,
    displayName: "PlayerStructure",
    sessionId: asSessionId("player-session-structure"),
  });

  const lobby = await t.query(api.lobbies.get, { code });

  const result = await t.mutation(api.games.start, {
    lobbyId: lobby!._id,
    sessionId: asSessionId("host-session-structure"),
  });

  const game = await t.run(async (ctx) => await ctx.db.get(result.gameId));

  expect(game).not.toBeNull();
  expect(game?.status).toBe("active");
  expect(game?.startedAt).toBeDefined();
  expect(game?.currentRoundNumber).toBe(1);
  expect(game?.turnOrder).toHaveLength(2);
  expect(game?.turnOrder).toContain(game?.turnPlayerId);
  expect(game?.winnerPlayerId).toBeUndefined();
  expect(game?.endedAt).toBeUndefined();
});

async function seedMoreTestTracks(t: ReturnType<typeof convexTest>, count = 10) {
  await t.run(async (ctx) => {
    await Promise.all(
      Array.from({ length: count }, (_, i) => {
        const year = 1950 + i * 5;
        return ctx.db.insert("tracks", {
          artist: `Test Artist ${i}`,
          createdAt: Date.now(),
          externalIds: { youtubeVideoId: `abc${i}` },
          links: {},
          source: "test",
          title: `Test Song ${i}`,
          year,
        });
      }),
    );
  });
}

async function setupGameForResolve(t: ReturnType<typeof convexTest>) {
  const { code } = await t.mutation(api.lobbies.create, {
    displayName: "HostResolve",
    sessionId: asSessionId("host-resolve"),
  });

  await t.mutation(api.lobbies.join, {
    code,
    displayName: "PlayerResolve",
    sessionId: asSessionId("player1-resolve"),
  });

  const lobby = await t.query(api.lobbies.get, { code });

  await t.mutation(api.games.start, {
    lobbyId: lobby!._id,
    sessionId: asSessionId("host-resolve"),
  });

  const game = await t.query(api.games.getCurrent, { lobbyId: lobby!._id });
  const _roundId = game!.currentRoundId!;

  await t.run(async (ctx) => {
    const round = await ctx.db.get(game!.currentRoundId!);
    const track = round ? await ctx.db.get(round.trackId) : null;

    if (!(round && track)) {
      return;
    }

    const turnPlayer = await ctx.db.get(round.turnPlayerId);

    if (turnPlayer && turnPlayer.timeline.length === 0) {
      await ctx.db.patch(turnPlayer._id, {
        timeline: [
          {
            earnedAtRoundNumber: round.roundNumber,
            earnedBy: "placement",
            trackId: track._id,
            year: track.year,
          },
        ],
        timelineSize: 1,
      });
    }
  });

  return { lobbyId: lobby!._id };
}

async function placeDummyBets(t: ReturnType<typeof convexTest>, lobbyId: string) {
  const game = await t.query(api.games.getCurrent, {
    lobbyId: lobbyId as Id<"lobbies">,
  });
  const turnPlayerId = game!.turnPlayerId!;

  const players = await t.run(
    async (ctx) =>
      await ctx.db
        .query("players")
        .filter((q) => q.eq(q.field("lobbyId"), lobbyId))
        .collect(),
  );

  const round = await t.run(async (ctx) => await ctx.db.get(game!.currentRoundId!));

  const placementIndex = round?.placement?.proposedIndex ?? 0;
  const proposedIndex = placementIndex === 0 ? 1 : 0;

  const nonTurnPlayers = players.filter((player) => player._id !== turnPlayerId);

  await Promise.all(
    nonTurnPlayers.map((player) =>
      t.mutation(api.bets.preview, {
        lobbyId: lobbyId as Id<"lobbies">,
        proposedIndex,
        sessionId: asSessionId(player.sessionId),
      }),
    ),
  );

  await Promise.all(
    nonTurnPlayers.map((player) =>
      t.mutation(api.bets.lockIn, {
        lobbyId: lobbyId as Id<"lobbies">,
        sessionId: asSessionId(player.sessionId),
      }),
    ),
  );
}

async function declineAllNonTurnPlayers(t: ReturnType<typeof convexTest>, lobbyId: string) {
  const game = await t.query(api.games.getCurrent, {
    lobbyId: lobbyId as Id<"lobbies">,
  });
  const turnPlayerId = game!.turnPlayerId!;

  const players = await t.run(
    async (ctx) =>
      await ctx.db
        .query("players")
        .filter((q) => q.eq(q.field("lobbyId"), lobbyId))
        .collect(),
  );

  const nonTurnPlayers = players.filter((player) => player._id !== turnPlayerId);

  await Promise.all(
    nonTurnPlayers.map((player) =>
      t.mutation(api.rounds.declineBet, {
        lobbyId: lobbyId as Id<"lobbies">,
        sessionId: asSessionId(player.sessionId),
      }),
    ),
  );
}

test("skipTurn rejects when caller is not host", async () => {
  const t = convexTest(schema, modules);

  await seedMoreTestTracks(t, 10);

  const { code } = await t.mutation(api.lobbies.create, {
    displayName: "HostSkipAuth",
    sessionId: asSessionId("host-skip-auth"),
  });

  await t.mutation(api.lobbies.join, {
    code,
    displayName: "PlayerSkipAuth",
    sessionId: asSessionId("player-skip-auth"),
  });

  const lobby = await t.query(api.lobbies.get, { code });

  await t.mutation(api.games.start, {
    lobbyId: lobby!._id,
    sessionId: asSessionId("host-skip-auth"),
  });

  await expect(
    t.mutation(api.games.skipTurn, {
      lobbyId: lobby!._id,
      sessionId: asSessionId("player-skip-auth"),
    }),
  ).rejects.toThrow("Only the host can skip a turn");
});

test("skipTurn rejects when no active game", async () => {
  const t = convexTest(schema, modules);

  const { code } = await t.mutation(api.lobbies.create, {
    displayName: "HostSkipGame",
    sessionId: asSessionId("host-skip-game"),
  });

  const lobby = await t.query(api.lobbies.get, { code });

  await expect(
    t.mutation(api.games.skipTurn, {
      lobbyId: lobby!._id,
      sessionId: asSessionId("host-skip-game"),
    }),
  ).rejects.toThrow("No active game in this lobby");
});

test("skipTurn rejects when game is not active", async () => {
  const t = convexTest(schema, modules);

  await seedMoreTestTracks(t, 10);

  const { lobbyId } = await setupGameForResolve(t);

  const game = await t.query(api.games.getCurrent, { lobbyId });

  await t.run(async (ctx) => {
    await ctx.db.patch(game!._id, { status: "finished" });
  });

  await expect(
    t.mutation(api.games.skipTurn, {
      lobbyId,
      sessionId: asSessionId("host-resolve"),
    }),
  ).rejects.toThrow("Game is not active");
});

test("skipTurn advances to next player", async () => {
  const t = convexTest(schema, modules);

  await seedMoreTestTracks(t, 10);

  const { lobbyId } = await setupGameForResolve(t);

  const game = await t.query(api.games.getCurrent, { lobbyId });

  const turnPlayerId = game!.turnPlayerId!;

  const nonTurnPlayerId = game!.turnOrder.find((id) => id !== turnPlayerId)!;

  const nonTurnPlayer = await t.run(async (ctx) => await ctx.db.get(nonTurnPlayerId));

  const nonTurnSessionId = nonTurnPlayer?.sessionId ?? "player1-resolve";

  await t.run(async (ctx) => {
    const round = await ctx.db.get(game!.currentRoundId!);
    const track = await ctx.db.get(round!.trackId!);

    await ctx.db.patch(round!._id, {
      phase: "betting",
      placement: { proposedIndex: 100, submittedAt: Date.now() },
    });

    const player = await ctx.db.get(turnPlayerId);
    await ctx.db.patch(player!._id, {
      timeline: [
        {
          earnedAtRoundNumber: 1,
          earnedBy: "placement",
          trackId: track!._id,
          year: track!.year + 10,
        },
      ],
      timelineSize: 1,
    });
  });

  await t.mutation(api.bets.preview, {
    lobbyId,
    proposedIndex: 0,
    sessionId: asSessionId(nonTurnSessionId),
  });

  await t.mutation(api.bets.lockIn, {
    lobbyId,
    sessionId: asSessionId(nonTurnSessionId),
  });

  await t.mutation(api.games.resolveRound, {
    lobbyId,
    sessionId: asSessionId("host-resolve"),
  });

  const updatedOtherPlayer = await t.run(async (ctx) => await ctx.db.get(nonTurnPlayerId));

  expect(updatedOtherPlayer?.timelineSize).toBe(2);
  expect(updatedOtherPlayer?.timeline).toHaveLength(2);
  expect(updatedOtherPlayer?.coins).toBe(2);
});

test("resolveAndNext sets round phase to resolved", async () => {
  const t = convexTest(schema, modules);

  await seedMoreTestTracks(t, 10);

  const { lobbyId } = await setupGameForResolve(t);

  const game = await t.query(api.games.getCurrent, { lobbyId });
  const roundId = game!.currentRoundId!;

  await t.run(async (ctx) => {
    const round = await ctx.db.get(roundId);
    await ctx.db.patch(round!._id, {
      phase: "betting",
      placement: { proposedIndex: 0, submittedAt: Date.now() },
    });
  });

  await placeDummyBets(t, lobbyId);

  await t.mutation(api.games.resolveRound, {
    lobbyId,
    sessionId: asSessionId("host-resolve"),
  });

  const updatedRound = await t.run(async (ctx) => await ctx.db.get(game!.currentRoundId!));

  expect(updatedRound?.phase).toBe("resolved");
  expect(updatedRound?.resolution).toBeDefined();
  expect(updatedRound?.resolution?.resolvedAt).toBeDefined();
});

test("resolveAndNext handles empty betting phase", async () => {
  const t = convexTest(schema, modules);

  await seedMoreTestTracks(t, 10);

  const { lobbyId } = await setupGameForResolve(t);

  const game = await t.query(api.games.getCurrent, { lobbyId });

  await t.run(async (ctx) => {
    const round = await ctx.db.get(game!.currentRoundId!);
    await ctx.db.patch(round!._id, {
      phase: "betting",
      placement: { proposedIndex: 0, submittedAt: Date.now() },
    });
  });

  await declineAllNonTurnPlayers(t, lobbyId);

  await t.mutation(api.games.resolveRound, {
    lobbyId,
    sessionId: asSessionId("host-resolve"),
  });

  const result = await t.mutation(api.games.resolveAndNext, {
    lobbyId,
    sessionId: asSessionId("host-resolve"),
  });

  expect(result.gameEnded).toBeFalsy();
  expect(result.nextRoundId).toBeDefined();
});

test("resolveAndNext handles no tracks available", async () => {
  const t = convexTest(schema, modules);

  await t.run(async (ctx) => {
    await Promise.all(
      Array.from({ length: 3 }, (_, i) =>
        ctx.db.insert("tracks", {
          artist: "Test Artist",
          createdAt: Date.now(),
          externalIds: { youtubeVideoId: `abc${i}` },
          links: {},
          source: "test",
          title: `Track ${i}`,
          year: 1980 + i,
        }),
      ),
    );
  });

  const { code } = await t.mutation(api.lobbies.create, {
    displayName: "HostNoTracks",
    sessionId: asSessionId("host-notracks"),
  });

  await t.mutation(api.lobbies.join, {
    code,
    displayName: "Player1",
    sessionId: asSessionId("player1-notracks"),
  });

  const lobby = await t.query(api.lobbies.get, { code });

  await t.mutation(api.games.start, {
    lobbyId: lobby!._id,
    sessionId: asSessionId("host-notracks"),
  });

  const game = await t.query(api.games.getCurrent, { lobbyId: lobby!._id });
  const roundId = game!.currentRoundId!;

  await t.run(async (ctx) => {
    const round = await ctx.db.get(game!.currentRoundId!);
    await ctx.db.patch(round!._id, {
      phase: "betting",
      placement: { proposedIndex: 0, submittedAt: Date.now() },
    });
  });

  await placeDummyBets(t, lobby!._id);

  await t.mutation(api.games.resolveRound, {
    lobbyId: lobby!._id,
    sessionId: asSessionId("host-notracks"),
  });

  const resolvedRound = await t.run(async (ctx) => await ctx.db.get(roundId));
  expect(resolvedRound?.phase).toBe("resolved");

  const result = await t.mutation(api.games.resolveAndNext, {
    lobbyId: lobby!._id,
    sessionId: asSessionId("host-notracks"),
  });

  expect(result.gameEnded).toBeTruthy();
  expect(result.winnerPlayerId).toBeNull();
  expect(result.noTracksAvailable).toBeTruthy();
});

test("start sets all players' coins to lobby's startingCoins setting", async () => {
  const t = convexTest(schema, modules);

  await seedTestTracks(t);

  const { code } = await t.mutation(api.lobbies.create, {
    displayName: "HostCoinsStart",
    sessionId: asSessionId("host-coins-start"),
  });

  await t.mutation(api.lobbies.join, {
    code,
    displayName: "Player1",
    sessionId: asSessionId("player1-coins-start"),
  });

  await t.mutation(api.lobbies.join, {
    code,
    displayName: "Player2",
    sessionId: asSessionId("player2-coins-start"),
  });

  await t.mutation(api.lobbies.updateSettings, {
    code,
    sessionId: asSessionId("host-coins-start"),
    settings: { startingCoins: 5 },
  });

  const lobby = await t.query(api.lobbies.get, { code });

  const playersBeforeStart = await t.run(async (ctx) => {
    const lobbyDoc = await ctx.db.query("lobbies").first();
    if (!lobbyDoc) {
      return [];
    }
    const allPlayers = await ctx.db
      .query("players")
      .filter((q) => q.eq(q.field("lobbyId"), lobbyDoc._id))
      .collect();
    return allPlayers;
  });

  expect(playersBeforeStart).toHaveLength(3);
  for (const player of playersBeforeStart) {
    expect(player.coins).toBe(0);
  }

  await t.mutation(api.games.start, {
    lobbyId: lobby!._id,
    sessionId: asSessionId("host-coins-start"),
  });

  const playersAfterStart = await t.run(async (ctx) => {
    const lobbyDoc = await ctx.db.query("lobbies").first();
    if (!lobbyDoc) {
      return [];
    }
    const allPlayers = await ctx.db
      .query("players")
      .filter((q) => q.eq(q.field("lobbyId"), lobbyDoc._id))
      .collect();
    return allPlayers;
  });

  expect(playersAfterStart).toHaveLength(3);
  for (const player of playersAfterStart) {
    expect(player.coins).toBe(5);
  }
});

test("start ignores settings changes and uses final lobby startingCoins", async () => {
  const t = convexTest(schema, modules);

  await seedTestTracks(t);

  const { code } = await t.mutation(api.lobbies.create, {
    displayName: "HostCoinsFinal",
    sessionId: asSessionId("host-coins-final"),
  });

  await t.mutation(api.lobbies.join, {
    code,
    displayName: "Player1",
    sessionId: asSessionId("player1-coins-final"),
  });

  await t.mutation(api.lobbies.updateSettings, {
    code,
    sessionId: asSessionId("host-coins-final"),
    settings: { startingCoins: 7 },
  });

  await t.mutation(api.lobbies.updateSettings, {
    code,
    sessionId: asSessionId("host-coins-final"),
    settings: { startingCoins: 4 },
  });

  const lobby = await t.query(api.lobbies.get, { code });

  await t.mutation(api.games.start, {
    lobbyId: lobby!._id,
    sessionId: asSessionId("host-coins-final"),
  });

  const players = await t.run(async (ctx) => {
    const lobbyDoc = await ctx.db.query("lobbies").first();
    if (!lobbyDoc) {
      return [];
    }
    const allPlayers = await ctx.db
      .query("players")
      .filter((q) => q.eq(q.field("lobbyId"), lobbyDoc._id))
      .collect();
    return allPlayers;
  });

  expect(players).toHaveLength(2);
  for (const player of players) {
    expect(player.coins).toBe(4);
  }
});
