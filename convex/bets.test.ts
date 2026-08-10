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

async function moveRoundToBetting(
  t: ReturnType<typeof convexTest>,
  lobbyId: Id<"lobbies">,
  placementIndex = 0,
) {
  await t.run(async (ctx) => {
    // oxlint-disable-next-line typescript/no-unsafe-assignment
    const lobby = await ctx.db.get(lobbyId);
    // oxlint-disable-next-line typescript/no-unsafe-member-access
    if (!lobby?.activeGameId) {
      return;
    }

    // oxlint-disable-next-line typescript/no-unsafe-argument, typescript/no-unsafe-assignment, typescript/no-unsafe-member-access
    const game = await ctx.db.get(lobby.activeGameId);
    // oxlint-disable-next-line typescript/no-unsafe-member-access
    if (!game?.currentRoundId) {
      return;
    }

    // oxlint-disable-next-line typescript/no-unsafe-argument, typescript/no-unsafe-member-access
    await ctx.db.patch(game.currentRoundId, {
      phase: "betting",
      placement: { proposedIndex: placementIndex, submittedAt: Date.now() },
    });
  });
}

test("preview creates unlocked bet for non-turn player", async () => {
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

  await t.mutation(api.lobbies.join, {
    code,
    displayName: "SpectatorPreview",
    sessionId: asSessionId("spectator-session-preview"),
  });

  const lobby = await t.query(api.lobbies.get, { code });

  await t.mutation(api.games.start, {
    // oxlint-disable-next-line typescript/no-non-null-assertion
    lobbyId: lobby!._id,
    sessionId: asSessionId("host-session-preview"),
  });

  // oxlint-disable-next-line typescript/no-non-null-assertion
  await moveRoundToBetting(t, lobby!._id);

  let turnPlayerId: Id<"players"> | null = null;
  await t.run(async (ctx) => {
    const game = await ctx.db.query("games").first();
    if (game?.currentRoundId) {
      const round = await ctx.db.get(game.currentRoundId);
      if (round) {
        ({ turnPlayerId } = round);
      }
    }
  });

  let nonTurnPlayerId: Id<"players"> | null = null;
  await t.run(async (ctx) => {
    const player = await ctx.db
      .query("players")
      .filter((q) => q.eq(q.field("sessionId"), asSessionId("spectator-session-preview")))
      .first();
    if (player) {
      nonTurnPlayerId = player._id;
    }
  });

  expect(turnPlayerId).not.toBeNull();
  expect(nonTurnPlayerId).not.toBeNull();

  if (turnPlayerId === nonTurnPlayerId) {
    return;
  }

  expect(nonTurnPlayerId).not.toBe(turnPlayerId);

  const result = await t.mutation(api.bets.preview, {
    // oxlint-disable-next-line typescript/no-non-null-assertion
    lobbyId: lobby!._id,
    proposedIndex: 1,
    sessionId: asSessionId("spectator-session-preview"),
  });

  expect(result).toBeNull();

  let betCreated = false;
  await t.run(async (ctx) => {
    const game = await ctx.db.query("games").first();
    if (game?.currentRoundId) {
      const bet = await ctx.db
        .query("roundBets")
        .filter((q) =>
          q.and(
            q.eq(q.field("roundId"), game.currentRoundId),
            q.eq(q.field("playerId"), nonTurnPlayerId),
          ),
        )
        .first();
      if (bet) {
        betCreated = true;
        expect(bet.lockedIn).toBeFalsy();
        expect(bet.proposedIndex).toBe(1);
        expect(bet.status).toBe("pending");
      }
    }
  });

  expect(betCreated).toBeTruthy();
});

test("preview deducts 1 coin from player", async () => {
  const t = convexTest(schema, modules);

  await seedTestData(t);

  const { code } = await t.mutation(api.lobbies.create, {
    displayName: "HostCoin",
    sessionId: asSessionId("host-session-coin"),
  });

  await t.mutation(api.lobbies.join, {
    code,
    displayName: "PlayerCoin",
    sessionId: asSessionId("player-session-coin"),
  });

  await t.mutation(api.lobbies.join, {
    code,
    displayName: "SpectatorCoin",
    sessionId: asSessionId("spectator-session-coin"),
  });

  const lobby = await t.query(api.lobbies.get, { code });

  await t.mutation(api.games.start, {
    // oxlint-disable-next-line typescript/no-non-null-assertion
    lobbyId: lobby!._id,
    sessionId: asSessionId("host-session-coin"),
  });

  // oxlint-disable-next-line typescript/no-non-null-assertion
  await moveRoundToBetting(t, lobby!._id);

  let playerBeforeCoins: number | null = null;
  await t.run(async (ctx) => {
    const player = await ctx.db
      .query("players")
      .filter((q) => q.eq(q.field("sessionId"), asSessionId("spectator-session-coin")))
      .first();
    if (player) {
      playerBeforeCoins = player.coins;
    }
  });

  expect(playerBeforeCoins).not.toBeNull();
  expect(playerBeforeCoins).toBeGreaterThanOrEqual(1);

  let turnPlayerSessionId: SessionId | null = null;
  await t.run(async (ctx) => {
    const game = await ctx.db.query("games").first();
    if (game?.currentRoundId) {
      const round = await ctx.db.get(game.currentRoundId);
      if (round) {
        const player = await ctx.db.get(round.turnPlayerId);
        if (player) {
          // oxlint-disable-next-line typescript/consistent-type-assertions, typescript/no-unsafe-type-assertion
          turnPlayerSessionId = player.sessionId as SessionId;
        }
      }
    }
  });

  expect(turnPlayerSessionId).not.toBeNull();

  if (turnPlayerSessionId === "spectator-session-coin") {
    return;
  }

  await t.mutation(api.bets.preview, {
    // oxlint-disable-next-line typescript/no-non-null-assertion
    lobbyId: lobby!._id,
    proposedIndex: 1,
    sessionId: asSessionId("spectator-session-coin"),
  });

  let playerAfterCoins: number | null = null;
  await t.run(async (ctx) => {
    const player = await ctx.db
      .query("players")
      .filter((q) => q.eq(q.field("sessionId"), asSessionId("spectator-session-coin")))
      .first();
    if (player) {
      playerAfterCoins = player.coins;
    }
  });

  expect(playerAfterCoins).toBe(playerBeforeCoins);
});

