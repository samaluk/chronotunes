import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
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

test("preview creates unlocked bet for non-turn player", async () => {
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

  await t.mutation(api.lobbies.join, {
    code,
    sessionId: "spectator-session-preview",
    displayName: "SpectatorPreview",
  });

  const lobby = await t.query(api.lobbies.get, { code });

  await t.mutation(api.games.start, {
    lobbyId: lobby!._id,
    sessionId: "host-session-preview",
  });

  let turnPlayerId: Id<"players"> | null = null;
  await t.run(async (ctx) => {
    const game = await ctx.db.query("games").first();
    if (game?.currentRoundId) {
      const round = await ctx.db.get(game.currentRoundId);
      if (round) {
        turnPlayerId = round.turnPlayerId;
      }
    }
  });

  let nonTurnPlayerId: Id<"players"> | null = null;
  await t.run(async (ctx) => {
    const player = await ctx.db
      .query("players")
      .filter((q) => q.eq(q.field("sessionId"), "spectator-session-preview"))
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
    lobbyId: lobby!._id,
    sessionId: "spectator-session-preview",
    proposedIndex: 0,
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
        expect(bet.lockedIn).toBe(false);
        expect(bet.proposedIndex).toBe(0);
        expect(bet.status).toBe("pending");
      }
    }
  });

  expect(betCreated).toBe(true);
});

test("preview deducts 1 coin from player", async () => {
  const t = convexTest(schema, modules);

  await seedTestData(t);

  const { code } = await t.mutation(api.lobbies.create, {
    sessionId: "host-session-coin",
    displayName: "HostCoin",
  });

  await t.mutation(api.lobbies.join, {
    code,
    sessionId: "player-session-coin",
    displayName: "PlayerCoin",
  });

  await t.mutation(api.lobbies.join, {
    code,
    sessionId: "spectator-session-coin",
    displayName: "SpectatorCoin",
  });

  const lobby = await t.query(api.lobbies.get, { code });

  await t.mutation(api.games.start, {
    lobbyId: lobby!._id,
    sessionId: "host-session-coin",
  });

  let playerBeforeCoins: number | null = null;
  await t.run(async (ctx) => {
    const player = await ctx.db
      .query("players")
      .filter((q) => q.eq(q.field("sessionId"), "spectator-session-coin"))
      .first();
    if (player) {
      playerBeforeCoins = player.coins;
    }
  });

  expect(playerBeforeCoins).not.toBeNull();
  expect(playerBeforeCoins).toBeGreaterThanOrEqual(1);

  let turnPlayerSessionId: string | null = null;
  await t.run(async (ctx) => {
    const game = await ctx.db.query("games").first();
    if (game?.currentRoundId) {
      const round = await ctx.db.get(game.currentRoundId);
      if (round) {
        const player = await ctx.db.get(round.turnPlayerId);
        if (player) {
          turnPlayerSessionId = player.sessionId;
        }
      }
    }
  });

  expect(turnPlayerSessionId).not.toBeNull();

  if (turnPlayerSessionId === "spectator-session-coin") {
    return;
  }

  await t.mutation(api.bets.preview, {
    lobbyId: lobby!._id,
    sessionId: "spectator-session-coin",
    proposedIndex: 0,
  });

  let playerAfterCoins: number | null = null;
  await t.run(async (ctx) => {
    const player = await ctx.db
      .query("players")
      .filter((q) => q.eq(q.field("sessionId"), "spectator-session-coin"))
      .first();
    if (player) {
      playerAfterCoins = player.coins;
    }
  });

  expect(playerAfterCoins).toBe(playerBeforeCoins! - 1);
});

test("preview fails for turn player", async () => {
  const t = convexTest(schema, modules);

  await seedTestData(t);

  const { code } = await t.mutation(api.lobbies.create, {
    sessionId: "host-session-turn",
    displayName: "HostTurn",
  });

  await t.mutation(api.lobbies.join, {
    code,
    sessionId: "player-session-turn",
    displayName: "PlayerTurn",
  });

  await t.mutation(api.lobbies.join, {
    code,
    sessionId: "spectator-session-turn",
    displayName: "SpectatorTurn",
  });

  const lobby = await t.query(api.lobbies.get, { code });

  await t.mutation(api.games.start, {
    lobbyId: lobby!._id,
    sessionId: "host-session-turn",
  });

  let turnPlayerSessionId: string | null = null;
  await t.run(async (ctx) => {
    const game = await ctx.db.query("games").first();
    if (game?.currentRoundId) {
      const round = await ctx.db.get(game.currentRoundId);
      if (round) {
        const player = await ctx.db.get(round.turnPlayerId);
        if (player) {
          turnPlayerSessionId = player.sessionId;
        }
      }
    }
  });

  expect(turnPlayerSessionId).not.toBeNull();

  await expect(
    t.mutation(api.bets.preview, {
      lobbyId: lobby!._id,
      sessionId: turnPlayerSessionId!,
      proposedIndex: 0,
    }),
  ).rejects.toThrow("Turn player cannot place bets");
});

