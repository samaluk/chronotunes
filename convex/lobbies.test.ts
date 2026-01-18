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

test("join lobby adds player to existing lobby", async () => {
  const t = convexTest(schema, modules);

  const { code } = await t.mutation(api.lobbies.create, {
    sessionId: "host-session",
    displayName: "HostPlayer",
  });

  await t.mutation(api.lobbies.join, {
    code,
    sessionId: "player-session",
    displayName: "NewPlayer",
  });

  const players = await t.run(async (ctx) => {
    const allPlayers = await ctx.db.query("players").collect();
    return allPlayers;
  });

  expect(players).toHaveLength(2);
  const newPlayer = players.find((p) => p.sessionId === "player-session");
  expect(newPlayer).not.toBeUndefined();
  expect(newPlayer?.displayName).toBe("NewPlayer");
  expect(newPlayer?.isHost).toBe(false);
  expect(newPlayer?.coins).toBe(3);
});

test("join lobby returns lobby id", async () => {
  const t = convexTest(schema, modules);

  const { code } = await t.mutation(api.lobbies.create, {
    sessionId: "host-session-return",
    displayName: "HostReturn",
  });

  const result = await t.mutation(api.lobbies.join, {
    code,
    sessionId: "player-session-return",
    displayName: "PlayerReturn",
  });

  expect(result.lobbyId).toBeDefined();
});

test("join lobby rejects invalid code", async () => {
  const t = convexTest(schema, modules);

  await expect(
    t.mutation(api.lobbies.join, {
      code: "INVALID",
      sessionId: "player-session",
      displayName: "Player",
    }),
  ).rejects.toThrow("Lobby not found");
});

test("join lobby rejects empty display name", async () => {
  const t = convexTest(schema, modules);

  const { code } = await t.mutation(api.lobbies.create, {
    sessionId: "host-session-empty",
    displayName: "HostEmpty",
  });

  await expect(
    t.mutation(api.lobbies.join, {
      code,
      sessionId: "player-session-empty",
      displayName: "",
    }),
  ).rejects.toThrow();
});

test("join lobby rejects display name too long", async () => {
  const t = convexTest(schema, modules);

  const { code } = await t.mutation(api.lobbies.create, {
    sessionId: "host-session-long",
    displayName: "HostLong",
  });

  await expect(
    t.mutation(api.lobbies.join, {
      code,
      sessionId: "player-session-long",
      displayName: "ThisDisplayNameIsWayTooLongToBeValid",
    }),
  ).rejects.toThrow();
});

test("join lobby rejects when session already in lobby", async () => {
  const t = convexTest(schema, modules);

  const { code } = await t.mutation(api.lobbies.create, {
    sessionId: "host-session-dup",
    displayName: "HostDup",
  });

  await t.mutation(api.lobbies.join, {
    code,
    sessionId: "player-session-dup",
    displayName: "AlreadyJoined",
  });

  await expect(
    t.mutation(api.lobbies.join, {
      code,
      sessionId: "player-session-dup",
      displayName: "Again",
    }),
  ).rejects.toThrow("You are already in this lobby");
});

test("join lobby rejects when lobby status is in_game", async () => {
  const t = convexTest(schema, modules);

  const { code } = await t.mutation(api.lobbies.create, {
    sessionId: "host-session-game",
    displayName: "HostGame",
  });

  await t.run(async (ctx) => {
    const lobby = await ctx.db.query("lobbies").first();
    if (lobby) {
      await ctx.db.patch(lobby._id, { status: "in_game" });
    }
  });

  await expect(
    t.mutation(api.lobbies.join, {
      code,
      sessionId: "player-session-game",
      displayName: "PlayerGame",
    }),
  ).rejects.toThrow("Cannot join lobby that is not in lobby status");
});

test("join lobby is case insensitive for code", async () => {
  const t = convexTest(schema, modules);

  const { code } = await t.mutation(api.lobbies.create, {
    sessionId: "host-session-case",
    displayName: "HostCase",
  });

  const lowerCode = code.toLowerCase();

  await t.mutation(api.lobbies.join, {
    code: lowerCode,
    sessionId: "player-session-case",
    displayName: "PlayerCase",
  });

  const players = await t.run(async (ctx) => {
    const allPlayers = await ctx.db.query("players").collect();
    return allPlayers;
  });

  expect(players).toHaveLength(2);
});