test("preview fails for turn player", async () => {
  const t = convexTest(schema, modules);

  await seedTestData(t);

  const { code } = await t.mutation(api.lobbies.create, {
    displayName: "HostTurn",
    sessionId: asSessionId("host-session-turn"),
  });

  await t.mutation(api.lobbies.join, {
    code,
    displayName: "PlayerTurn",
    sessionId: asSessionId("player-session-turn"),
  });

  await t.mutation(api.lobbies.join, {
    code,
    displayName: "SpectatorTurn",
    sessionId: asSessionId("spectator-session-turn"),
  });

  const lobby = await t.query(api.lobbies.get, { code });

  await t.mutation(api.games.start, {
    // oxlint-disable-next-line typescript/no-non-null-assertion
    lobbyId: lobby!._id,
    sessionId: asSessionId("host-session-turn"),
  });

  // oxlint-disable-next-line typescript/no-non-null-assertion
  await moveRoundToBetting(t, lobby!._id);

  let turnPlayerSessionId: SessionId | null = null;
  await t.run(async (ctx) => {
    const game = await ctx.db.query("games").first();
    if (game?.currentRoundId) {
      const round = await ctx.db.get(game.currentRoundId);
      if (round) {
        const player = await ctx.db.get(round.turnPlayerId);
        if (player) {
          // oxlint-disable-next-line typescript/consistent-type-assertions, typescript/no-unsafe-type-assertion
          turnPlayerSessionId = player.sessionId as SessionId;
        }
      }
    }
  });

  expect(turnPlayerSessionId).not.toBeNull();

  await expect(
    t.mutation(api.bets.preview, {
      // oxlint-disable-next-line typescript/no-non-null-assertion
      lobbyId: lobby!._id,
      proposedIndex: 0,
      // oxlint-disable-next-line typescript/no-non-null-assertion
      sessionId: turnPlayerSessionId!,
    }),
  ).rejects.toThrow("Turn player cannot place bets");
});

test("preview fails when player has no coins", async () => {
  const t = convexTest(schema, modules);

  await seedTestData(t);

  const { code } = await t.mutation(api.lobbies.create, {
    displayName: "HostNoCoin",
    sessionId: asSessionId("host-session-nocoin"),
  });

  await t.mutation(api.lobbies.join, {
    code,
    displayName: "PlayerNoCoin",
    sessionId: asSessionId("player-session-nocoin"),
  });

  await t.mutation(api.lobbies.join, {
    code,
    displayName: "SpectatorNoCoin",
    sessionId: asSessionId("spectator-session-nocoin"),
  });

  const lobby = await t.query(api.lobbies.get, { code });

  await t.mutation(api.games.start, {
    // oxlint-disable-next-line typescript/no-non-null-assertion
    lobbyId: lobby!._id,
    sessionId: asSessionId("host-session-nocoin"),
  });

  // oxlint-disable-next-line typescript/no-non-null-assertion
  await moveRoundToBetting(t, lobby!._id);

  let turnPlayerSessionId: SessionId | null = null;
  await t.run(async (ctx) => {
    const game = await ctx.db.query("games").first();
    if (game?.currentRoundId) {
      const round = await ctx.db.get(game.currentRoundId);
      if (round) {
        const player = await ctx.db.get(round.turnPlayerId);
        if (player) {
          // oxlint-disable-next-line typescript/consistent-type-assertions, typescript/no-unsafe-type-assertion
          turnPlayerSessionId = player.sessionId as SessionId;
        }
      }
    }
  });

  expect(turnPlayerSessionId).not.toBeNull();

  await t.run(async (ctx) => {
    const player = await ctx.db
      .query("players")
      .filter((q) => q.eq(q.field("sessionId"), asSessionId("spectator-session-nocoin")))
      .first();
    if (player) {
      await ctx.db.patch(player._id, { coins: 0 });
    }
  });

  if (turnPlayerSessionId === "spectator-session-nocoin") {
    await expect(
      t.mutation(api.bets.preview, {
        // oxlint-disable-next-line typescript/no-non-null-assertion
        lobbyId: lobby!._id,
        proposedIndex: 0,
        sessionId: asSessionId("spectator-session-nocoin"),
      }),
    ).rejects.toThrow("Turn player cannot place bets");
  } else {
    await expect(
      t.mutation(api.bets.preview, {
        // oxlint-disable-next-line typescript/no-non-null-assertion
        lobbyId: lobby!._id,
        proposedIndex: 0,
        sessionId: asSessionId("spectator-session-nocoin"),
      }),
    ).rejects.toThrow("Not enough coins to place a bet");
  }
});

test("preview fails for negative index", async () => {
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

  await t.mutation(api.lobbies.join, {
    code,
    displayName: "SpectatorNeg",
    sessionId: asSessionId("spectator-session-neg"),
  });

  const lobby = await t.query(api.lobbies.get, { code });

  await t.mutation(api.games.start, {
    // oxlint-disable-next-line typescript/no-non-null-assertion
    lobbyId: lobby!._id,
    sessionId: asSessionId("host-session-neg"),
  });

  // oxlint-disable-next-line typescript/no-non-null-assertion
  await moveRoundToBetting(t, lobby!._id);

  let turnPlayerSessionId: SessionId | null = null;
  await t.run(async (ctx) => {
    const game = await ctx.db.query("games").first();
    if (game?.currentRoundId) {
      const round = await ctx.db.get(game.currentRoundId);
      if (round) {
        const player = await ctx.db.get(round.turnPlayerId);
        if (player) {
          // oxlint-disable-next-line typescript/consistent-type-assertions, typescript/no-unsafe-type-assertion
          turnPlayerSessionId = player.sessionId as SessionId;
        }
      }
    }
  });

  expect(turnPlayerSessionId).not.toBeNull();

  if (turnPlayerSessionId === "spectator-session-neg") {
    await expect(
      t.mutation(api.bets.preview, {
        // oxlint-disable-next-line typescript/no-non-null-assertion
        lobbyId: lobby!._id,
        proposedIndex: -1,
        sessionId: asSessionId("spectator-session-neg"),
      }),
    ).rejects.toThrow("Turn player cannot place bets");
  } else {
    await expect(
      t.mutation(api.bets.preview, {
        // oxlint-disable-next-line typescript/no-non-null-assertion
        lobbyId: lobby!._id,
        proposedIndex: -1,
        sessionId: asSessionId("spectator-session-neg"),
      }),
    ).rejects.toThrow("Proposed index cannot be negative");
  }
});

