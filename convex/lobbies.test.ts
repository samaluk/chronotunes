import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";

import { api } from "./_generated/api";
import { asSessionId } from "./lib/sessions";
import schema from "./schema";
import { modules } from "./test.setup";

const LOBBY_CODE_REGEX = /^[A-Z23456789]+$/;

describe("lobbies", () => {
  test("create lobby generates 6-char code", async () => {
    const t = convexTest(schema, modules);
    const result = await t.mutation(api.lobbies.create, {
      displayName: "TestHost",
      sessionId: asSessionId("test-session-123"),
    });
    expect(result.code).toHaveLength(6);
  });

  test("create lobby returns alphanumeric code only", async () => {
    const t = convexTest(schema, modules);
    const result = await t.mutation(api.lobbies.create, {
      displayName: "AnotherHost",
      sessionId: asSessionId("test-session-456"),
    });
    expect(result.code).toMatch(LOBBY_CODE_REGEX);
  });

  test("create lobby creates lobby with status lobby", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(api.lobbies.create, {
      displayName: "StatusHost",
      sessionId: asSessionId("test-session-789"),
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
      displayName: "HostPlayer",
      sessionId: asSessionId("test-session-host"),
    });

    const players = await t.run(async (ctx) => {
      const allPlayers = await ctx.db.query("players").collect();
      return allPlayers;
    });

    expect(players).toHaveLength(1);
    expect(players[0]?.isHost).toBe(true);
    expect(players[0]?.displayName).toBe("HostPlayer");
  });

  test("create lobby creates host with zero coins until game starts", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(api.lobbies.create, {
      displayName: "CoinsHost",
      sessionId: asSessionId("test-session-coins"),
    });

    const players = await t.run(async (ctx) => {
      const allPlayers = await ctx.db.query("players").collect();
      return allPlayers;
    });

    expect(players[0]?.coins).toBe(0);
  });

  test("create lobby rejects empty display name", async () => {
    const t = convexTest(schema, modules);
    await expect(
      t.mutation(api.lobbies.create, {
        displayName: "",
        sessionId: asSessionId("test-session-empty"),
      }),
    ).rejects.toThrow("Display name must be between 1 and 20 characters");
  });

  test("create lobby rejects display name too long", async () => {
    const t = convexTest(schema, modules);
    await expect(
      t.mutation(api.lobbies.create, {
        displayName: "A".repeat(51),
        sessionId: asSessionId("test-session-long"),
      }),
    ).rejects.toThrow("Display name must be between 1 and 20 characters");
  });

  test("create lobby generates unique codes", async () => {
    const t = convexTest(schema, modules);
    const result1 = await t.mutation(api.lobbies.create, {
      displayName: "Host1",
      sessionId: asSessionId("unique-session-1"),
    });
    const result2 = await t.mutation(api.lobbies.create, {
      displayName: "Host2",
      sessionId: asSessionId("unique-session-2"),
    });
    expect(result1.code).not.toBe(result2.code);
  });

  test("join lobby adds player to existing lobby", async () => {
    const t = convexTest(schema, modules);
    const { code } = await t.mutation(api.lobbies.create, {
      displayName: "JoinHost",
      sessionId: asSessionId("join-host-session"),
    });

    await t.mutation(api.lobbies.join, {
      code,
      displayName: "JoinPlayer",
      sessionId: asSessionId("join-player-session"),
    });

    const players = await t.run(async (ctx) => {
      const allPlayers = await ctx.db.query("players").collect();
      return allPlayers;
    });

    expect(players).toHaveLength(2);
  });

  test("join lobby returns lobby id", async () => {
    const t = convexTest(schema, modules);
    const { code } = await t.mutation(api.lobbies.create, {
      displayName: "JoinIdHost",
      sessionId: asSessionId("join-id-host"),
    });

    const result = await t.mutation(api.lobbies.join, {
      code,
      displayName: "JoinIdPlayer",
      sessionId: asSessionId("join-id-player"),
    });

    expect(result.lobbyId).toBeDefined();
  });

  test("join lobby rejects invalid code", async () => {
    const t = convexTest(schema, modules);
    await expect(
      t.mutation(api.lobbies.join, {
        code: "INVALID",
        displayName: "InvalidPlayer",
        sessionId: asSessionId("invalid-session"),
      }),
    ).rejects.toThrow("Lobby not found");
  });

  test("join lobby rejects empty display name", async () => {
    const t = convexTest(schema, modules);
    const { code } = await t.mutation(api.lobbies.create, {
      displayName: "Host",
      sessionId: asSessionId("empty-display-host"),
    });

    await expect(
      t.mutation(api.lobbies.join, {
        code,
        displayName: "",
        sessionId: asSessionId("empty-display-session"),
      }),
    ).rejects.toThrow("Display name must be between 1 and 20 characters");
  });

  test("join lobby rejects display name too long", async () => {
    const t = convexTest(schema, modules);
    const { code } = await t.mutation(api.lobbies.create, {
      displayName: "Host",
      sessionId: asSessionId("long-name-host"),
    });

    await expect(
      t.mutation(api.lobbies.join, {
        code,
        displayName: "A".repeat(51),
        sessionId: asSessionId("long-name-session"),
      }),
    ).rejects.toThrow("Display name must be between 1 and 20 characters");
  });

  test("join lobby rejects when session already in lobby", async () => {
    const t = convexTest(schema, modules);
    const { code } = await t.mutation(api.lobbies.create, {
      displayName: "Host",
      sessionId: asSessionId("duplicate-session"),
    });

    await expect(
      t.mutation(api.lobbies.join, {
        code,
        displayName: "Player",
        sessionId: asSessionId("duplicate-session"),
      }),
    ).rejects.toThrow("You are already in this lobby");
  });

  test("join lobby rejects when lobby status is in_game", async () => {
    const t = convexTest(schema, modules);
    const { code } = await t.mutation(api.lobbies.create, {
      displayName: "Host",
      sessionId: asSessionId("game-host"),
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
        displayName: "Player",
        sessionId: asSessionId("game-player"),
      }),
    ).rejects.toThrow("Cannot join lobby that is not in lobby status");
  });

  test("join lobby is case insensitive for code", async () => {
    const t = convexTest(schema, modules);
    const { code } = await t.mutation(api.lobbies.create, {
      displayName: "Host",
      sessionId: asSessionId("case-host"),
    });

    const upperCode = code.toUpperCase();
    const lowerCode = code.toLowerCase();

    const result1 = await t.mutation(api.lobbies.join, {
      code: upperCode,
      displayName: "Player1",
      sessionId: asSessionId("case-player-1"),
    });
    const result2 = await t.mutation(api.lobbies.join, {
      code: lowerCode,
      displayName: "Player2",
      sessionId: asSessionId("case-player-2"),
    });

    expect(result1.lobbyId).toBe(result2.lobbyId);
  });

  test("join lobby creates player with zero coins until game starts", async () => {
    const t = convexTest(schema, modules);
    const { code } = await t.mutation(api.lobbies.create, {
      displayName: "Host",
      sessionId: asSessionId("coins-host"),
    });

    await t.mutation(api.lobbies.join, {
      code,
      displayName: "Player",
      sessionId: asSessionId("coins-player"),
    });

    const player = await t.run(async (ctx) => {
      const player = await ctx.db
        .query("players")
        .filter((q) => q.eq(q.field("sessionId"), "coins-player"))
        .first();
      return player;
    });

    expect(player?.coins).toBe(0);
  });

  test("leave lobby removes player from lobby", async () => {
    const t = convexTest(schema, modules);
    const { code } = await t.mutation(api.lobbies.create, {
      displayName: "Host",
      sessionId: asSessionId("leave-host"),
    });

    await t.mutation(api.lobbies.join, {
      code,
      displayName: "Player",
      sessionId: asSessionId("leave-player"),
    });

    await t.mutation(api.lobbies.leave, {
      code,
      sessionId: asSessionId("leave-player"),
    });

    const players = await t.run(async (ctx) => {
      const allPlayers = await ctx.db.query("players").collect();
      return allPlayers;
    });

    expect(players).toHaveLength(1);
  });

  test("leave lobby rejects when player not in lobby", async () => {
    const t = convexTest(schema, modules);
    const { code } = await t.mutation(api.lobbies.create, {
      displayName: "Host",
      sessionId: asSessionId("not-in-lobby-host"),
    });

    await expect(
      t.mutation(api.lobbies.leave, {
        code,
        sessionId: asSessionId("not-in-lobby-player"),
      }),
    ).rejects.toThrow("You are not in this lobby");
  });

  test("leave lobby rejects when lobby not found", async () => {
    const t = convexTest(schema, modules);
    await expect(
      t.mutation(api.lobbies.leave, {
        code: "NOTFOUND",
        sessionId: asSessionId("not-found-session"),
      }),
    ).rejects.toThrow("Lobby not found");
  });

  test("leave lobby transfers host when host leaves and players remain", async () => {
    const t = convexTest(schema, modules);
    const { code } = await t.mutation(api.lobbies.create, {
      displayName: "Host",
      sessionId: asSessionId("transfer-host"),
    });

    await t.mutation(api.lobbies.join, {
      code,
      displayName: "Player",
      sessionId: asSessionId("transfer-player"),
    });

    await t.mutation(api.lobbies.leave, {
      code,
      sessionId: asSessionId("transfer-host"),
    });

    const players = await t.run(async (ctx) => {
      const allPlayers = await ctx.db.query("players").collect();
      return allPlayers;
    });

    const remainingPlayer = players.find((p) => p.sessionId === "transfer-player");
    expect(remainingPlayer?.isHost).toBe(true);
  });

  test("leave lobby deletes lobby when last player leaves", async () => {
    const t = convexTest(schema, modules);
    const { code } = await t.mutation(api.lobbies.create, {
      displayName: "Host",
      sessionId: asSessionId("delete-host"),
    });

    await t.mutation(api.lobbies.leave, {
      code,
      sessionId: asSessionId("delete-host"),
    });

    const lobby = await t.query(api.lobbies.get, { code });
    expect(lobby).toBeNull();
  });

  test("leave lobby is case insensitive for code", async () => {
    const t = convexTest(schema, modules);
    const { code } = await t.mutation(api.lobbies.create, {
      displayName: "Host",
      sessionId: asSessionId("case-leave-host"),
    });

    await t.mutation(api.lobbies.join, {
      code,
      displayName: "Player",
      sessionId: asSessionId("case-leave-player"),
    });

    await t.mutation(api.lobbies.leave, {
      code: code.toUpperCase(),
      sessionId: asSessionId("case-leave-player"),
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
      displayName: "Host",
      sessionId: asSessionId("non-host-leave-host"),
    });

    await t.mutation(api.lobbies.join, {
      code,
      displayName: "Player",
      sessionId: asSessionId("non-host-leave-player"),
    });

    await t.mutation(api.lobbies.leave, {
      code,
      sessionId: asSessionId("non-host-leave-player"),
    });

    const players = await t.run(async (ctx) => {
      const allPlayers = await ctx.db.query("players").collect();
      return allPlayers;
    });

    expect(players).toHaveLength(1);
    expect(players[0]?.isHost).toBe(true);
  });

  test("get lobby returns lobby by code", async () => {
    const t = convexTest(schema, modules);
    const { code } = await t.mutation(api.lobbies.create, {
      displayName: "Host",
      sessionId: asSessionId("get-host"),
    });

    const lobby = await t.query(api.lobbies.get, { code });

    expect(lobby).not.toBeNull();
    expect(lobby?.code).toBe(code);
  });

  test("get lobby returns null for invalid code", async () => {
    const t = convexTest(schema, modules);
    const lobby = await t.query(api.lobbies.get, { code: "INVALID" });
    expect(lobby).toBeNull();
  });

  test("get lobby is case insensitive for code", async () => {
    const t = convexTest(schema, modules);
    const { code } = await t.mutation(api.lobbies.create, {
      displayName: "Host",
      sessionId: asSessionId("case-get-host"),
    });

    const lobby1 = await t.query(api.lobbies.get, { code: code.toUpperCase() });
    const lobby2 = await t.query(api.lobbies.get, { code: code.toLowerCase() });

    expect(lobby1?.code).toBe(lobby2?.code);
  });

  test("get lobby returns lobby with settings", async () => {
    const t = convexTest(schema, modules);
    const { code } = await t.mutation(api.lobbies.create, {
      displayName: "Host",
      sessionId: asSessionId("settings-host"),
    });

    const lobby = await t.query(api.lobbies.get, { code });

    expect(lobby).not.toBeNull();
    expect(lobby?.settings).toBeDefined();
    expect(lobby?.settings?.targetTimelineSize).toBe(10);
    expect(lobby?.settings?.startingCoins).toBe(3);
  });

  test("updateSettings allows host to update targetTimelineSize", async () => {
    const t = convexTest(schema, modules);
    const { code } = await t.mutation(api.lobbies.create, {
      displayName: "Host",
      sessionId: asSessionId("update-target-host"),
    });

    await t.mutation(api.lobbies.updateSettings, {
      code,
      sessionId: asSessionId("update-target-host"),
      settings: { targetTimelineSize: 12 },
    });

    const lobby = await t.query(api.lobbies.get, { code });
    expect(lobby?.settings.targetTimelineSize).toBe(12);
  });

  test("updateSettings allows host to update startingCoins", async () => {
    const t = convexTest(schema, modules);
    const { code } = await t.mutation(api.lobbies.create, {
      displayName: "Host",
      sessionId: asSessionId("update-coins-host"),
    });

    await t.mutation(api.lobbies.updateSettings, {
      code,
      sessionId: asSessionId("update-coins-host"),
      settings: { startingCoins: 5 },
    });

    const lobby = await t.query(api.lobbies.get, { code });
    expect(lobby?.settings.startingCoins).toBe(5);
  });

  test("updateSettings allows host to update turnSeconds", async () => {
    const t = convexTest(schema, modules);
    const { code } = await t.mutation(api.lobbies.create, {
      displayName: "Host",
      sessionId: asSessionId("update-turn-host"),
    });

    await t.mutation(api.lobbies.updateSettings, {
      code,
      sessionId: asSessionId("update-turn-host"),
      settings: { turnSeconds: 60 },
    });

    const lobby = await t.query(api.lobbies.get, { code });
    expect(lobby?.settings.turnSeconds).toBe(60);
  });

  test("updateSettings allows host to update year range", async () => {
    const t = convexTest(schema, modules);
    const { code } = await t.mutation(api.lobbies.create, {
      displayName: "Host",
      sessionId: asSessionId("update-year-host"),
    });

    await t.mutation(api.lobbies.updateSettings, {
      code,
      sessionId: asSessionId("update-year-host"),
      settings: { maxYear: 2000, minYear: 1950 },
    });

    const lobby = await t.query(api.lobbies.get, { code });
    expect(lobby?.settings.minYear).toBe(1950);
    expect(lobby?.settings.maxYear).toBe(2000);
  });

  test("updateSettings rejects non-host", async () => {
    const t = convexTest(schema, modules);
    const { code } = await t.mutation(api.lobbies.create, {
      displayName: "Host",
      sessionId: asSessionId("non-host-update-host"),
    });

    await t.mutation(api.lobbies.join, {
      code,
      displayName: "Player",
      sessionId: asSessionId("non-host-update-player"),
    });

    await expect(
      t.mutation(api.lobbies.updateSettings, {
        code,
        sessionId: asSessionId("non-host-update-player"),
        settings: { targetTimelineSize: 15 },
      }),
    ).rejects.toThrow("Only the host can update settings");
  });

  test("updateSettings rejects targetTimelineSize below 5", async () => {
    const t = convexTest(schema, modules);
    const { code } = await t.mutation(api.lobbies.create, {
      displayName: "Host",
      sessionId: asSessionId("min-target-host"),
    });

    await expect(
      t.mutation(api.lobbies.updateSettings, {
        code,
        sessionId: asSessionId("min-target-host"),
        settings: { targetTimelineSize: 4 },
      }),
    ).rejects.toThrow("Target timeline size must be between 5 and 15");
  });

  test("updateSettings rejects targetTimelineSize above 15", async () => {
    const t = convexTest(schema, modules);
    const { code } = await t.mutation(api.lobbies.create, {
      displayName: "Host",
      sessionId: asSessionId("max-target-host"),
    });

    await expect(
      t.mutation(api.lobbies.updateSettings, {
        code,
        sessionId: asSessionId("max-target-host"),
        settings: { targetTimelineSize: 16 },
      }),
    ).rejects.toThrow("Target timeline size must be between 5 and 15");
  });

  test("updateSettings rejects startingCoins below 1", async () => {
    const t = convexTest(schema, modules);
    const { code } = await t.mutation(api.lobbies.create, {
      displayName: "Host",
      sessionId: asSessionId("min-coins-host"),
    });

    await expect(
      t.mutation(api.lobbies.updateSettings, {
        code,
        sessionId: asSessionId("min-coins-host"),
        settings: { startingCoins: 0 },
      }),
    ).rejects.toThrow("Starting coins must be between 1 and 10");
  });

  test("updateSettings rejects startingCoins above 10", async () => {
    const t = convexTest(schema, modules);
    const { code } = await t.mutation(api.lobbies.create, {
      displayName: "Host",
      sessionId: asSessionId("max-coins-host"),
    });

    await expect(
      t.mutation(api.lobbies.updateSettings, {
        code,
        sessionId: asSessionId("max-coins-host"),
        settings: { startingCoins: 11 },
      }),
    ).rejects.toThrow("Starting coins must be between 1 and 10");
  });

  test("updateSettings rejects turnSeconds below 15", async () => {
    const t = convexTest(schema, modules);
    const { code } = await t.mutation(api.lobbies.create, {
      displayName: "Host",
      sessionId: asSessionId("min-turn-host"),
    });

    await expect(
      t.mutation(api.lobbies.updateSettings, {
        code,
        sessionId: asSessionId("min-turn-host"),
        settings: { turnSeconds: 14 },
      }),
    ).rejects.toThrow("Turn seconds must be between 15 and 120");
  });

  test("updateSettings rejects turnSeconds above 120", async () => {
    const t = convexTest(schema, modules);
    const { code } = await t.mutation(api.lobbies.create, {
      displayName: "Host",
      sessionId: asSessionId("max-turn-host"),
    });

    await expect(
      t.mutation(api.lobbies.updateSettings, {
        code,
        sessionId: asSessionId("max-turn-host"),
        settings: { turnSeconds: 121 },
      }),
    ).rejects.toThrow("Turn seconds must be between 15 and 120");
  });

  test("updateSettings rejects bettingWindowSeconds below 5", async () => {
    const t = convexTest(schema, modules);
    const { code } = await t.mutation(api.lobbies.create, {
      displayName: "Host",
      sessionId: asSessionId("min-bet-host"),
    });

    await expect(
      t.mutation(api.lobbies.updateSettings, {
        code,
        sessionId: asSessionId("min-bet-host"),
        settings: { bettingWindowSeconds: 4 },
      }),
    ).rejects.toThrow("Betting window seconds must be between 5 and 60");
  });

  test("updateSettings rejects bettingWindowSeconds above 60", async () => {
    const t = convexTest(schema, modules);
    const { code } = await t.mutation(api.lobbies.create, {
      displayName: "Host",
      sessionId: asSessionId("max-bet-host"),
    });

    await expect(
      t.mutation(api.lobbies.updateSettings, {
        code,
        sessionId: asSessionId("max-bet-host"),
        settings: { bettingWindowSeconds: 61 },
      }),
    ).rejects.toThrow("Betting window seconds must be between 5 and 60");
  });

  test("updateSettings rejects minYear below 1900", async () => {
    const t = convexTest(schema, modules);
    const { code } = await t.mutation(api.lobbies.create, {
      displayName: "Host",
      sessionId: asSessionId("min-year-host"),
    });

    await expect(
      t.mutation(api.lobbies.updateSettings, {
        code,
        sessionId: asSessionId("min-year-host"),
        settings: { minYear: 1899 },
      }),
    ).rejects.toThrow("Invalid minimum year");
  });

  test("updateSettings rejects minYear above maxYear", async () => {
    const t = convexTest(schema, modules);
    const { code } = await t.mutation(api.lobbies.create, {
      displayName: "Host",
      sessionId: asSessionId("year-range-host"),
    });

    await t.run(async (ctx) => {
      const lobby = await ctx.db.query("lobbies").first();
      if (lobby) {
        await ctx.db.patch(lobby._id, {
          settings: { ...lobby.settings, maxYear: 2020, minYear: 2000 },
        });
      }
    });

    await expect(
      t.mutation(api.lobbies.updateSettings, {
        code,
        sessionId: asSessionId("year-range-host"),
        settings: { minYear: 2025 },
      }),
    ).rejects.toThrow("Invalid minimum year");
  });

  test("updateSettings rejects maxYear below minYear", async () => {
    const t = convexTest(schema, modules);
    const { code } = await t.mutation(api.lobbies.create, {
      displayName: "Host",
      sessionId: asSessionId("max-min-year-host"),
    });

    await t.run(async (ctx) => {
      const lobby = await ctx.db.query("lobbies").first();
      if (lobby) {
        await ctx.db.patch(lobby._id, {
          settings: { ...lobby.settings, maxYear: 2020, minYear: 2000 },
        });
      }
    });

    await expect(
      t.mutation(api.lobbies.updateSettings, {
        code,
        sessionId: asSessionId("max-min-year-host"),
        settings: { maxYear: 1990 },
      }),
    ).rejects.toThrow("Invalid maximum year");
  });

  test("updateSettings rejects maxYear above 2030", async () => {
    const t = convexTest(schema, modules);
    const { code } = await t.mutation(api.lobbies.create, {
      displayName: "Host",
      sessionId: asSessionId("max-max-year-host"),
    });

    await expect(
      t.mutation(api.lobbies.updateSettings, {
        code,
        sessionId: asSessionId("max-max-year-host"),
        settings: { maxYear: 2031 },
      }),
    ).rejects.toThrow("Invalid maximum year");
  });

  test("updateSettings rejects when lobby not found", async () => {
    const t = convexTest(schema, modules);
    await expect(
      t.mutation(api.lobbies.updateSettings, {
        code: "NOTFOUND",
        sessionId: asSessionId("not-found-session"),
        settings: { targetTimelineSize: 12 },
      }),
    ).rejects.toThrow("Lobby not found");
  });

  test("updateSettings rejects when lobby status is in_game", async () => {
    const t = convexTest(schema, modules);
    const { code } = await t.mutation(api.lobbies.create, {
      displayName: "Host",
      sessionId: asSessionId("game-update-host"),
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
        sessionId: asSessionId("game-update-host"),
        settings: { targetTimelineSize: 12 },
      }),
    ).rejects.toThrow("Cannot update settings for a lobby that is not in lobby status");
  });

  test("updateSettings is case insensitive for code", async () => {
    const t = convexTest(schema, modules);
    const { code } = await t.mutation(api.lobbies.create, {
      displayName: "Host",
      sessionId: asSessionId("case-update-host"),
    });

    await t.mutation(api.lobbies.updateSettings, {
      code: code.toUpperCase(),
      sessionId: asSessionId("case-update-host"),
      settings: { targetTimelineSize: 12 },
    });

    const lobby = await t.query(api.lobbies.get, { code: code.toLowerCase() });
    expect(lobby?.settings.targetTimelineSize).toBe(12);
  });

  test("updateSettings allows host to toggle boolean settings", async () => {
    const t = convexTest(schema, modules);
    const { code } = await t.mutation(api.lobbies.create, {
      displayName: "Host",
      sessionId: asSessionId("toggle-host"),
    });

    await t.mutation(api.lobbies.updateSettings, {
      code,
      sessionId: asSessionId("toggle-host"),
      settings: { allowGuessTitleArtist: true, showLiveBets: false },
    });

    const lobby = await t.query(api.lobbies.get, { code });
    expect(lobby?.settings.allowGuessTitleArtist).toBe(true);
    expect(lobby?.settings.showLiveBets).toBe(false);
  });
});