test("join lobby uses lobby's starting coins setting", async () => {
  const t = convexTest(schema, modules);

  const { code } = await t.mutation(api.lobbies.create, {
    sessionId: "host-session-coins",
    displayName: "HostCoins",
  });

  await t.run(async (ctx) => {
    const lobby = await ctx.db.query("lobbies").first();
    if (lobby) {
      await ctx.db.patch(lobby._id, { settings: { ...lobby.settings, startingCoins: 5 } });
    }
  });

  await t.mutation(api.lobbies.join, {
    code,
    sessionId: "player-session-coins",
    displayName: "PlayerCoins",
  });

  const players = await t.run(async (ctx) => {
    const allPlayers = await ctx.db.query("players").collect();
    return allPlayers;
  });

  const newPlayer = players.find((p) => p.sessionId === "player-session-coins");
  expect(newPlayer?.coins).toBe(5);
});

test("leave lobby removes player from lobby", async () => {
  const t = convexTest(schema, modules);

  const { code } = await t.mutation(api.lobbies.create, {
    sessionId: "host-session-leave",
    displayName: "HostLeave",
  });

  await t.mutation(api.lobbies.join, {
    code,
    sessionId: "player-session-leave",
    displayName: "PlayerLeave",
  });

  let players = await t.run(async (ctx) => {
    const allPlayers = await ctx.db.query("players").collect();
    return allPlayers;
  });
  expect(players).toHaveLength(2);

  await t.mutation(api.lobbies.leave, {
    code,
    sessionId: "player-session-leave",
  });

  players = await t.run(async (ctx) => {
    const allPlayers = await ctx.db.query("players").collect();
    return allPlayers;
  });
  expect(players).toHaveLength(1);
  expect(players[0]?.sessionId).toBe("host-session-leave");
});

test("leave lobby rejects when player not in lobby", async () => {
  const t = convexTest(schema, modules);

  const { code } = await t.mutation(api.lobbies.create, {
    sessionId: "host-session-not-in",
    displayName: "HostNotIn",
  });

  await expect(
    t.mutation(api.lobbies.leave, {
      code,
      sessionId: "random-session-not-in",
    }),
  ).rejects.toThrow("You are not in this lobby");
});

test("leave lobby rejects when lobby not found", async () => {
  const t = convexTest(schema, modules);

  await expect(
    t.mutation(api.lobbies.leave, {
      code: "NOTFOUND",
      sessionId: "some-session",
    }),
  ).rejects.toThrow("Lobby not found");
});

test("leave lobby transfers host when host leaves and players remain", async () => {
  const t = convexTest(schema, modules);

  const { code } = await t.mutation(api.lobbies.create, {
    sessionId: "host-session-transfer",
    displayName: "HostTransfer",
  });

  await t.mutation(api.lobbies.join, {
    code,
    sessionId: "player-session-transfer",
    displayName: "PlayerTransfer",
  });

  await t.mutation(api.lobbies.leave, {
    code,
    sessionId: "host-session-transfer",
  });

  const players = await t.run(async (ctx) => {
    const allPlayers = await ctx.db.query("players").collect();
    return allPlayers;
  });
  expect(players).toHaveLength(1);
  expect(players[0]?.isHost).toBe(true);
  expect(players[0]?.sessionId).toBe("player-session-transfer");

  const lobby = await t.run(async (ctx) => {
    const lobbies = await ctx.db.query("lobbies").collect();
    return lobbies[0];
  });
  expect(lobby?.hostSessionId).toBe("player-session-transfer");
});

test("leave lobby deletes lobby when last player leaves", async () => {
  const t = convexTest(schema, modules);

  const { code } = await t.mutation(api.lobbies.create, {
    sessionId: "host-session-delete",
    displayName: "HostDelete",
  });

  await t.mutation(api.lobbies.leave, {
    code,
    sessionId: "host-session-delete",
  });

  const lobbies = await t.run(async (ctx) => {
    const allLobbies = await ctx.db.query("lobbies").collect();
    return allLobbies;
  });
  expect(lobbies).toHaveLength(0);

  const players = await t.run(async (ctx) => {
    const allPlayers = await ctx.db.query("players").collect();
    return allPlayers;
  });
  expect(players).toHaveLength(0);
});