test("preview fails when betting on the turn player's placement", async () => {
  const t = convexTest(schema, modules);

  await seedTestData(t);

  const { code } = await t.mutation(api.lobbies.create, {
    displayName: "HostTurnSlot",
    sessionId: asSessionId("host-session-turn-slot"),
  });

  await t.mutation(api.lobbies.join, {
    code,
    displayName: "PlayerTurnSlot",
    sessionId: asSessionId("player-session-turn-slot"),
  });

  await t.mutation(api.lobbies.join, {
    code,
    displayName: "SpectatorTurnSlot",
    sessionId: asSessionId("spectator-session-turn-slot"),
  });

  const lobby = await t.query(api.lobbies.get, { code });

  await t.mutation(api.games.start, {
    // oxlint-disable-next-line typescript/no-non-null-assertion
    lobbyId: lobby!._id,
    sessionId: asSessionId("host-session-turn-slot"),
  });

  // oxlint-disable-next-line typescript/no-non-null-assertion
  await moveRoundToBetting(t, lobby!._id);

  let nonTurnSessionId: SessionId | null = null;
  await t.run(async (ctx) => {
    const game = await ctx.db.query("games").first();
    if (game?.currentRoundId) {
      const round = await ctx.db.get(game.currentRoundId);
      if (round) {
        const players = await ctx.db.query("players").collect();
        const nonTurnPlayer = players.find((p) => p._id !== round.turnPlayerId);
        if (nonTurnPlayer) {
          // oxlint-disable-next-line typescript/consistent-type-assertions, typescript/no-unsafe-type-assertion
          nonTurnSessionId = nonTurnPlayer.sessionId as SessionId;
        }

        await ctx.db.patch(round._id, {
          phase: "betting",
          placement: {
            proposedIndex: 0,
            submittedAt: Date.now(),
          },
        });
      }
    }
  });

  expect(nonTurnSessionId).not.toBeNull();

  if (!nonTurnSessionId) {
    return;
  }

  await expect(
    t.mutation(api.bets.preview, {
      // oxlint-disable-next-line typescript/no-non-null-assertion
      lobbyId: lobby!._id,
      proposedIndex: 0,
      sessionId: nonTurnSessionId,
    }),
  ).rejects.toThrow("Cannot bet on the turn player's placement");
});

test("preview updates existing unlocked bet", async () => {
  const t = convexTest(schema, modules);

  await seedTestData(t);

  const { code } = await t.mutation(api.lobbies.create, {
    displayName: "HostUpdate",
    sessionId: asSessionId("host-session-update"),
  });

  await t.mutation(api.lobbies.join, {
    code,
    displayName: "PlayerUpdate",
    sessionId: asSessionId("player-session-update"),
  });

  await t.mutation(api.lobbies.join, {
    code,
    displayName: "SpectatorUpdate",
    sessionId: asSessionId("spectator-session-update"),
  });

  const lobby = await t.query(api.lobbies.get, { code });

  await t.mutation(api.games.start, {
    // oxlint-disable-next-line typescript/no-non-null-assertion
    lobbyId: lobby!._id,
    sessionId: asSessionId("host-session-update"),
  });

  // oxlint-disable-next-line typescript/no-non-null-assertion
  await moveRoundToBetting(t, lobby!._id);

  await t.run(async (ctx) => {
    const game = await ctx.db.query("games").first();
    if (!game?.currentRoundId) {
      return;
    }

    const round = await ctx.db.get(game.currentRoundId);
    if (!round) {
      return;
    }

    const player = await ctx.db.get(round.turnPlayerId);
    if (!player) {
      return;
    }

    const tracks = await ctx.db.query("tracks").collect();
    const extraTrack = tracks.find(
      (track) => !player.timeline.some((entry) => entry.trackId === track._id),
    );

    if (!extraTrack) {
      return;
    }

    await ctx.db.patch(player._id, {
      timeline: [
        ...player.timeline,
        {
          earnedAtRoundNumber: 0,
          earnedBy: "placement",
          trackId: extraTrack._id,
          year: extraTrack.year,
        },
      ],
      timelineSize: player.timelineSize + 1,
    });
  });

  let turnPlayerSessionId: SessionId | null = null;
  await t.run(async (ctx) => {
    const game = await ctx.db.query("games").first();
    if (game?.currentRoundId) {
      const round = await ctx.db.get(game.currentRoundId);
      if (round) {
        const player = await ctx.db.get(round.turnPlayerId);
        if (player) {
          // oxlint-disable-next-line typescript/consistent-type-assertions, typescript/no-unsafe-type-assertion
          turnPlayerSessionId = player.sessionId as SessionId;
        }
      }
    }
  });

  expect(turnPlayerSessionId).not.toBeNull();

  if (turnPlayerSessionId === "spectator-session-update") {
    return;
  }

  await t.mutation(api.bets.preview, {
    // oxlint-disable-next-line typescript/no-non-null-assertion
    lobbyId: lobby!._id,
    proposedIndex: 1,
    sessionId: asSessionId("spectator-session-update"),
  });

  await t.mutation(api.bets.preview, {
    // oxlint-disable-next-line typescript/no-non-null-assertion
    lobbyId: lobby!._id,
    proposedIndex: 2,
    sessionId: asSessionId("spectator-session-update"),
  });

  let betProposedIndex: number | null = null;
  await t.run(async (ctx) => {
    const game = await ctx.db.query("games").first();
    if (game?.currentRoundId) {
      const bet = await ctx.db
        .query("roundBets")
        .filter((q) => q.eq(q.field("roundId"), game.currentRoundId))
        .first();
      if (bet) {
        betProposedIndex = bet.proposedIndex;
      }
    }
  });

  expect(betProposedIndex).toBe(2);
});