test("preview fails when player has no coins", async () => {
  const t = convexTest(schema, modules);

  await seedTestData(t);

  const { code } = await t.mutation(api.lobbies.create, {
    sessionId: "host-session-nocoin",
    displayName: "HostNoCoin",
  });

  await t.mutation(api.lobbies.join, {
    code,
    sessionId: "player-session-nocoin",
    displayName: "PlayerNoCoin",
  });

  await t.mutation(api.lobbies.join, {
    code,
    sessionId: "spectator-session-nocoin",
    displayName: "SpectatorNoCoin",
  });

  const lobby = await t.query(api.lobbies.get, { code });

  await t.mutation(api.games.start, {
    lobbyId: lobby!._id,
    sessionId: "host-session-nocoin",
  });

  let turnPlayerSessionId: string | null = null;
  await t.run(async (ctx) => {
    const game = await ctx.db.query("games").first();
    if (game?.currentRoundId) {
      const round = await ctx.db.get(game.currentRoundId);
      if (round) {
        const player = await ctx.db.get(round.turnPlayerId);
        if (player) {
          turnPlayerSessionId = player.sessionId;
        }
      }
    }
  });

  expect(turnPlayerSessionId).not.toBeNull();

  await t.run(async (ctx) => {
    const player = await ctx.db
      .query("players")
      .filter((q) => q.eq(q.field("sessionId"), "spectator-session-nocoin"))
      .first();
    if (player) {
      await ctx.db.patch(player._id, { coins: 0 });
    }
  });

  if (turnPlayerSessionId !== "spectator-session-nocoin") {
    await expect(
      t.mutation(api.bets.preview, {
        lobbyId: lobby!._id,
        sessionId: "spectator-session-nocoin",
        proposedIndex: 0,
      }),
    ).rejects.toThrow("Not enough coins to place a bet");
  } else {
    await expect(
      t.mutation(api.bets.preview, {
        lobbyId: lobby!._id,
        sessionId: "spectator-session-nocoin",
        proposedIndex: 0,
      }),
    ).rejects.toThrow("Turn player cannot place bets");
  }
});

test("preview fails for negative index", async () => {
  const t = convexTest(schema, modules);

  await seedTestData(t);

  const { code } = await t.mutation(api.lobbies.create, {
    sessionId: "host-session-neg",
    displayName: "HostNeg",
  });

  await t.mutation(api.lobbies.join, {
    code,
    sessionId: "player-session-neg",
    displayName: "PlayerNeg",
  });

  await t.mutation(api.lobbies.join, {
    code,
    sessionId: "spectator-session-neg",
    displayName: "SpectatorNeg",
  });

  const lobby = await t.query(api.lobbies.get, { code });

  await t.mutation(api.games.start, {
    lobbyId: lobby!._id,
    sessionId: "host-session-neg",
  });

  let turnPlayerSessionId: string | null = null;
  await t.run(async (ctx) => {
    const game = await ctx.db.query("games").first();
    if (game?.currentRoundId) {
      const round = await ctx.db.get(game.currentRoundId);
      if (round) {
        const player = await ctx.db.get(round.turnPlayerId);
        if (player) {
          turnPlayerSessionId = player.sessionId;
        }
      }
    }
  });

  expect(turnPlayerSessionId).not.toBeNull();

  if (turnPlayerSessionId !== "spectator-session-neg") {
    await expect(
      t.mutation(api.bets.preview, {
        lobbyId: lobby!._id,
        sessionId: "spectator-session-neg",
        proposedIndex: -1,
      }),
    ).rejects.toThrow("Proposed index cannot be negative");
  } else {
    await expect(
      t.mutation(api.bets.preview, {
        lobbyId: lobby!._id,
        sessionId: "spectator-session-neg",
        proposedIndex: -1,
      }),
    ).rejects.toThrow("Turn player cannot place bets");
  }
});