test("leave lobby is case insensitive for code", async () => {
  const t = convexTest(schema, modules);

  const { code } = await t.mutation(api.lobbies.create, {
    sessionId: "host-session-case-leave",
    displayName: "HostCaseLeave",
  });

  await t.mutation(api.lobbies.join, {
    code,
    sessionId: "player-session-case-leave",
    displayName: "PlayerCaseLeave",
  });

  await t.mutation(api.lobbies.leave, {
    code: code.toLowerCase(),
    sessionId: "player-session-case-leave",
  });

  const players = await t.run(async (ctx) => {
    const allPlayers = await ctx.db.query("players").collect();
    return allPlayers;
  });
  expect(players).toHaveLength(1);
});

test("leave lobby works when non-host leaves", async () => {
  const t = convexTest(schema, modules);

  const { code } = await t.mutation(api.lobbies.create, {
    sessionId: "host-session-nonhost",
    displayName: "HostNonHost",
  });

  await t.mutation(api.lobbies.join, {
    code,
    sessionId: "player-session-nonhost",
    displayName: "PlayerNonHost",
  });

  await t.mutation(api.lobbies.join, {
    code,
    sessionId: "player-session-nonhost2",
    displayName: "PlayerNonHost2",
  });

  await t.mutation(api.lobbies.leave, {
    code,
    sessionId: "player-session-nonhost",
  });

  const players = await t.run(async (ctx) => {
    const allPlayers = await ctx.db.query("players").collect();
    return allPlayers;
  });
  expect(players).toHaveLength(2);
  const host = players.find((p) => p.isHost);
  expect(host?.sessionId).toBe("host-session-nonhost");
});

test("get lobby returns lobby by code", async () => {
  const t = convexTest(schema, modules);

  const { code } = await t.mutation(api.lobbies.create, {
    sessionId: "get-session-host",
    displayName: "GetHost",
  });

  const lobby = await t.query(api.lobbies.get, { code });

  expect(lobby).not.toBeNull();
  expect(lobby?.code).toBe(code);
  expect(lobby?.status).toBe("lobby");
  expect(lobby?.hostSessionId).toBe("get-session-host");
});

test("get lobby returns null for invalid code", async () => {
  const t = convexTest(schema, modules);

  const lobby = await t.query(api.lobbies.get, { code: "INVALID" });

  expect(lobby).toBeNull();
});

test("get lobby is case insensitive for code", async () => {
  const t = convexTest(schema, modules);

  const { code } = await t.mutation(api.lobbies.create, {
    sessionId: "get-case-session-host",
    displayName: "GetCaseHost",
  });

  const lowerLobby = await t.query(api.lobbies.get, { code: code.toLowerCase() });
  const upperLobby = await t.query(api.lobbies.get, { code: code.toUpperCase() });

  expect(lowerLobby).not.toBeNull();
  expect(upperLobby).not.toBeNull();
  expect(lowerLobby?._id).toBe(upperLobby?._id);
});

test("get lobby returns lobby with settings", async () => {
  const t = convexTest(schema, modules);

  const { code } = await t.mutation(api.lobbies.create, {
    sessionId: "get-settings-host",
    displayName: "GetSettingsHost",
  });

  const lobby = await t.query(api.lobbies.get, { code });

  expect(lobby).not.toBeNull();
  expect(lobby?.settings).toBeDefined();
  expect(lobby?.settings.targetTimelineSize).toBe(10);
  expect(lobby?.settings.startingCoins).toBe(3);
  expect(lobby?.settings.turnSeconds).toBe(30);
  expect(lobby?.settings.bettingWindowSeconds).toBe(15);
});