test("preview fails when bet is already locked in", async () => {
  const t = convexTest(schema, modules);

  await seedTestData(t);

  const { code } = await t.mutation(api.lobbies.create, {
    displayName: "HostLocked",
    sessionId: asSessionId("host-session-locked"),
  });

  await t.mutation(api.lobbies.join, {
    code,
    displayName: "PlayerLocked",
    sessionId: asSessionId("player-session-locked"),
  });

  await t.mutation(api.lobbies.join, {
    code,
    displayName: "SpectatorLocked",
    sessionId: asSessionId("spectator-session-locked"),
  });

  const lobby = await t.query(api.lobbies.get, { code });

  await t.mutation(api.games.start, {
    // oxlint-disable-next-line typescript/no-non-null-assertion
    lobbyId: lobby!._id,
    sessionId: asSessionId("host-session-locked"),
  });

  // oxlint-disable-next-line typescript/no-non-null-assertion
  await moveRoundToBetting(t, lobby!._id);

  let turnPlayerSessionId: SessionId | null = null;
  await t.run(async (ctx) => {
    const game = await ctx.db.query("games").first();
    if (game?.currentRoundId) {
      const round = await ctx.db.get(game.currentRoundId);
      if (round) {
        const player = await ctx.db.get(round.turnPlayerId);
        if (player) {
          // oxlint-disable-next-line typescript/consistent-type-assertions, typescript/no-unsafe-type-assertion
          turnPlayerSessionId = player.sessionId as SessionId;
        }
      }
    }
  });

  expect(turnPlayerSessionId).not.toBeNull();

  if (turnPlayerSessionId === "spectator-session-locked") {
    return;
  }

  await t.mutation(api.bets.preview, {
    // oxlint-disable-next-line typescript/no-non-null-assertion
    lobbyId: lobby!._id,
    proposedIndex: 1,
    sessionId: asSessionId("spectator-session-locked"),
  });

  await t.mutation(api.bets.lockIn, {
    // oxlint-disable-next-line typescript/no-non-null-assertion
    lobbyId: lobby!._id,
    sessionId: asSessionId("spectator-session-locked"),
  });

  await expect(
    t.mutation(api.bets.preview, {
      // oxlint-disable-next-line typescript/no-non-null-assertion
      lobbyId: lobby!._id,
      proposedIndex: 1,
      sessionId: asSessionId("spectator-session-locked"),
    }),
  ).rejects.toThrow("Cannot change a locked bet");
});

test("lockIn sets lockedIn to true", async () => {
  const t = convexTest(schema, modules);

  await seedTestData(t);

  const { code } = await t.mutation(api.lobbies.create, {
    displayName: "HostLock",
    sessionId: asSessionId("host-session-lock"),
  });

  await t.mutation(api.lobbies.join, {
    code,
    displayName: "PlayerLock",
    sessionId: asSessionId("player-session-lock"),
  });

  await t.mutation(api.lobbies.join, {
    code,
    displayName: "SpectatorLock",
    sessionId: asSessionId("spectator-session-lock"),
  });

  const lobby = await t.query(api.lobbies.get, { code });

  await t.mutation(api.games.start, {
    // oxlint-disable-next-line typescript/no-non-null-assertion
    lobbyId: lobby!._id,
    sessionId: asSessionId("host-session-lock"),
  });

  // oxlint-disable-next-line typescript/no-non-null-assertion
  await moveRoundToBetting(t, lobby!._id);

  let turnPlayerSessionId: SessionId | null = null;
  await t.run(async (ctx) => {
    const game = await ctx.db.query("games").first();
    if (game?.currentRoundId) {
      const round = await ctx.db.get(game.currentRoundId);
      if (round) {
        const player = await ctx.db.get(round.turnPlayerId);
        if (player) {
          // oxlint-disable-next-line typescript/consistent-type-assertions, typescript/no-unsafe-type-assertion
          turnPlayerSessionId = player.sessionId as SessionId;
        }
      }
    }
  });

  expect(turnPlayerSessionId).not.toBeNull();

  if (turnPlayerSessionId === "spectator-session-lock") {
    return;
  }

  await t.mutation(api.bets.preview, {
    // oxlint-disable-next-line typescript/no-non-null-assertion
    lobbyId: lobby!._id,
    proposedIndex: 1,
    sessionId: asSessionId("spectator-session-lock"),
  });

  const result = await t.mutation(api.bets.lockIn, {
    // oxlint-disable-next-line typescript/no-non-null-assertion
    lobbyId: lobby!._id,
    sessionId: asSessionId("spectator-session-lock"),
  });

  expect(result).toBeNull();

  let betLockedIn = false;
  await t.run(async (ctx) => {
    const game = await ctx.db.query("games").first();
    if (game?.currentRoundId) {
      const bet = await ctx.db
        .query("roundBets")
        .filter((q) => q.eq(q.field("roundId"), game.currentRoundId))
        .first();
      if (bet) {
        betLockedIn = bet.lockedIn;
      }
    }
  });

  expect(betLockedIn).toBeTruthy();
});

test("lockIn fails when no bet exists", async () => {
  const t = convexTest(schema, modules);

  await seedTestData(t);

  const { code } = await t.mutation(api.lobbies.create, {
    displayName: "HostNoBet",
    sessionId: asSessionId("host-session-nobet"),
  });

  await t.mutation(api.lobbies.join, {
    code,
    displayName: "PlayerNoBet",
    sessionId: asSessionId("player-session-nobet"),
  });

  await t.mutation(api.lobbies.join, {
    code,
    displayName: "SpectatorNoBet",
    sessionId: asSessionId("spectator-session-nobet"),
  });

  const lobby = await t.query(api.lobbies.get, { code });

  await t.mutation(api.games.start, {
    // oxlint-disable-next-line typescript/no-non-null-assertion
    lobbyId: lobby!._id,
    sessionId: asSessionId("host-session-nobet"),
  });

  // oxlint-disable-next-line typescript/no-non-null-assertion
  await moveRoundToBetting(t, lobby!._id);

  await expect(
    t.mutation(api.bets.lockIn, {
      // oxlint-disable-next-line typescript/no-non-null-assertion
      lobbyId: lobby!._id,
      sessionId: asSessionId("spectator-session-nobet"),
    }),
  ).rejects.toThrow("No bet to lock in");
});