test("preview updates existing unlocked bet", async () => {
  const t = convexTest(schema, modules);

  await seedTestData(t);

  const { code } = await t.mutation(api.lobbies.create, {
    sessionId: "host-session-update",
    displayName: "HostUpdate",
  });

  await t.mutation(api.lobbies.join, {
    code,
    sessionId: "player-session-update",
    displayName: "PlayerUpdate",
  });

  await t.mutation(api.lobbies.join, {
    code,
    sessionId: "spectator-session-update",
    displayName: "SpectatorUpdate",
  });

  const lobby = await t.query(api.lobbies.get, { code });

  await t.mutation(api.games.start, {
    lobbyId: lobby!._id,
    sessionId: "host-session-update",
  });

  let turnPlayerSessionId: string | null = null;
  await t.run(async (ctx) => {
    const game = await ctx.db.query("games").first();
    if (game?.currentRoundId) {
      const round = await ctx.db.get(game.currentRoundId);
      if (round) {
        const player = await ctx.db.get(round.turnPlayerId);
        if (player) {
          turnPlayerSessionId = player.sessionId;
        }
      }
    }
  });

  expect(turnPlayerSessionId).not.toBeNull();

  if (turnPlayerSessionId === "spectator-session-update") {
    return;
  }

  await t.mutation(api.bets.preview, {
    lobbyId: lobby!._id,
    sessionId: "spectator-session-update",
    proposedIndex: 1,
  });

  await t.mutation(api.bets.preview, {
    lobbyId: lobby!._id,
    sessionId: "spectator-session-update",
    proposedIndex: 2,
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
    sessionId: "host-session-locked",
    displayName: "HostLocked",
  });

  await t.mutation(api.lobbies.join, {
    code,
    sessionId: "player-session-locked",
    displayName: "PlayerLocked",
  });

  await t.mutation(api.lobbies.join, {
    code,
    sessionId: "spectator-session-locked",
    displayName: "SpectatorLocked",
  });

  const lobby = await t.query(api.lobbies.get, { code });

  await t.mutation(api.games.start, {
    lobbyId: lobby!._id,
    sessionId: "host-session-locked",
  });

  let turnPlayerSessionId: string | null = null;
  await t.run(async (ctx) => {
    const game = await ctx.db.query("games").first();
    if (game?.currentRoundId) {
      const round = await ctx.db.get(game.currentRoundId);
      if (round) {
        const player = await ctx.db.get(round.turnPlayerId);
        if (player) {
          turnPlayerSessionId = player.sessionId;
        }
      }
    }
  });

  expect(turnPlayerSessionId).not.toBeNull();

  if (turnPlayerSessionId === "spectator-session-locked") {
    return;
  }

  await t.mutation(api.bets.preview, {
    lobbyId: lobby!._id,
    sessionId: "spectator-session-locked",
    proposedIndex: 0,
  });

  await t.mutation(api.bets.lockIn, {
    lobbyId: lobby!._id,
    sessionId: "spectator-session-locked",
  });

  await expect(
    t.mutation(api.bets.preview, {
      lobbyId: lobby!._id,
      sessionId: "spectator-session-locked",
      proposedIndex: 1,
    }),
  ).rejects.toThrow("Cannot change a locked bet");
});