test("updateSettings allows host to update targetTimelineSize", async () => {
  const t = convexTest(schema, modules);

  const { code } = await t.mutation(api.lobbies.create, {
    sessionId: "host-session-update",
    displayName: "HostUpdate",
  });

  await t.mutation(api.lobbies.updateSettings, {
    code,
    sessionId: "host-session-update",
    settings: {
      targetTimelineSize: 8,
      startingCoins: 3,
      turnSeconds: 30,
      bettingWindowSeconds: 15,
      allowGuessTitleArtist: true,
      showLiveBets: true,
      allowBetRetraction: true,
      minYear: 1950,
      maxYear: 2025,
    },
  });

  const lobby = await t.query(api.lobbies.get, { code });
  expect(lobby?.settings.targetTimelineSize).toBe(8);
});

test("updateSettings allows host to update startingCoins", async () => {
  const t = convexTest(schema, modules);

  const { code } = await t.mutation(api.lobbies.create, {
    sessionId: "host-session-coins",
    displayName: "HostCoins",
  });

  await t.mutation(api.lobbies.updateSettings, {
    code,
    sessionId: "host-session-coins",
    settings: {
      targetTimelineSize: 10,
      startingCoins: 5,
      turnSeconds: 30,
      bettingWindowSeconds: 15,
      allowGuessTitleArtist: true,
      showLiveBets: true,
      allowBetRetraction: true,
      minYear: 1950,
      maxYear: 2025,
    },
  });

  const lobby = await t.query(api.lobbies.get, { code });
  expect(lobby?.settings.startingCoins).toBe(5);
});

test("updateSettings allows host to update turnSeconds", async () => {
  const t = convexTest(schema, modules);

  const { code } = await t.mutation(api.lobbies.create, {
    sessionId: "host-session-turn",
    displayName: "HostTurn",
  });

  await t.mutation(api.lobbies.updateSettings, {
    code,
    sessionId: "host-session-turn",
    settings: {
      targetTimelineSize: 10,
      startingCoins: 3,
      turnSeconds: 60,
      bettingWindowSeconds: 15,
      allowGuessTitleArtist: true,
      showLiveBets: true,
      allowBetRetraction: true,
      minYear: 1950,
      maxYear: 2025,
    },
  });

  const lobby = await t.query(api.lobbies.get, { code });
  expect(lobby?.settings.turnSeconds).toBe(60);
});

test("updateSettings allows host to update year range", async () => {
  const t = convexTest(schema, modules);

  const { code } = await t.mutation(api.lobbies.create, {
    sessionId: "host-session-years",
    displayName: "HostYears",
  });

  await t.mutation(api.lobbies.updateSettings, {
    code,
    sessionId: "host-session-years",
    settings: {
      targetTimelineSize: 10,
      startingCoins: 3,
      turnSeconds: 30,
      bettingWindowSeconds: 15,
      allowGuessTitleArtist: true,
      showLiveBets: true,
      allowBetRetraction: true,
      minYear: 1960,
      maxYear: 2020,
    },
  });

  const lobby = await t.query(api.lobbies.get, { code });
  expect(lobby?.settings.minYear).toBe(1960);
  expect(lobby?.settings.maxYear).toBe(2020);
});

test("updateSettings rejects non-host", async () => {
  const t = convexTest(schema, modules);

  const { code } = await t.mutation(api.lobbies.create, {
    sessionId: "host-session-reject",
    displayName: "HostReject",
  });

  await t.mutation(api.lobbies.join, {
    code,
    sessionId: "player-session-reject",
    displayName: "PlayerReject",
  });

  await expect(
    t.mutation(api.lobbies.updateSettings, {
      code,
      sessionId: "player-session-reject",
      settings: {
        targetTimelineSize: 10,
        startingCoins: 3,
        turnSeconds: 30,
        bettingWindowSeconds: 15,
        allowGuessTitleArtist: true,
        showLiveBets: true,
        allowBetRetraction: true,
        minYear: 1950,
        maxYear: 2025,
      },
    }),
  ).rejects.toThrow("Only the host can update settings");
});