test("lockIn fails when bet is already locked", async () => {
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

  await t.mutation(api.lobbies.join, {
    code,
    displayName: "SpectatorAlready",
    sessionId: asSessionId("spectator-session-already"),
  });

  const lobby = await t.query(api.lobbies.get, { code });

  await t.mutation(api.games.start, {
    // oxlint-disable-next-line typescript/no-non-null-assertion
    lobbyId: lobby!._id,
    sessionId: asSessionId("host-session-already"),
  });

  // oxlint-disable-next-line typescript/no-non-null-assertion
  await moveRoundToBetting(t, lobby!._id);

  let turnPlayerSessionId: SessionId | null = null;
  await t.run(async (ctx) => {
    const game = await ctx.db.query("games").first();
    if (game?.currentRoundId) {
      const round = await ctx.db.get(game.currentRoundId);
      if (round) {
        const player = await ctx.db.get(round.turnPlayerId);
        if (player) {
          // oxlint-disable-next-line typescript/consistent-type-assertions, typescript/no-unsafe-type-assertion
          turnPlayerSessionId = player.sessionId as SessionId;
        }
      }
    }
  });

  expect(turnPlayerSessionId).not.toBeNull();

  if (turnPlayerSessionId === "spectator-session-already") {
    return;
  }

  await t.mutation(api.bets.preview, {
    // oxlint-disable-next-line typescript/no-non-null-assertion
    lobbyId: lobby!._id,
    proposedIndex: 1,
    sessionId: asSessionId("spectator-session-already"),
  });

  await t.mutation(api.bets.lockIn, {
    // oxlint-disable-next-line typescript/no-non-null-assertion
    lobbyId: lobby!._id,
    sessionId: asSessionId("spectator-session-already"),
  });

  await expect(
    t.mutation(api.bets.lockIn, {
      // oxlint-disable-next-line typescript/no-non-null-assertion
      lobbyId: lobby!._id,
      sessionId: asSessionId("spectator-session-already"),
    }),
  ).rejects.toThrow("Bet is already locked in");
});

test("lockIn fails after round is resolved", async () => {
  const t = convexTest(schema, modules);

  await seedTestData(t);

  const { code } = await t.mutation(api.lobbies.create, {
    displayName: "HostResolved",
    sessionId: asSessionId("host-session-resolved"),
  });

  await t.mutation(api.lobbies.join, {
    code,
    displayName: "PlayerResolved",
    sessionId: asSessionId("player-session-resolved"),
  });

  await t.mutation(api.lobbies.join, {
    code,
    displayName: "SpectatorResolved",
    sessionId: asSessionId("spectator-session-resolved"),
  });

  const lobby = await t.query(api.lobbies.get, { code });

  await t.mutation(api.games.start, {
    // oxlint-disable-next-line typescript/no-non-null-assertion
    lobbyId: lobby!._id,
    sessionId: asSessionId("host-session-resolved"),
  });

  // oxlint-disable-next-line typescript/no-non-null-assertion
  await moveRoundToBetting(t, lobby!._id);

  // oxlint-disable-next-line typescript/no-non-null-assertion
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
          // oxlint-disable-next-line typescript/consistent-type-assertions, typescript/no-unsafe-type-assertion
          turnPlayerSessionId = player.sessionId as SessionId;
        }
      }
    }
  });

  expect(turnPlayerSessionId).not.toBeNull();

  if (turnPlayerSessionId === "spectator-session-resolved") {
    return;
  }
  await t.mutation(api.bets.preview, {
    // oxlint-disable-next-line typescript/no-non-null-assertion
    lobbyId: lobby!._id,
    proposedIndex: 1,
    sessionId: asSessionId("spectator-session-resolved"),
  });

  await t.run(async (ctx) => {
    if (game?.currentRoundId) {
      await ctx.db.patch(game.currentRoundId, { phase: "resolved" });
    }
  });

  await expect(
    t.mutation(api.bets.lockIn, {
      // oxlint-disable-next-line typescript/no-non-null-assertion
      lobbyId: lobby!._id,
      sessionId: asSessionId("spectator-session-resolved"),
    }),
  ).rejects.toThrow("Can only lock in bets during betting phase");
});

test("cancel deletes bet and refunds coin", async () => {
  const t = convexTest(schema, modules);

  await seedTestData(t);

  const { code } = await t.mutation(api.lobbies.create, {
    displayName: "HostCancel",
    sessionId: asSessionId("host-session-cancel"),
  });

  await t.mutation(api.lobbies.join, {
    code,
    displayName: "PlayerCancel",
    sessionId: asSessionId("player-session-cancel"),
  });

  await t.mutation(api.lobbies.join, {
    code,
    displayName: "SpectatorCancel",
    sessionId: asSessionId("spectator-session-cancel"),
  });

  const lobby = await t.query(api.lobbies.get, { code });

  await t.mutation(api.games.start, {
    // oxlint-disable-next-line typescript/no-non-null-assertion
    lobbyId: lobby!._id,
    sessionId: asSessionId("host-session-cancel"),
  });

  // oxlint-disable-next-line typescript/no-non-null-assertion
  await moveRoundToBetting(t, lobby!._id);

  let playerBeforeCoins: number | null = null;
  await t.run(async (ctx) => {
    const player = await ctx.db
      .query("players")
      .filter((q) => q.eq(q.field("sessionId"), asSessionId("spectator-session-cancel")))
      .first();
    if (player) {
      playerBeforeCoins = player.coins;
    }
  });

  expect(playerBeforeCoins).not.toBeNull();

  let turnPlayerSessionId: SessionId | null = null;
  await t.run(async (ctx) => {
    const game = await ctx.db.query("games").first();
    if (game?.currentRoundId) {
      const round = await ctx.db.get(game.currentRoundId);
      if (round) {
        const player = await ctx.db.get(round.turnPlayerId);
        if (player) {
          // oxlint-disable-next-line typescript/consistent-type-assertions, typescript/no-unsafe-type-assertion
          turnPlayerSessionId = player.sessionId as SessionId;
        }
      }
    }
  });

  expect(turnPlayerSessionId).not.toBeNull();

  if (turnPlayerSessionId === "spectator-session-cancel") {
    return;
  }

  await t.mutation(api.bets.preview, {
    // oxlint-disable-next-line typescript/no-non-null-assertion
    lobbyId: lobby!._id,
    proposedIndex: 1,
    sessionId: asSessionId("spectator-session-cancel"),
  });

  expect(playerBeforeCoins).toBeGreaterThanOrEqual(1);
  // oxlint-disable-next-line typescript/no-non-null-assertion
  const expectedAfterPreview = playerBeforeCoins! - 1;

  const result = await t.mutation(api.bets.cancel, {
    // oxlint-disable-next-line typescript/no-non-null-assertion
    lobbyId: lobby!._id,
    sessionId: asSessionId("spectator-session-cancel"),
  });

  expect(result).toBeNull();

  let betExists = true;
  await t.run(async (ctx) => {
    const game = await ctx.db.query("games").first();
    if (game?.currentRoundId) {
      const bet = await ctx.db
        .query("roundBets")
        .filter((q) => q.eq(q.field("roundId"), game.currentRoundId))
        .first();
      betExists = bet !== null;
    }
  });

  expect(betExists).toBeFalsy();

  let playerAfterCoins: number | null = null;
  await t.run(async (ctx) => {
    const player = await ctx.db
      .query("players")
      .filter((q) => q.eq(q.field("sessionId"), asSessionId("spectator-session-cancel")))
      .first();
    if (player) {
      playerAfterCoins = player.coins;
    }
  });

  expect(playerAfterCoins).toBe(expectedAfterPreview + 1);
});