test("lockIn sets lockedIn to true", async () => {
  const t = convexTest(schema, modules);

  await seedTestData(t);

  const { code } = await t.mutation(api.lobbies.create, {
    sessionId: "host-session-lock",
    displayName: "HostLock",
  });

  await t.mutation(api.lobbies.join, {
    code,
    sessionId: "player-session-lock",
    displayName: "PlayerLock",
  });

  await t.mutation(api.lobbies.join, {
    code,
    sessionId: "spectator-session-lock",
    displayName: "SpectatorLock",
  });

  const lobby = await t.query(api.lobbies.get, { code });

  await t.mutation(api.games.start, {
    lobbyId: lobby!._id,
    sessionId: "host-session-lock",
  });

  let turnPlayerSessionId: string | null = null;
  await t.run(async (ctx) => {
    const game = await ctx.db.query("games").first();
    if (game?.currentRoundId) {
      const round = await ctx.db.get(game.currentRoundId);
      if (round) {
        const player = await ctx.db.get(round.turnPlayerId);
        if (player) {
          turnPlayerSessionId = player.sessionId;
        }
      }
    }
  });

  expect(turnPlayerSessionId).not.toBeNull();

  if (turnPlayerSessionId === "spectator-session-lock") {
    return;
  }

  await t.mutation(api.bets.preview, {
    lobbyId: lobby!._id,
    sessionId: "spectator-session-lock",
    proposedIndex: 0,
  });

  const result = await t.mutation(api.bets.lockIn, {
    lobbyId: lobby!._id,
    sessionId: "spectator-session-lock",
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

  expect(betLockedIn).toBe(true);
});

test("lockIn fails when no bet exists", async () => {
  const t = convexTest(schema, modules);

  await seedTestData(t);

  const { code } = await t.mutation(api.lobbies.create, {
    sessionId: "host-session-nobet",
    displayName: "HostNoBet",
  });

  await t.mutation(api.lobbies.join, {
    code,
    sessionId: "player-session-nobet",
    displayName: "PlayerNoBet",
  });

  await t.mutation(api.lobbies.join, {
    code,
    sessionId: "spectator-session-nobet",
    displayName: "SpectatorNoBet",
  });

  const lobby = await t.query(api.lobbies.get, { code });

  await t.mutation(api.games.start, {
    lobbyId: lobby!._id,
    sessionId: "host-session-nobet",
  });

  await expect(
    t.mutation(api.bets.lockIn, {
      lobbyId: lobby!._id,
      sessionId: "spectator-session-nobet",
    }),
  ).rejects.toThrow("No bet to lock in");
});

test("lockIn fails when bet is already locked", async () => {
  const t = convexTest(schema, modules);

  await seedTestData(t);

  const { code } = await t.mutation(api.lobbies.create, {
    sessionId: "host-session-already",
    displayName: "HostAlready",
  });

  await t.mutation(api.lobbies.join, {
    code,
    sessionId: "player-session-already",
    displayName: "PlayerAlready",
  });

  await t.mutation(api.lobbies.join, {
    code,
    sessionId: "spectator-session-already",
    displayName: "SpectatorAlready",
  });

  const lobby = await t.query(api.lobbies.get, { code });

  await t.mutation(api.games.start, {
    lobbyId: lobby!._id,
    sessionId: "host-session-already",
  });

  let turnPlayerSessionId: string | null = null;
  await t.run(async (ctx) => {
    const game = await ctx.db.query("games").first();
    if (game?.currentRoundId) {
      const round = await ctx.db.get(game.currentRoundId);
      if (round) {
        const player = await ctx.db.get(round.turnPlayerId);
        if (player) {
          turnPlayerSessionId = player.sessionId;
        }
      }
    }
  });

  expect(turnPlayerSessionId).not.toBeNull();

  if (turnPlayerSessionId === "spectator-session-already") {
    return;
  }

  await t.mutation(api.bets.preview, {
    lobbyId: lobby!._id,
    sessionId: "spectator-session-already",
    proposedIndex: 0,
  });

  await t.mutation(api.bets.lockIn, {
    lobbyId: lobby!._id,
    sessionId: "spectator-session-already",
  });

  await expect(
    t.mutation(api.bets.lockIn, {
      lobbyId: lobby!._id,
      sessionId: "spectator-session-already",
    }),
  ).rejects.toThrow("Bet is already locked in");
});

test("lockIn fails after round is resolved", async () => {
  const t = convexTest(schema, modules);

  await seedTestData(t);

  const { code } = await t.mutation(api.lobbies.create, {
    sessionId: "host-session-resolved",
    displayName: "HostResolved",
  });

  await t.mutation(api.lobbies.join, {
    code,
    sessionId: "player-session-resolved",
    displayName: "PlayerResolved",
  });

  await t.mutation(api.lobbies.join, {
    code,
    sessionId: "spectator-session-resolved",
    displayName: "SpectatorResolved",
  });

  const lobby = await t.query(api.lobbies.get, { code });

  await t.mutation(api.games.start, {
    lobbyId: lobby!._id,
    sessionId: "host-session-resolved",
  });

  const game = await t.query(api.games.getCurrent, { lobbyId: lobby!._id });

  await t.run(async (ctx) => {
    if (game?.currentRoundId) {
      await ctx.db.patch(game.currentRoundId, { phase: "betting" });
    }
  });

  let turnPlayerSessionId: string | null = null;
  await t.run(async (ctx) => {
    const game = await ctx.db.query("games").first();
    if (game?.currentRoundId) {
      const round = await ctx.db.get(game.currentRoundId);
      if (round) {
        const player = await ctx.db.get(round.turnPlayerId);
        if (player) {
          turnPlayerSessionId = player.sessionId;
        }
      }
    }
  });

  expect(turnPlayerSessionId).not.toBeNull();

  if (turnPlayerSessionId !== "spectator-session-resolved") {
    await t.mutation(api.bets.preview, {
      lobbyId: lobby!._id,
      sessionId: "spectator-session-resolved",
      proposedIndex: 0,
    });
  } else {
    return;
  }

  await t.run(async (ctx) => {
    if (game?.currentRoundId) {
      await ctx.db.patch(game.currentRoundId, { phase: "resolved" });
    }
  });

  await expect(
    t.mutation(api.bets.lockIn, {
      lobbyId: lobby!._id,
      sessionId: "spectator-session-resolved",
    }),
  ).rejects.toThrow("Cannot lock in bet after round is resolved");
});

test("cancel deletes bet and refunds coin", async () => {
  const t = convexTest(schema, modules);

  await seedTestData(t);

  const { code } = await t.mutation(api.lobbies.create, {
    sessionId: "host-session-cancel",
    displayName: "HostCancel",
  });

  await t.mutation(api.lobbies.join, {
    code,
    sessionId: "player-session-cancel",
    displayName: "PlayerCancel",
  });

  await t.mutation(api.lobbies.join, {
    code,
    sessionId: "spectator-session-cancel",
    displayName: "SpectatorCancel",
  });

  const lobby = await t.query(api.lobbies.get, { code });

  await t.mutation(api.games.start, {
    lobbyId: lobby!._id,
    sessionId: "host-session-cancel",
  });

  let playerBeforeCoins: number | null = null;
  await t.run(async (ctx) => {
    const player = await ctx.db
      .query("players")
      .filter((q) => q.eq(q.field("sessionId"), "spectator-session-cancel"))
      .first();
    if (player) {
      playerBeforeCoins = player.coins;
    }
  });

  expect(playerBeforeCoins).not.toBeNull();

  let turnPlayerSessionId: string | null = null;
  await t.run(async (ctx) => {
    const game = await ctx.db.query("games").first();
    if (game?.currentRoundId) {
      const round = await ctx.db.get(game.currentRoundId);
      if (round) {
        const player = await ctx.db.get(round.turnPlayerId);
        if (player) {
          turnPlayerSessionId = player.sessionId;
        }
      }
    }
  });

  expect(turnPlayerSessionId).not.toBeNull();

  if (turnPlayerSessionId === "spectator-session-cancel") {
    return;
  }

  await t.mutation(api.bets.preview, {
    lobbyId: lobby!._id,
    sessionId: "spectator-session-cancel",
    proposedIndex: 0,
  });

  expect(playerBeforeCoins).toBeGreaterThanOrEqual(1);
  const expectedAfterPreview = playerBeforeCoins! - 1;

  const result = await t.mutation(api.bets.cancel, {
    lobbyId: lobby!._id,
    sessionId: "spectator-session-cancel",
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

  expect(betExists).toBe(false);

  let playerAfterCoins: number | null = null;
  await t.run(async (ctx) => {
    const player = await ctx.db
      .query("players")
      .filter((q) => q.eq(q.field("sessionId"), "spectator-session-cancel"))
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
    sessionId: "host-session-nobetcancel",
    displayName: "HostNoBetCancel",
  });

  await t.mutation(api.lobbies.join, {
    code,
    sessionId: "player-session-nobetcancel",
    displayName: "PlayerNoBetCancel",
  });

  await t.mutation(api.lobbies.join, {
    code,
    sessionId: "spectator-session-nobetcancel",
    displayName: "SpectatorNoBetCancel",
  });

  const lobby = await t.query(api.lobbies.get, { code });

  await t.mutation(api.games.start, {
    lobbyId: lobby!._id,
    sessionId: "host-session-nobetcancel",
  });

  await expect(
    t.mutation(api.bets.cancel, {
      lobbyId: lobby!._id,
      sessionId: "spectator-session-nobetcancel",
    }),
  ).rejects.toThrow("No bet to cancel");
});

test("cancel fails when bet is locked in", async () => {
  const t = convexTest(schema, modules);

  await seedTestData(t);

  const { code } = await t.mutation(api.lobbies.create, {
    sessionId: "host-session-cannotcancel",
    displayName: "HostCannotCancel",
  });

  await t.mutation(api.lobbies.join, {
    code,
    sessionId: "player-session-cannotcancel",
    displayName: "PlayerCannotCancel",
  });

  await t.mutation(api.lobbies.join, {
    code,
    sessionId: "spectator-session-cannotcancel",
    displayName: "SpectatorCantCancel",
  });

  const lobby = await t.query(api.lobbies.get, { code });

  await t.mutation(api.games.start, {
    lobbyId: lobby!._id,
    sessionId: "host-session-cannotcancel",
  });

  let turnPlayerSessionId: string | null = null;
  await t.run(async (ctx) => {
    const game = await ctx.db.query("games").first();
    if (game?.currentRoundId) {
      const round = await ctx.db.get(game.currentRoundId);
      if (round) {
        const player = await ctx.db.get(round.turnPlayerId);
        if (player) {
          turnPlayerSessionId = player.sessionId;
        }
      }
    }
  });

  expect(turnPlayerSessionId).not.toBeNull();

  if (turnPlayerSessionId === "spectator-session-cannotcancel") {
    return;
  }

  await t.mutation(api.bets.preview, {
    lobbyId: lobby!._id,
    sessionId: "spectator-session-cannotcancel",
    proposedIndex: 0,
  });

  await t.mutation(api.bets.lockIn, {
    lobbyId: lobby!._id,
    sessionId: "spectator-session-cannotcancel",
  });

  await expect(
    t.mutation(api.bets.cancel, {
      lobbyId: lobby!._id,
      sessionId: "spectator-session-cannotcancel",
    }),
  ).rejects.toThrow("Cannot cancel a locked bet");
});

test("cancel fails after round is resolved", async () => {
  const t = convexTest(schema, modules);

  await seedTestData(t);

  const { code } = await t.mutation(api.lobbies.create, {
    sessionId: "host-session-cancelresolved",
    displayName: "HostCancelResolved",
  });

  await t.mutation(api.lobbies.join, {
    code,
    sessionId: "player-session-cancelresolved",
    displayName: "PlayerCancelResolved",
  });

  await t.mutation(api.lobbies.join, {
    code,
    sessionId: "spectator-session-cancelresolved",
    displayName: "SpectatorCancelRes",
  });

  const lobby = await t.query(api.lobbies.get, { code });

  await t.mutation(api.games.start, {
    lobbyId: lobby!._id,
    sessionId: "host-session-cancelresolved",
  });

  const game = await t.query(api.games.getCurrent, { lobbyId: lobby!._id });

  await t.run(async (ctx) => {
    if (game?.currentRoundId) {
      await ctx.db.patch(game.currentRoundId, { phase: "betting" });
    }
  });

  let turnPlayerSessionId: string | null = null;
  await t.run(async (ctx) => {
    const game = await ctx.db.query("games").first();
    if (game?.currentRoundId) {
      const round = await ctx.db.get(game.currentRoundId);
      if (round) {
        const player = await ctx.db.get(round.turnPlayerId);
        if (player) {
          turnPlayerSessionId = player.sessionId;
        }
      }
    }
  });

  expect(turnPlayerSessionId).not.toBeNull();

  if (turnPlayerSessionId !== "spectator-session-cancelresolved") {
    await t.mutation(api.bets.preview, {
      lobbyId: lobby!._id,
      sessionId: "spectator-session-cancelresolved",
      proposedIndex: 0,
    });
  } else {
    return;
  }

  await t.run(async (ctx) => {
    if (game?.currentRoundId) {
      await ctx.db.patch(game.currentRoundId, { phase: "resolved" });
    }
  });

  await expect(
    t.mutation(api.bets.cancel, {
      lobbyId: lobby!._id,
      sessionId: "spectator-session-cancelresolved",
    }),
  ).rejects.toThrow("Cannot cancel bet after round is resolved");
});

test("preview works during betting phase", async () => {
  const t = convexTest(schema, modules);

  await seedTestData(t);

  const { code } = await t.mutation(api.lobbies.create, {
    sessionId: "host-session-betting",
    displayName: "HostBetting",
  });

  await t.mutation(api.lobbies.join, {
    code,
    sessionId: "player-session-betting",
    displayName: "PlayerBetting",
  });

  await t.mutation(api.lobbies.join, {
    code,
    sessionId: "spectator-session-betting",
    displayName: "SpectatorBetting",
  });

  const lobby = await t.query(api.lobbies.get, { code });

  await t.mutation(api.games.start, {
    lobbyId: lobby!._id,
    sessionId: "host-session-betting",
  });

  const game = await t.query(api.games.getCurrent, { lobbyId: lobby!._id });

  await t.run(async (ctx) => {
    if (game?.currentRoundId) {
      await ctx.db.patch(game.currentRoundId, { phase: "betting" });
    }
  });

  let turnPlayerSessionId: string | null = null;
  await t.run(async (ctx) => {
    const game = await ctx.db.query("games").first();
    if (game?.currentRoundId) {
      const round = await ctx.db.get(game.currentRoundId);
      if (round) {
        const player = await ctx.db.get(round.turnPlayerId);
        if (player) {
          turnPlayerSessionId = player.sessionId;
        }
      }
    }
  });

  expect(turnPlayerSessionId).not.toBeNull();

  if (turnPlayerSessionId !== "spectator-session-betting") {
    const result = await t.mutation(api.bets.preview, {
      lobbyId: lobby!._id,
      sessionId: "spectator-session-betting",
      proposedIndex: 0,
    });
    expect(result).toBeNull();
  } else {
    await expect(
      t.mutation(api.bets.preview, {
        lobbyId: lobby!._id,
        sessionId: "spectator-session-betting",
        proposedIndex: 0,
      }),
    ).rejects.toThrow("Turn player cannot place bets");
  }
});

test("preview works during placing phase", async () => {
  const t = convexTest(schema, modules);

  await seedTestData(t);

  const { code } = await t.mutation(api.lobbies.create, {
    sessionId: "host-session-placing",
    displayName: "HostPlacing",
  });

  await t.mutation(api.lobbies.join, {
    code,
    sessionId: "player-session-placing",
    displayName: "PlayerPlacing",
  });

  await t.mutation(api.lobbies.join, {
    code,
    sessionId: "spectator-session-placing",
    displayName: "SpectatorPlacing",
  });

  const lobby = await t.query(api.lobbies.get, { code });

  await t.mutation(api.games.start, {
    lobbyId: lobby!._id,
    sessionId: "host-session-placing",
  });

  let turnPlayerSessionId: string | null = null;
  await t.run(async (ctx) => {
    const game = await ctx.db.query("games").first();
    if (game?.currentRoundId) {
      const round = await ctx.db.get(game.currentRoundId);
      if (round) {
        const player = await ctx.db.get(round.turnPlayerId);
        if (player) {
          turnPlayerSessionId = player.sessionId;
        }
      }
    }
  });

  expect(turnPlayerSessionId).not.toBeNull();

  if (turnPlayerSessionId !== "spectator-session-placing") {
    const result = await t.mutation(api.bets.preview, {
      lobbyId: lobby!._id,
      sessionId: "spectator-session-placing",
      proposedIndex: 0,
    });
    expect(result).toBeNull();
  } else {
    await expect(
      t.mutation(api.bets.preview, {
        lobbyId: lobby!._id,
        sessionId: "spectator-session-placing",
        proposedIndex: 0,
      }),
    ).rejects.toThrow("Turn player cannot place bets");
  }
});

const modules = import.meta.glob("./**/*.ts");

test("listForRound returns all bets when showLiveBets is true", async () => {
  const t = convexTest(schema, modules);

  await seedTestData(t);

  const { code } = await t.mutation(api.lobbies.create, {
    sessionId: "host-session-listlive",
    displayName: "HostListLive",
  });

  await t.mutation(api.lobbies.join, {
    code,
    sessionId: "player-session-listlive",
    displayName: "PlayerListLive",
  });

  await t.mutation(api.lobbies.join, {
    code,
    sessionId: "spectator-session-listlive1",
    displayName: "SpectatorListLive1",
  });

  await t.mutation(api.lobbies.join, {
    code,
    sessionId: "spectator-session-listlive2",
    displayName: "SpectatorListLive2",
  });

  const lobby = await t.query(api.lobbies.get, { code });

  await t.mutation(api.games.start, {
    lobbyId: lobby!._id,
    sessionId: "host-session-listlive",
  });

  let turnPlayerSessionId: string | null = null;
  let nonTurnSessionId: string | null = null;
  await t.run(async (ctx) => {
    const game = await ctx.db.query("games").first();
    if (game?.currentRoundId) {
      const round = await ctx.db.get(game.currentRoundId);
      if (round) {
        const player = await ctx.db.get(round.turnPlayerId);
        if (player) {
          turnPlayerSessionId = player.sessionId;
          const players = await ctx.db.query("players").collect();
          nonTurnSessionId =
            players.find((p) => p.sessionId !== turnPlayerSessionId)?.sessionId || null;
        }
      }
    }
  });

  expect(turnPlayerSessionId).not.toBeNull();
  expect(nonTurnSessionId).not.toBeNull();

  if (nonTurnSessionId) {
    await t.mutation(api.bets.preview, {
      lobbyId: lobby!._id,
      sessionId: nonTurnSessionId,
      proposedIndex: 0,
    });

    const bets = await t.query(api.bets.listForRound, { lobbyId: lobby!._id });

    expect(bets).toHaveLength(1);
    expect(bets?.[0]?.lockedIn).toBe(false);
    expect(bets?.[0]?.playerDisplayName).toBeTruthy();
  }
});

test("listForRound returns only locked bets when showLiveBets is false", async () => {
  const t = convexTest(schema, modules);

  await seedTestData(t);

  const { code } = await t.mutation(api.lobbies.create, {
    sessionId: "host-session-nolive",
    displayName: "HostNoLive",
  });

  await t.mutation(api.lobbies.join, {
    code,
    sessionId: "player-session-nolive",
    displayName: "PlayerNoLive",
  });

  await t.mutation(api.lobbies.join, {
    code,
    sessionId: "spectator-session-nolive1",
    displayName: "SpectatorNoLive1",
  });

  await t.mutation(api.lobbies.join, {
    code,
    sessionId: "spectator-session-nolive2",
    displayName: "SpectatorNoLive2",
  });

  const lobby = await t.query(api.lobbies.get, { code });

  await t.mutation(api.lobbies.updateSettings, {
    code,
    sessionId: "host-session-nolive",
    settings: {
      targetTimelineSize: 10,
      startingCoins: 3,
      turnSeconds: 30,
      bettingWindowSeconds: 15,
      allowGuessTitleArtist: false,
      showLiveBets: false,
      allowBetRetraction: true,
      minYear: 1950,
      maxYear: 2024,
    },
  });

  await t.mutation(api.games.start, {
    lobbyId: lobby!._id,
    sessionId: "host-session-nolive",
  });

  let turnPlayerSessionId: string | null = null;
  let nonTurnSessions: string[] = [];
  await t.run(async (ctx) => {
    const game = await ctx.db.query("games").first();
    if (game?.currentRoundId) {
      const round = await ctx.db.get(game.currentRoundId);
      if (round) {
        const player = await ctx.db.get(round.turnPlayerId);
        if (player) {
          turnPlayerSessionId = player.sessionId;
          const allPlayers = await ctx.db.query("players").collect();
          nonTurnSessions = allPlayers
            .filter((p) => p.sessionId !== turnPlayerSessionId)
            .map((p) => p.sessionId);
        }
      }
    }
  });

  expect(turnPlayerSessionId).not.toBeNull();
  expect(nonTurnSessions.length).toBeGreaterThan(0);

  for (const sessionId of nonTurnSessions) {
    await t.mutation(api.bets.preview, {
      lobbyId: lobby!._id,
      sessionId,
      proposedIndex: 0,
    });
  }

  const betsBeforeLock = await t.query(api.bets.listForRound, {
    lobbyId: lobby!._id,
  });
  expect(betsBeforeLock).toHaveLength(0);

  for (const sessionId of nonTurnSessions) {
    await t.mutation(api.bets.lockIn, {
      lobbyId: lobby!._id,
      sessionId,
    });
  }

  const betsAfterLock = await t.query(api.bets.listForRound, {
    lobbyId: lobby!._id,
  });

  expect(betsAfterLock).toHaveLength(nonTurnSessions.length);
  expect(betsAfterLock?.every((bet) => bet.lockedIn === true)).toBe(true);
  expect(betsAfterLock?.every((bet) => bet.playerDisplayName)).toBeTruthy();
});

test("listForRound returns empty array when no bets exist", async () => {
  const t = convexTest(schema, modules);

  await seedTestData(t);

  const { code } = await t.mutation(api.lobbies.create, {
    sessionId: "host-session-nobets",
    displayName: "HostNoBets",
  });

  await t.mutation(api.lobbies.join, {
    code,
    sessionId: "player-session-nobets",
    displayName: "PlayerNoBets",
  });

  const lobby = await t.query(api.lobbies.get, { code });

  await t.mutation(api.games.start, {
    lobbyId: lobby!._id,
    sessionId: "host-session-nobets",
  });

  const bets = await t.query(api.bets.listForRound, { lobbyId: lobby!._id });

  expect(bets).toHaveLength(0);
});

test("listForRound returns empty array when no active game", async () => {
  const t = convexTest(schema, modules);

  const { code } = await t.mutation(api.lobbies.create, {
    sessionId: "host-session-nogame",
    displayName: "HostNoGame",
  });

  await t.mutation(api.lobbies.join, {
    code,
    sessionId: "player-session-nogame",
    displayName: "PlayerNoGame",
  });

  const lobby = await t.query(api.lobbies.get, { code });

  const bets = await t.query(api.bets.listForRound, { lobbyId: lobby!._id });

  expect(bets).toHaveLength(0);
});