test("updateSettings rejects targetTimelineSize below 5", async () => {
  const t = convexTest(schema, modules);

  const { code } = await t.mutation(api.lobbies.create, {
    sessionId: "host-session-min",
    displayName: "HostMin",
  });

  await expect(
    t.mutation(api.lobbies.updateSettings, {
      code,
      sessionId: "host-session-min",
      settings: {
        targetTimelineSize: 4,
        startingCoins: 3,
        turnSeconds: 30,
        bettingWindowSeconds: 15,
        allowGuessTitleArtist: true,
        showLiveBets: true,
        allowBetRetraction: true,
        minYear: 1950,
        maxYear: 2025,
      },
    }),
  ).rejects.toThrow("Target timeline size must be between 5 and 15");
});

test("updateSettings rejects targetTimelineSize above 15", async () => {
  const t = convexTest(schema, modules);

  const { code } = await t.mutation(api.lobbies.create, {
    sessionId: "host-session-max",
    displayName: "HostMax",
  });

  await expect(
    t.mutation(api.lobbies.updateSettings, {
      code,
      sessionId: "host-session-max",
      settings: {
        targetTimelineSize: 16,
        startingCoins: 3,
        turnSeconds: 30,
        bettingWindowSeconds: 15,
        allowGuessTitleArtist: true,
        showLiveBets: true,
        allowBetRetraction: true,
        minYear: 1950,
        maxYear: 2025,
      },
    }),
  ).rejects.toThrow("Target timeline size must be between 5 and 15");
});

test("updateSettings rejects startingCoins below 1", async () => {
  const t = convexTest(schema, modules);

  const { code } = await t.mutation(api.lobbies.create, {
    sessionId: "host-session-coins-min",
    displayName: "HostCoinsMin",
  });

  await expect(
    t.mutation(api.lobbies.updateSettings, {
      code,
      sessionId: "host-session-coins-min",
      settings: {
        targetTimelineSize: 10,
        startingCoins: 0,
        turnSeconds: 30,
        bettingWindowSeconds: 15,
        allowGuessTitleArtist: true,
        showLiveBets: true,
        allowBetRetraction: true,
        minYear: 1950,
        maxYear: 2025,
      },
    }),
  ).rejects.toThrow("Starting coins must be between 1 and 10");
});

test("updateSettings rejects startingCoins above 10", async () => {
  const t = convexTest(schema, modules);

  const { code } = await t.mutation(api.lobbies.create, {
    sessionId: "host-session-coins-max",
    displayName: "HostCoinsMax",
  });

  await expect(
    t.mutation(api.lobbies.updateSettings, {
      code,
      sessionId: "host-session-coins-max",
      settings: {
        targetTimelineSize: 10,
        startingCoins: 11,
        turnSeconds: 30,
        bettingWindowSeconds: 15,
        allowGuessTitleArtist: true,
        showLiveBets: true,
        allowBetRetraction: true,
        minYear: 1950,
        maxYear: 2025,
      },
    }),
  ).rejects.toThrow("Starting coins must be between 1 and 10");
});

test("updateSettings rejects turnSeconds below 15", async () => {
  const t = convexTest(schema, modules);

  const { code } = await t.mutation(api.lobbies.create, {
    sessionId: "host-session-turn-min",
    displayName: "HostTurnMin",
  });

  await expect(
    t.mutation(api.lobbies.updateSettings, {
      code,
      sessionId: "host-session-turn-min",
      settings: {
        targetTimelineSize: 10,
        startingCoins: 3,
        turnSeconds: 14,
        bettingWindowSeconds: 15,
        allowGuessTitleArtist: true,
        showLiveBets: true,
        allowBetRetraction: true,
        minYear: 1950,
        maxYear: 2025,
      },
    }),
  ).rejects.toThrow("Turn seconds must be between 15 and 120");
});

test("updateSettings rejects turnSeconds above 120", async () => {
  const t = convexTest(schema, modules);

  const { code } = await t.mutation(api.lobbies.create, {
    sessionId: "host-session-turn-max",
    displayName: "HostTurnMax",
  });

  await expect(
    t.mutation(api.lobbies.updateSettings, {
      code,
      sessionId: "host-session-turn-max",
      settings: {
        targetTimelineSize: 10,
        startingCoins: 3,
        turnSeconds: 121,
        bettingWindowSeconds: 15,
        allowGuessTitleArtist: true,
        showLiveBets: true,
        allowBetRetraction: true,
        minYear: 1950,
        maxYear: 2025,
      },
    }),
  ).rejects.toThrow("Turn seconds must be between 15 and 120");
});