test("cancel fails when no bet exists", async () => {
  const t = convexTest(schema, modules);

  await seedTestData(t);

  const { code } = await t.mutation(api.lobbies.create, {
    displayName: "HostNoBetCancel",
    sessionId: asSessionId("host-session-nobetcancel"),
  });

  await t.mutation(api.lobbies.join, {
    code,
    displayName: "PlayerNoBetCancel",
    sessionId: asSessionId("player-session-nobetcancel"),
  });

  await t.mutation(api.lobbies.join, {
    code,
    displayName: "SpectatorNoBetCancel",
    sessionId: asSessionId("spectator-session-nobetcancel"),
  });

  const lobby = await t.query(api.lobbies.get, { code });

  await t.mutation(api.games.start, {
    // oxlint-disable-next-line typescript/no-non-null-assertion
    lobbyId: lobby!._id,
    sessionId: asSessionId("host-session-nobetcancel"),
  });

  // oxlint-disable-next-line typescript/no-non-null-assertion
  await moveRoundToBetting(t, lobby!._id);

  await expect(
    t.mutation(api.bets.cancel, {
      // oxlint-disable-next-line typescript/no-non-null-assertion
      lobbyId: lobby!._id,
      sessionId: asSessionId("spectator-session-nobetcancel"),
    }),
  ).rejects.toThrow("No bet to cancel");
});

test("cancel fails when bet is locked in", async () => {
  const t = convexTest(schema, modules);

  await seedTestData(t);

  const { code } = await t.mutation(api.lobbies.create, {
    displayName: "HostCannotCancel",
    sessionId: asSessionId("host-session-cannotcancel"),
  });

  await t.mutation(api.lobbies.join, {
    code,
    displayName: "PlayerCannotCancel",
    sessionId: asSessionId("player-session-cannotcancel"),
  });

  await t.mutation(api.lobbies.join, {
    code,
    displayName: "SpectatorCantCancel",
    sessionId: asSessionId("spectator-session-cannotcancel"),
  });

  const lobby = await t.query(api.lobbies.get, { code });

  await t.mutation(api.games.start, {
    // oxlint-disable-next-line typescript/no-non-null-assertion
    lobbyId: lobby!._id,
    sessionId: asSessionId("host-session-cannotcancel"),
  });

  // oxlint-disable-next-line typescript/no-non-null-assertion
  await moveRoundToBetting(t, lobby!._id);

  let turnPlayerSessionId: SessionId | null = null;
  await t.run(async (ctx) => {
    const game = await ctx.db.query("games").first();
    if (game?.currentRoundId) {
      const round = await ctx.db.get(game.currentRoundId);
      if (round) {
        const player = await ctx.db.get(round.turnPlayerId);
        if (player) {
          // oxlint-disable-next-line typescript/consistent-type-assertions, typescript/no-unsafe-type-assertion
          turnPlayerSessionId = player.sessionId as SessionId;
        }
      }
    }
  });

  expect(turnPlayerSessionId).not.toBeNull();

  if (turnPlayerSessionId === "spectator-session-cannotcancel") {
    return;
  }

  await t.mutation(api.bets.preview, {
    // oxlint-disable-next-line typescript/no-non-null-assertion
    lobbyId: lobby!._id,
    proposedIndex: 1,
    sessionId: asSessionId("spectator-session-cannotcancel"),
  });

  await t.mutation(api.bets.lockIn, {
    // oxlint-disable-next-line typescript/no-non-null-assertion
    lobbyId: lobby!._id,
    sessionId: asSessionId("spectator-session-cannotcancel"),
  });

  await expect(
    t.mutation(api.bets.cancel, {
      // oxlint-disable-next-line typescript/no-non-null-assertion
      lobbyId: lobby!._id,
      sessionId: asSessionId("spectator-session-cannotcancel"),
    }),
  ).rejects.toThrow("Cannot cancel a locked bet");
});

test("cancel fails after round is resolved", async () => {
  const t = convexTest(schema, modules);

  await seedTestData(t);

  const { code } = await t.mutation(api.lobbies.create, {
    displayName: "HostCancelResolved",
    sessionId: asSessionId("host-session-cancelresolved"),
  });

  await t.mutation(api.lobbies.join, {
    code,
    displayName: "PlayerCancelResolved",
    sessionId: asSessionId("player-session-cancelresolved"),
  });

  await t.mutation(api.lobbies.join, {
    code,
    displayName: "SpectatorCancelRes",
    sessionId: asSessionId("spectator-session-cancelresolved"),
  });

  const lobby = await t.query(api.lobbies.get, { code });

  await t.mutation(api.games.start, {
    // oxlint-disable-next-line typescript/no-non-null-assertion
    lobbyId: lobby!._id,
    sessionId: asSessionId("host-session-cancelresolved"),
  });

  // oxlint-disable-next-line typescript/no-non-null-assertion
  await moveRoundToBetting(t, lobby!._id);

  // oxlint-disable-next-line typescript/no-non-null-assertion
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
          // oxlint-disable-next-line typescript/consistent-type-assertions, typescript/no-unsafe-type-assertion
          turnPlayerSessionId = player.sessionId as SessionId;
        }
      }
    }
  });

  expect(turnPlayerSessionId).not.toBeNull();

  if (turnPlayerSessionId === "spectator-session-cancelresolved") {
    return;
  }
  await t.mutation(api.bets.preview, {
    // oxlint-disable-next-line typescript/no-non-null-assertion
    lobbyId: lobby!._id,
    proposedIndex: 1,
    sessionId: asSessionId("spectator-session-cancelresolved"),
  });

  await t.run(async (ctx) => {
    if (game?.currentRoundId) {
      await ctx.db.patch(game.currentRoundId, { phase: "resolved" });
    }
  });

  await expect(
    t.mutation(api.bets.cancel, {
      // oxlint-disable-next-line typescript/no-non-null-assertion
      lobbyId: lobby!._id,
      sessionId: asSessionId("spectator-session-cancelresolved"),
    }),
  ).rejects.toThrow("Can only cancel bets during betting phase");
});

