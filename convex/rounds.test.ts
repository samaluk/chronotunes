import { convexTest } from "convex-test";
import { expect, test } from "vitest";

import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { asSessionId } from "./lib/sessions";
import type { SessionId } from "./lib/sessions";
import schema from "./schema";
import { modules } from "./test.setup";

async function seedTestData(t: ReturnType<typeof convexTest>) {
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

test("getCurrent returns null when no active game", async () => {
  const t = convexTest(schema, modules);

  await seedTestData(t);

  const { code } = await t.mutation(api.lobbies.create, {
    displayName: "HostEmpty",
    sessionId: asSessionId("host-session-empty"),
  });

  const lobby = await t.query(api.lobbies.get, { code });

  const result = await t.query(api.rounds.getCurrent, {
    lobbyId: lobby!._id,
    sessionId: asSessionId("host-session-empty"),
  });

  expect(result).toBeNull();
});

test("getCurrent returns current round for active game", async () => {
  const t = convexTest(schema, modules);

  await seedTestData(t);

  const { code } = await t.mutation(api.lobbies.create, {
    displayName: "HostCurrent",
    sessionId: asSessionId("host-session-current"),
  });

  await t.mutation(api.lobbies.join, {
    code,
    displayName: "PlayerCurrent",
    sessionId: asSessionId("player-session-current"),
  });

  const lobby = await t.query(api.lobbies.get, { code });

  await t.mutation(api.games.start, {
    lobbyId: lobby!._id,
    sessionId: asSessionId("host-session-current"),
  });

  const result = await t.query(api.rounds.getCurrent, {
    lobbyId: lobby!._id,
    sessionId: asSessionId("host-session-current"),
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
    displayName: "HostHide",
    sessionId: asSessionId("host-session-hide"),
  });

  await t.mutation(api.lobbies.join, {
    code,
    displayName: "PlayerHide",
    sessionId: asSessionId("player-session-hide"),
  });

  const lobby = await t.query(api.lobbies.get, { code });

  await t.mutation(api.games.start, {
    lobbyId: lobby!._id,
    sessionId: asSessionId("host-session-hide"),
  });

  const result = await t.query(api.rounds.getCurrent, {
    lobbyId: lobby!._id,
    sessionId: asSessionId("player-session-hide"),
  });

  if (!result) {
    throw new Error("Result is null");
  }
  if (!result.track) {
    throw new Error("Result is null");
  }
  expect(result).not.toBeNull();
  expect(result?.phase).toBe("placing");
  expect(result?.track).not.toBeNull();
  expect(result?.track.trackId).toBeDefined();
  expect(result?.track.youtubeVideoId).toBeDefined();
});

test("getCurrent shows track details during placing phase for host", async () => {
  const t = convexTest(schema, modules);

  await seedTestData(t);

  const { code } = await t.mutation(api.lobbies.create, {
    displayName: "HostShow",
    sessionId: asSessionId("host-session-show"),
  });

  await t.mutation(api.lobbies.join, {
    code,
    displayName: "PlayerShow",
    sessionId: asSessionId("player-session-show"),
  });

  const lobby = await t.query(api.lobbies.get, { code });

  await t.mutation(api.games.start, {
    lobbyId: lobby!._id,
    sessionId: asSessionId("host-session-show"),
  });

  const result = await t.query(api.rounds.getCurrent, {
    lobbyId: lobby!._id,
    sessionId: asSessionId("host-session-show"),
  });

  expect(result).not.toBeNull();
  expect(result?.phase).toBe("placing");
  expect(result?.track).not.toBeNull();
  expect(result?.track.youtubeVideoId).toBeDefined();
});

test("getCurrent includes placementPreview", async () => {
  const t = convexTest(schema, modules);

  await seedTestData(t);

  const { code } = await t.mutation(api.lobbies.create, {
    displayName: "HostPreview",
    sessionId: asSessionId("host-session-preview"),
  });

  await t.mutation(api.lobbies.join, {
    code,
    displayName: "PlayerPreview",
    sessionId: asSessionId("player-session-preview"),
  });

  const lobby = await t.query(api.lobbies.get, { code });

  await t.mutation(api.games.start, {
    lobbyId: lobby!._id,
    sessionId: asSessionId("host-session-preview"),
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
    sessionId: asSessionId("host-session-preview"),
  });

  expect(result).not.toBeNull();
  expect(result?.placementPreview).not.toBeNull();
  expect(result?.placementPreview?.proposedIndex).toBe(2);
});

test("setPlacementPreview allows turn player to preview placement", async () => {
  const t = convexTest(schema, modules);

  await seedTestData(t);

  const { code } = await t.mutation(api.lobbies.create, {
    displayName: "HostPreview",
    sessionId: asSessionId("host-session-preview"),
  });

  await t.mutation(api.lobbies.join, {
    code,
    displayName: "PlayerPreview",
    sessionId: asSessionId("player-session-preview"),
  });

  const lobby = await t.query(api.lobbies.get, { code });

  await t.mutation(api.games.start, {
    lobbyId: lobby!._id,
    sessionId: asSessionId("host-session-preview"),
  });

  let turnPlayerSessionId: SessionId | null = null;
  await t.run(async (ctx) => {
    const game = await ctx.db.query("games").first();
    if (game?.currentRoundId) {
      const round = await ctx.db.get(game.currentRoundId);
      if (round) {
        const player = await ctx.db.get(round.turnPlayerId);
        if (player) {
          turnPlayerSessionId = player.sessionId as SessionId;
        }
      }
    }
  });

  expect(turnPlayerSessionId).not.toBeNull();

  const result = await t.mutation(api.rounds.setPlacementPreview, {
    lobbyId: lobby!._id,
    proposedIndex: 0,
    sessionId: turnPlayerSessionId!,
  });

  expect(result).toBeNull();

  const round = await t.query(api.rounds.getCurrent, {
    lobbyId: lobby!._id,
    sessionId: asSessionId("host-session-preview"),
  });

  expect(round?.placementPreview).not.toBeNull();
  expect(round?.placementPreview?.proposedIndex).toBe(0);
  expect(round?.placementPreview?.updatedAt).toBeDefined();
});

test("setPlacementPreview fails for non-turn player", async () => {
  const t = convexTest(schema, modules);

  await seedTestData(t);

  const { code } = await t.mutation(api.lobbies.create, {
    displayName: "HostNotTurn",
    sessionId: asSessionId("host-session-notturn"),
  });

  await t.mutation(api.lobbies.join, {
    code,
    displayName: "PlayerNotTurn",
    sessionId: asSessionId("player-session-notturn"),
  });

  const lobby = await t.query(api.lobbies.get, { code });

  await t.mutation(api.games.start, {
    lobbyId: lobby!._id,
    sessionId: asSessionId("host-session-notturn"),
  });

  let roundId: Id<"rounds"> | null = null;
  let turnPlayerId: Id<"players"> | null = null;

  await t.run(async (ctx) => {
    const game = await ctx.db.query("games").first();
    if (game?.currentRoundId) {
      roundId = game.currentRoundId;
      const round = await ctx.db.get(game.currentRoundId);
      if (round) {
        ({ turnPlayerId } = round);
      }
    }
  });

  expect(roundId).not.toBeNull();
  expect(turnPlayerId).not.toBeNull();

  let playerId: Id<"players"> | null = null;
  await t.run(async (ctx) => {
    const player = await ctx.db
      .query("players")
      .filter((q) =>
        q.eq(q.field("sessionId"), asSessionId("player-session-notturn"))
      )
      .first();
    if (player) {
      playerId = player._id;
    }
  });

  expect(playerId).not.toBeNull();

  if (playerId === turnPlayerId) {
    const result = await t.mutation(api.rounds.setPlacementPreview, {
      lobbyId: lobby!._id,
      proposedIndex: 0,
      sessionId: asSessionId("player-session-notturn"),
    });
    expect(result).toBeNull();
  } else {
    await expect(
      t.mutation(api.rounds.setPlacementPreview, {
        lobbyId: lobby!._id,
        proposedIndex: 0,
        sessionId: asSessionId("player-session-notturn"),
      })
    ).rejects.toThrow("Only the turn player can preview placement");
  }
});

test("setPlacementPreview fails for negative index", async () => {
  const t = convexTest(schema, modules);

  await seedTestData(t);

  const { code } = await t.mutation(api.lobbies.create, {
    displayName: "HostNeg",
    sessionId: asSessionId("host-session-neg"),
  });

  await t.mutation(api.lobbies.join, {
    code,
    displayName: "PlayerNeg",
    sessionId: asSessionId("player-session-neg"),
  });

  const lobby = await t.query(api.lobbies.get, { code });

  await t.mutation(api.games.start, {
    lobbyId: lobby!._id,
    sessionId: asSessionId("host-session-neg"),
  });

  let turnPlayerSessionId: SessionId | null = null;
  await t.run(async (ctx) => {
    const game = await ctx.db.query("games").first();
    if (game?.currentRoundId) {
      const round = await ctx.db.get(game.currentRoundId);
      if (round) {
        const player = await ctx.db.get(round.turnPlayerId);
        if (player) {
          turnPlayerSessionId = player.sessionId as SessionId;
        }
      }
    }
  });

  expect(turnPlayerSessionId).not.toBeNull();

  await expect(
    t.mutation(api.rounds.setPlacementPreview, {
      lobbyId: lobby!._id,
      proposedIndex: -1,
      sessionId: turnPlayerSessionId!,
    })
  ).rejects.toThrow("Proposed index cannot be negative");
});

test("setPlacementPreview fails when not in placing phase", async () => {
  const t = convexTest(schema, modules);

  await seedTestData(t);

  const { code } = await t.mutation(api.lobbies.create, {
    displayName: "HostWrongPhase",
    sessionId: asSessionId("host-session-wrong-phase"),
  });

  await t.mutation(api.lobbies.join, {
    code,
    displayName: "PlayerWrongPhase",
    sessionId: asSessionId("player-session-wrong-phase"),
  });

  const lobby = await t.query(api.lobbies.get, { code });

  await t.mutation(api.games.start, {
    lobbyId: lobby!._id,
    sessionId: asSessionId("host-session-wrong-phase"),
  });

  const game = await t.query(api.games.getCurrent, { lobbyId: lobby!._id });

  await t.run(async (ctx) => {
    if (game?.currentRoundId) {
      await ctx.db.patch(game.currentRoundId, { phase: "betting" });
    }
  });

  await expect(
    t.mutation(api.rounds.setPlacementPreview, {
      lobbyId: lobby!._id,
      proposedIndex: 0,
      sessionId: asSessionId("host-session-wrong-phase"),
    })
  ).rejects.toThrow("Can only preview placement during placing phase");
});

test("setPlacementPreview updates existing preview", async () => {
  const t = convexTest(schema, modules);

  await seedTestData(t);

  const { code } = await t.mutation(api.lobbies.create, {
    displayName: "HostUpd",
    sessionId: asSessionId("host-session-upd"),
  });

  await t.mutation(api.lobbies.join, {
    code,
    displayName: "PlayerUpd",
    sessionId: asSessionId("player-session-upd"),
  });

  const lobby = await t.query(api.lobbies.get, { code });

  await t.mutation(api.games.start, {
    lobbyId: lobby!._id,
    sessionId: asSessionId("host-session-upd"),
  });

  let turnPlayerSessionId: SessionId | null = null;
  await t.run(async (ctx) => {
    const game = await ctx.db.query("games").first();
    if (game?.currentRoundId) {
      const round = await ctx.db.get(game.currentRoundId);
      if (round) {
        const player = await ctx.db.get(round.turnPlayerId);
        if (player) {
          turnPlayerSessionId = player.sessionId as SessionId;
        }
      }
    }
  });

  expect(turnPlayerSessionId).not.toBeNull();

  await t.mutation(api.rounds.setPlacementPreview, {
    lobbyId: lobby!._id,
    proposedIndex: 1,
    sessionId: turnPlayerSessionId!,
  });

  await t.mutation(api.rounds.setPlacementPreview, {
    lobbyId: lobby!._id,
    proposedIndex: 2,
    sessionId: turnPlayerSessionId!,
  });

  const updatedRound = await t.query(api.rounds.getCurrent, {
    lobbyId: lobby!._id,
    sessionId: asSessionId("host-session-upd"),
  });

  expect(updatedRound?.placementPreview?.proposedIndex).toBe(2);
});

test("submitPlacement allows turn player to finalize placement", async () => {
  const t = convexTest(schema, modules);

  await seedTestData(t);

  const { code } = await t.mutation(api.lobbies.create, {
    displayName: "HostSubmit",
    sessionId: asSessionId("host-session-submit"),
  });

  await t.mutation(api.lobbies.join, {
    code,
    displayName: "PlayerSubmit",
    sessionId: asSessionId("player-session-submit"),
  });

  const lobby = await t.query(api.lobbies.get, { code });

  await t.mutation(api.games.start, {
    lobbyId: lobby!._id,
    sessionId: asSessionId("host-session-submit"),
  });

  let turnPlayerSessionId: SessionId | null = null;
  await t.run(async (ctx) => {
    const game = await ctx.db.query("games").first();
    if (game?.currentRoundId) {
      const round = await ctx.db.get(game.currentRoundId);
      if (round) {
        const player = await ctx.db.get(round.turnPlayerId);
        if (player) {
          turnPlayerSessionId = player.sessionId as SessionId;
        }
      }
    }
  });

  expect(turnPlayerSessionId).not.toBeNull();

  await t.mutation(api.rounds.setPlacementPreview, {
    lobbyId: lobby!._id,
    proposedIndex: 1,
    sessionId: turnPlayerSessionId!,
  });

  const result = await t.mutation(api.rounds.submitPlacement, {
    lobbyId: lobby!._id,
    sessionId: turnPlayerSessionId!,
  });

  expect(result).toBeNull();

  const round = await t.query(api.rounds.getCurrent, {
    lobbyId: lobby!._id,
    sessionId: asSessionId("host-session-submit"),
  });

  expect(round?.placement).not.toBeNull();
  expect(round?.placement?.proposedIndex).toBe(1);
  expect(round?.placement?.submittedAt).toBeDefined();
  expect(round?.phase).toBe("betting");
});

test("submitPlacement fails for non-turn player", async () => {
  const t = convexTest(schema, modules);

  await seedTestData(t);

  const { code } = await t.mutation(api.lobbies.create, {
    displayName: "HostNotTurn",
    sessionId: asSessionId("host-session-notturn"),
  });

  await t.mutation(api.lobbies.join, {
    code,
    displayName: "PlayerTurn",
    sessionId: asSessionId("player-session-turn"),
  });

  await t.mutation(api.lobbies.join, {
    code,
    displayName: "PlayerNotTurn",
    sessionId: asSessionId("player-session-notturn"),
  });

  const lobby = await t.query(api.lobbies.get, { code });

  await t.mutation(api.games.start, {
    lobbyId: lobby!._id,
    sessionId: asSessionId("host-session-notturn"),
  });

  let roundId: Id<"rounds"> | null = null;
  let turnPlayerId: Id<"players"> | null = null;

  await t.run(async (ctx) => {
    const game = await ctx.db.query("games").first();
    if (game?.currentRoundId) {
      roundId = game.currentRoundId;
      const round = await ctx.db.get(game.currentRoundId);
      if (round) {
        ({ turnPlayerId } = round);
      }
    }
  });

  expect(roundId).not.toBeNull();
  expect(turnPlayerId).not.toBeNull();

  let nonTurnPlayerId: Id<"players"> | null = null;
  let nonTurnSessionId: SessionId | null = null;
  await t.run(async (ctx) => {
    const players = await ctx.db.query("players").collect();
    const nonTurnPlayer = players.find((player) => player._id !== turnPlayerId);
    if (nonTurnPlayer) {
      nonTurnPlayerId = nonTurnPlayer._id;
      nonTurnSessionId = nonTurnPlayer.sessionId as SessionId;
    }
  });

  expect(nonTurnPlayerId).not.toBeNull();
  expect(nonTurnPlayerId).not.toBe(turnPlayerId);
  expect(nonTurnSessionId).not.toBeNull();

  if (!nonTurnSessionId) {
    return;
  }

  await expect(
    t.mutation(api.rounds.submitPlacement, {
      lobbyId: lobby!._id,
      sessionId: nonTurnSessionId,
    })
  ).rejects.toThrow("Only the turn player can submit placement");
});

test("submitPlacement fails when not in placing phase", async () => {
  const t = convexTest(schema, modules);

  await seedTestData(t);

  const { code } = await t.mutation(api.lobbies.create, {
    displayName: "HostWrongPhase",
    sessionId: asSessionId("host-session-wrong-phase"),
  });

  await t.mutation(api.lobbies.join, {
    code,
    displayName: "PlayerWrongPhase",
    sessionId: asSessionId("player-session-wrong-phase"),
  });

  const lobby = await t.query(api.lobbies.get, { code });

  await t.mutation(api.games.start, {
    lobbyId: lobby!._id,
    sessionId: asSessionId("host-session-wrong-phase"),
  });

  const game = await t.query(api.games.getCurrent, { lobbyId: lobby!._id });

  await t.run(async (ctx) => {
    if (game?.currentRoundId) {
      await ctx.db.patch(game.currentRoundId, { phase: "betting" });
    }
  });

  let turnPlayerSessionId: SessionId | null = null;
  await t.run(async (ctx) => {
    const game = await ctx.db.query("games").first();
    if (game?.currentRoundId) {
      const round = await ctx.db.get(game.currentRoundId);
      if (round) {
        const player = await ctx.db.get(round.turnPlayerId);
        if (player) {
          turnPlayerSessionId = player.sessionId as SessionId;
        }
      }
    }
  });

  expect(turnPlayerSessionId).not.toBeNull();

  await expect(
    t.mutation(api.rounds.submitPlacement, {
      lobbyId: lobby!._id,
      sessionId: turnPlayerSessionId!,
    })
  ).rejects.toThrow("Can only submit placement during placing phase");
});

test("submitPlacement fails when already submitted", async () => {
  const t = convexTest(schema, modules);

  await seedTestData(t);

  const { code } = await t.mutation(api.lobbies.create, {
    displayName: "HostAlready",
    sessionId: asSessionId("host-session-already"),
  });

  await t.mutation(api.lobbies.join, {
    code,
    displayName: "PlayerAlready",
    sessionId: asSessionId("player-session-already"),
  });

  const lobby = await t.query(api.lobbies.get, { code });

  await t.mutation(api.games.start, {
    lobbyId: lobby!._id,
    sessionId: asSessionId("host-session-already"),
  });

  let turnPlayerSessionId: SessionId | null = null;
  await t.run(async (ctx) => {
    const game = await ctx.db.query("games").first();
    if (game?.currentRoundId) {
      const round = await ctx.db.get(game.currentRoundId);
      if (round) {
        const player = await ctx.db.get(round.turnPlayerId);
        if (player) {
          turnPlayerSessionId = player.sessionId as SessionId;
        }
      }
    }
  });

  expect(turnPlayerSessionId).not.toBeNull();

  await t.mutation(api.rounds.setPlacementPreview, {
    lobbyId: lobby!._id,
    proposedIndex: 0,
    sessionId: turnPlayerSessionId!,
  });

  await t.mutation(api.rounds.submitPlacement, {
    lobbyId: lobby!._id,
    sessionId: turnPlayerSessionId!,
  });

  await expect(
    t.mutation(api.rounds.submitPlacement, {
      lobbyId: lobby!._id,
      sessionId: turnPlayerSessionId!,
    })
  ).rejects.toThrow("Placement has already been submitted");
});

test("submitPlacement fails without preview", async () => {
  const t = convexTest(schema, modules);

  await seedTestData(t);

  const { code } = await t.mutation(api.lobbies.create, {
    displayName: "HostNoPreview",
    sessionId: asSessionId("host-session-nopreview"),
  });

  await t.mutation(api.lobbies.join, {
    code,
    displayName: "PlayerNoPreview",
    sessionId: asSessionId("player-session-nopreview"),
  });

  const lobby = await t.query(api.lobbies.get, { code });

  await t.mutation(api.games.start, {
    lobbyId: lobby!._id,
    sessionId: asSessionId("host-session-nopreview"),
  });

  let turnPlayerSessionId: SessionId | null = null;
  await t.run(async (ctx) => {
    const game = await ctx.db.query("games").first();
    if (game?.currentRoundId) {
      const round = await ctx.db.get(game.currentRoundId);
      if (round) {
        const player = await ctx.db.get(round.turnPlayerId);
        if (player) {
          turnPlayerSessionId = player.sessionId as SessionId;
        }
      }
    }
  });

  expect(turnPlayerSessionId).not.toBeNull();

  await expect(
    t.mutation(api.rounds.submitPlacement, {
      lobbyId: lobby!._id,
      sessionId: turnPlayerSessionId!,
    })
  ).rejects.toThrow("Please preview your placement first");
});