test("updateSettings rejects bettingWindowSeconds below 5", async () => {
  const t = convexTest(schema, modules);

  const { code } = await t.mutation(api.lobbies.create, {
    sessionId: "host-session-bet-min",
    displayName: "HostBetMin",
  });

  await expect(
    t.mutation(api.lobbies.updateSettings, {
      code,
      sessionId: "host-session-bet-min",
      settings: {
        targetTimelineSize: 10,
        startingCoins: 3,
        turnSeconds: 30,
        bettingWindowSeconds: 4,
        allowGuessTitleArtist: true,
        showLiveBets: true,
        allowBetRetraction: true,
        minYear: 1950,
        maxYear: 2025,
      },
    }),
  ).rejects.toThrow("Betting window seconds must be between 5 and 60");
});

test("updateSettings rejects bettingWindowSeconds above 60", async () => {
  const t = convexTest(schema, modules);

  const { code } = await t.mutation(api.lobbies.create, {
    sessionId: "host-session-bet-max",
    displayName: "HostBetMax",
  });

  await expect(
    t.mutation(api.lobbies.updateSettings, {
      code,
      sessionId: "host-session-bet-max",
      settings: {
        targetTimelineSize: 10,
        startingCoins: 3,
        turnSeconds: 30,
        bettingWindowSeconds: 61,
        allowGuessTitleArtist: true,
        showLiveBets: true,
        allowBetRetraction: true,
        minYear: 1950,
        maxYear: 2025,
      },
    }),
  ).rejects.toThrow("Betting window seconds must be between 5 and 60");
});

test("updateSettings rejects minYear below 1900", async () => {
  const t = convexTest(schema, modules);

  const { code } = await t.mutation(api.lobbies.create, {
    sessionId: "host-session-year-min",
    displayName: "HostYearMin",
  });

  await expect(
    t.mutation(api.lobbies.updateSettings, {
      code,
      sessionId: "host-session-year-min",
      settings: {
        targetTimelineSize: 10,
        startingCoins: 3,
        turnSeconds: 30,
        bettingWindowSeconds: 15,
        allowGuessTitleArtist: true,
        showLiveBets: true,
        allowBetRetraction: true,
        minYear: 1899,
        maxYear: 2025,
      },
    }),
  ).rejects.toThrow("Invalid minimum year");
});

test("updateSettings rejects minYear above maxYear", async () => {
  const t = convexTest(schema, modules);

  const { code } = await t.mutation(api.lobbies.create, {
    sessionId: "host-session-year-range",
    displayName: "HostYearRange",
  });

  await expect(
    t.mutation(api.lobbies.updateSettings, {
      code,
      sessionId: "host-session-year-range",
      settings: {
        targetTimelineSize: 10,
        startingCoins: 3,
        turnSeconds: 30,
        bettingWindowSeconds: 15,
        allowGuessTitleArtist: true,
        showLiveBets: true,
        allowBetRetraction: true,
        minYear: 2020,
        maxYear: 2010,
      },
    }),
  ).rejects.toThrow("Invalid minimum year");
});

test("updateSettings rejects maxYear below minYear", async () => {
  const t = convexTest(schema, modules);

  const { code } = await t.mutation(api.lobbies.create, {
    sessionId: "host-session-max-min",
    displayName: "HostMaxMin",
  });

  await expect(
    t.mutation(api.lobbies.updateSettings, {
      code,
      sessionId: "host-session-max-min",
      settings: {
        targetTimelineSize: 10,
        startingCoins: 3,
        turnSeconds: 30,
        bettingWindowSeconds: 15,
        allowGuessTitleArtist: true,
        showLiveBets: true,
        allowBetRetraction: true,
        minYear: 1950,
        maxYear: 1940,
      },
    }),
  ).rejects.toThrow("Invalid minimum year");
});