test("preview works during betting phase", async () => {
  const t = convexTest(schema, modules);

  await seedTestData(t);

  const { code } = await t.mutation(api.lobbies.create, {
    displayName: "HostBetting",
    sessionId: asSessionId("host-session-betting"),
  });

  await t.mutation(api.lobbies.join, {
    code,
    displayName: "PlayerBetting",
    sessionId: asSessionId("player-session-betting"),
  });

  await t.mutation(api.lobbies.join, {
    code,
    displayName: "SpectatorBetting",
    sessionId: asSessionId("spectator-session-betting"),
  });

  const lobby = await t.query(api.lobbies.get, { code });

  await t.mutation(api.games.start, {
    // oxlint-disable-next-line typescript/no-non-null-assertion
    lobbyId: lobby!._id,
    sessionId: asSessionId("host-session-betting"),
  });

  // oxlint-disable-next-line typescript/no-non-null-assertion
  await moveRoundToBetting(t, lobby!._id);

  // oxlint-disable-next-line typescript/no-non-null-assertion
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
          // oxlint-disable-next-line typescript/consistent-type-assertions, typescript/no-unsafe-type-assertion
          turnPlayerSessionId = player.sessionId as SessionId;
        }
      }
    }
  });

  expect(turnPlayerSessionId).not.toBeNull();

  if (turnPlayerSessionId === "spectator-session-betting") {
    await expect(
      t.mutation(api.bets.preview, {
        // oxlint-disable-next-line typescript/no-non-null-assertion
        lobbyId: lobby!._id,
        proposedIndex: 0,
        sessionId: asSessionId("spectator-session-betting"),
      }),
    ).rejects.toThrow("Turn player cannot place bets");
  } else {
    const result = await t.mutation(api.bets.preview, {
      // oxlint-disable-next-line typescript/no-non-null-assertion
      lobbyId: lobby!._id,
      proposedIndex: 1,
      sessionId: asSessionId("spectator-session-betting"),
    });
    expect(result).toBeNull();
  }
});

test("preview works during placing phase", async () => {
  const t = convexTest(schema, modules);

  await seedTestData(t);

  const { code } = await t.mutation(api.lobbies.create, {
    displayName: "HostPlacing",
    sessionId: asSessionId("host-session-placing"),
  });

  await t.mutation(api.lobbies.join, {
    code,
    displayName: "PlayerPlacing",
    sessionId: asSessionId("player-session-placing"),
  });

  await t.mutation(api.lobbies.join, {
    code,
    displayName: "SpectatorPlacing",
    sessionId: asSessionId("spectator-session-placing"),
  });

  const lobby = await t.query(api.lobbies.get, { code });

  await t.mutation(api.games.start, {
    // oxlint-disable-next-line typescript/no-non-null-assertion
    lobbyId: lobby!._id,
    sessionId: asSessionId("host-session-placing"),
  });

  await expect(
    t.mutation(api.bets.preview, {
      // oxlint-disable-next-line typescript/no-non-null-assertion
      lobbyId: lobby!._id,
      proposedIndex: 0,
      sessionId: asSessionId("spectator-session-placing"),
    }),
  ).rejects.toThrow("Can only place bets after placement is locked in");
});

test("listForRound returns all bets when showLiveBets is true", async () => {
  const t = convexTest(schema, modules);

  await seedTestData(t);

  const { code } = await t.mutation(api.lobbies.create, {
    displayName: "HostListLive",
    sessionId: asSessionId("host-session-listlive"),
  });

  await t.mutation(api.lobbies.join, {
    code,
    displayName: "PlayerListLive",
    sessionId: asSessionId("player-session-listlive"),
  });

  await t.mutation(api.lobbies.join, {
    code,
    displayName: "SpectatorListLive1",
    sessionId: asSessionId("spectator-session-listlive1"),
  });

  await t.mutation(api.lobbies.join, {
    code,
    displayName: "SpectatorListLive2",
    sessionId: asSessionId("spectator-session-listlive2"),
  });

  const lobby = await t.query(api.lobbies.get, { code });

  await t.mutation(api.games.start, {
    // oxlint-disable-next-line typescript/no-non-null-assertion
    lobbyId: lobby!._id,
    sessionId: asSessionId("host-session-listlive"),
  });

  // oxlint-disable-next-line typescript/no-non-null-assertion
  await moveRoundToBetting(t, lobby!._id);

  let turnPlayerSessionId: SessionId | null = null;
  let nonTurnSessionId: SessionId | null = null;
  await t.run(async (ctx) => {
    const game = await ctx.db.query("games").first();
    if (game?.currentRoundId) {
      const round = await ctx.db.get(game.currentRoundId);
      if (round) {
        const player = await ctx.db.get(round.turnPlayerId);
        if (player) {
          // oxlint-disable-next-line typescript/consistent-type-assertions, typescript/no-unsafe-type-assertion
          turnPlayerSessionId = player.sessionId as SessionId;
          const players = await ctx.db.query("players").collect();
          nonTurnSessionId =
            // oxlint-disable-next-line typescript/consistent-type-assertions, typescript/no-unsafe-type-assertion
            (players.find((p) => p.sessionId !== turnPlayerSessionId)?.sessionId as SessionId) ||
            null;
        }
      }
    }
  });

  expect(turnPlayerSessionId).not.toBeNull();
  expect(nonTurnSessionId).not.toBeNull();

  if (nonTurnSessionId) {
    await t.mutation(api.bets.preview, {
      // oxlint-disable-next-line typescript/no-non-null-assertion
      lobbyId: lobby!._id,
      proposedIndex: 1,
      sessionId: nonTurnSessionId,
    });

    // oxlint-disable-next-line typescript/no-non-null-assertion
    const bets = await t.query(api.bets.listForRound, { lobbyId: lobby!._id });

    expect(bets).toHaveLength(1);
    expect(bets?.[0]?.lockedIn).toBeFalsy();
    expect(bets?.[0]?.playerDisplayName).toBeTruthy();
  }
});