test("updateSettings rejects maxYear above 2030", async () => {
  const t = convexTest(schema, modules);

  const { code } = await t.mutation(api.lobbies.create, {
    sessionId: "host-session-max-future",
    displayName: "HostMaxFuture",
  });

  await expect(
    t.mutation(api.lobbies.updateSettings, {
      code,
      sessionId: "host-session-max-future",
      settings: {
        targetTimelineSize: 10,
        startingCoins: 3,
        turnSeconds: 30,
        bettingWindowSeconds: 15,
        allowGuessTitleArtist: true,
        showLiveBets: true,
        allowBetRetraction: true,
        minYear: 1950,
        maxYear: 2031,
      },
    }),
  ).rejects.toThrow("Invalid maximum year");
});

test("updateSettings rejects when lobby not found", async () => {
  const t = convexTest(schema, modules);

  await expect(
    t.mutation(api.lobbies.updateSettings, {
      code: "NOTFOUND",
      sessionId: "some-session",
      settings: {
        targetTimelineSize: 10,
        startingCoins: 3,
        turnSeconds: 30,
        bettingWindowSeconds: 15,
        allowGuessTitleArtist: true,
        showLiveBets: true,
        allowBetRetraction: true,
        minYear: 1950,
        maxYear: 2025,
      },
    }),
  ).rejects.toThrow("Lobby not found");
});

test("updateSettings rejects when lobby status is in_game", async () => {
  const t = convexTest(schema, modules);

  const { code } = await t.mutation(api.lobbies.create, {
    sessionId: "host-session-game",
    displayName: "HostGame",
  });

  await t.run(async (ctx) => {
    const lobby = await ctx.db.query("lobbies").first();
    if (lobby) {
      await ctx.db.patch(lobby._id, { status: "in_game" });
    }
  });

  await expect(
    t.mutation(api.lobbies.updateSettings, {
      code,
      sessionId: "host-session-game",
      settings: {
        targetTimelineSize: 10,
        startingCoins: 3,
        turnSeconds: 30,
        bettingWindowSeconds: 15,
        allowGuessTitleArtist: true,
        showLiveBets: true,
        allowBetRetraction: true,
        minYear: 1950,
        maxYear: 2025,
      },
    }),
  ).rejects.toThrow("Cannot update settings for a lobby that is not in lobby status");
});

test("updateSettings is case insensitive for code", async () => {
  const t = convexTest(schema, modules);

  const { code } = await t.mutation(api.lobbies.create, {
    sessionId: "host-session-case",
    displayName: "HostCase",
  });

  await t.mutation(api.lobbies.updateSettings, {
    code: code.toLowerCase(),
    sessionId: "host-session-case",
    settings: {
      targetTimelineSize: 12,
      startingCoins: 3,
      turnSeconds: 30,
      bettingWindowSeconds: 15,
      allowGuessTitleArtist: true,
      showLiveBets: true,
      allowBetRetraction: true,
      minYear: 1950,
      maxYear: 2025,
    },
  });

  const lobby = await t.query(api.lobbies.get, { code: code.toUpperCase() });
  expect(lobby?.settings.targetTimelineSize).toBe(12);
});

test("updateSettings allows host to toggle boolean settings", async () => {
  const t = convexTest(schema, modules);

  const { code } = await t.mutation(api.lobbies.create, {
    sessionId: "host-session-bool",
    displayName: "HostBool",
  });

  await t.mutation(api.lobbies.updateSettings, {
    code,
    sessionId: "host-session-bool",
    settings: {
      targetTimelineSize: 10,
      startingCoins: 3,
      turnSeconds: 30,
      bettingWindowSeconds: 15,
      allowGuessTitleArtist: false,
      showLiveBets: false,
      allowBetRetraction: false,
      minYear: 1950,
      maxYear: 2025,
    },
  });

  const lobby = await t.query(api.lobbies.get, { code });
  expect(lobby?.settings.allowGuessTitleArtist).toBe(false);
  expect(lobby?.settings.showLiveBets).toBe(false);
  expect(lobby?.settings.allowBetRetraction).toBe(false);
});

const modules = import.meta.glob("./**/*.ts");