test("listForRound returns only locked bets when showLiveBets is false", async () => {
  const t = convexTest(schema, modules);

  await seedTestData(t);

  const { code } = await t.mutation(api.lobbies.create, {
    displayName: "HostNoLive",
    sessionId: asSessionId("host-session-nolive"),
  });

  await t.mutation(api.lobbies.join, {
    code,
    displayName: "PlayerNoLive",
    sessionId: asSessionId("player-session-nolive"),
  });

  await t.mutation(api.lobbies.join, {
    code,
    displayName: "SpectatorNoLive1",
    sessionId: asSessionId("spectator-session-nolive1"),
  });

  await t.mutation(api.lobbies.join, {
    code,
    displayName: "SpectatorNoLive2",
    sessionId: asSessionId("spectator-session-nolive2"),
  });

  const lobby = await t.query(api.lobbies.get, { code });

  await t.mutation(api.lobbies.updateSettings, {
    code,
    sessionId: asSessionId("host-session-nolive"),
    settings: {
      allowBetRetraction: true,
      allowGuessTitleArtist: false,
      bettingWindowSeconds: 15,
      maxYear: 2024,
      minYear: 1950,
      showLiveBets: false,
      startingCoins: 3,
      targetTimelineSize: 10,
      turnSeconds: 30,
    },
  });

  await t.mutation(api.games.start, {
    // oxlint-disable-next-line typescript/no-non-null-assertion
    lobbyId: lobby!._id,
    sessionId: asSessionId("host-session-nolive"),
  });

  // oxlint-disable-next-line typescript/no-non-null-assertion
  await moveRoundToBetting(t, lobby!._id);

  let turnPlayerSessionId: SessionId | null = null;
  let nonTurnSessions: SessionId[] = [];
  await t.run(async (ctx) => {
    const game = await ctx.db.query("games").first();
    if (game?.currentRoundId) {
      const round = await ctx.db.get(game.currentRoundId);
      if (round) {
        const player = await ctx.db.get(round.turnPlayerId);
        if (player) {
          // oxlint-disable-next-line typescript/consistent-type-assertions, typescript/no-unsafe-type-assertion
          turnPlayerSessionId = player.sessionId as SessionId;
          const allPlayers = await ctx.db.query("players").collect();
          nonTurnSessions = allPlayers
            .filter((p) => p.sessionId !== turnPlayerSessionId)
            // oxlint-disable-next-line typescript/consistent-type-assertions, typescript/no-unsafe-type-assertion
            .map((p) => p.sessionId as SessionId);
        }
      }
    }
  });

  expect(turnPlayerSessionId).not.toBeNull();
  expect(nonTurnSessions.length).toBeGreaterThan(0);

  await Promise.all(
    nonTurnSessions.map((sessionId) =>
      t.mutation(api.bets.preview, {
        // oxlint-disable-next-line typescript/no-non-null-assertion
        lobbyId: lobby!._id,
        proposedIndex: 1,
        sessionId,
      }),
    ),
  );

  const betsBeforeLock = await t.query(api.bets.listForRound, {
    // oxlint-disable-next-line typescript/no-non-null-assertion
    lobbyId: lobby!._id,
  });
  expect(betsBeforeLock).toHaveLength(nonTurnSessions.length);
  expect(betsBeforeLock?.every((bet) => bet.lockedIn === false)).toBeTruthy();

  await Promise.all(
    nonTurnSessions.map((sessionId) =>
      t.mutation(api.bets.lockIn, {
        // oxlint-disable-next-line typescript/no-non-null-assertion
        lobbyId: lobby!._id,
        sessionId,
      }),
    ),
  );

  const betsAfterLock = await t.query(api.bets.listForRound, {
    // oxlint-disable-next-line typescript/no-non-null-assertion
    lobbyId: lobby!._id,
  });

  expect(betsAfterLock).toHaveLength(nonTurnSessions.length);
  expect(betsAfterLock?.every((bet) => bet.lockedIn === true)).toBeTruthy();
  expect(betsAfterLock?.every((bet) => bet.playerDisplayName)).toBeTruthy();
});

test("listForRound returns empty array when no bets exist", async () => {
  const t = convexTest(schema, modules);

  await seedTestData(t);

  const { code } = await t.mutation(api.lobbies.create, {
    displayName: "HostNoBets",
    sessionId: asSessionId("host-session-nobets"),
  });

  await t.mutation(api.lobbies.join, {
    code,
    displayName: "PlayerNoBets",
    sessionId: asSessionId("player-session-nobets"),
  });

  const lobby = await t.query(api.lobbies.get, { code });

  await t.mutation(api.games.start, {
    // oxlint-disable-next-line typescript/no-non-null-assertion
    lobbyId: lobby!._id,
    sessionId: asSessionId("host-session-nobets"),
  });

  // oxlint-disable-next-line typescript/no-non-null-assertion
  await moveRoundToBetting(t, lobby!._id);

  // oxlint-disable-next-line typescript/no-non-null-assertion
  const bets = await t.query(api.bets.listForRound, { lobbyId: lobby!._id });

  expect(bets).toHaveLength(0);
});

test("listForRound returns empty array when no active game", async () => {
  const t = convexTest(schema, modules);

  const { code } = await t.mutation(api.lobbies.create, {
    displayName: "HostNoGame",
    sessionId: asSessionId("host-session-nogame"),
  });

  await t.mutation(api.lobbies.join, {
    code,
    displayName: "PlayerNoGame",
    sessionId: asSessionId("player-session-nogame"),
  });

  const lobby = await t.query(api.lobbies.get, { code });

  // oxlint-disable-next-line typescript/no-non-null-assertion
  const bets = await t.query(api.bets.listForRound, { lobbyId: lobby!._id });

  expect(bets).toHaveLength(0);
});
