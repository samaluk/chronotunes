import { convexTest } from "convex-test";
import { expect, test } from "vitest";

import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { asSessionId } from "./lib/sessions";
import schema from "./schema";
import { modules } from "./test.setup";

test("get returns track by ID", async () => {
  const t = convexTest(schema, modules);

  const trackId = await t.run(
    async (ctx) =>
      await ctx.db.insert("tracks", {
        artist: "Test Artist",
        createdAt: Date.now(),
        externalIds: { youtubeVideoId: "abc123" },
        links: {},
        source: "test",
        title: "Test Track",
        year: 1990,
      })
  );

  const track = await t.query(api.tracks.get, { trackIds: [trackId] });

  expect(track).toHaveLength(1);
  expect(track[0]).not.toBeNull();
  expect(track[0]?.title).toBe("Test Track");
  expect(track[0]?.artist).toBe("Test Artist");
  expect(track[0]?.year).toBe(1990);
});

test("get returns multiple tracks by ID", async () => {
  const t = convexTest(schema, modules);

  const trackId1 = await t.run(
    async (ctx) =>
      await ctx.db.insert("tracks", {
        artist: "Artist 1",
        createdAt: Date.now(),
        externalIds: {},
        links: {},
        source: "test",
        title: "Track 1",
        year: 1980,
      })
  );

  const trackId2 = await t.run(
    async (ctx) =>
      await ctx.db.insert("tracks", {
        artist: "Artist 2",
        createdAt: Date.now(),
        externalIds: {},
        links: {},
        source: "test",
        title: "Track 2",
        year: 1990,
      })
  );

  const trackId3 = await t.run(
    async (ctx) =>
      await ctx.db.insert("tracks", {
        artist: "Artist 3",
        createdAt: Date.now(),
        externalIds: {},
        links: {},
        source: "test",
        title: "Track 3",
        year: 2000,
      })
  );

  const tracks = await t.query(api.tracks.get, {
    trackIds: [trackId1, trackId2, trackId3],
  });

  expect(tracks).toHaveLength(3);
  expect(tracks[0]?.title).toBe("Track 1");
  expect(tracks[1]?.title).toBe("Track 2");
  expect(tracks[2]?.title).toBe("Track 3");
});

test("get returns empty array for empty input", async () => {
  const t = convexTest(schema, modules);

  const tracks = await t.query(api.tracks.get, { trackIds: [] });

  expect(tracks).toHaveLength(0);
});

test("importTracks creates tracks from array", async () => {
  const t = convexTest(schema, modules);

  const tracks = [
    {
      artist: "Artist 1",
      title: "Test Song 1",
      year: 1990,
      youtubeVideoId: "abc123",
    },
    { artist: "Artist 2", title: "Test Song 2", year: 1995 },
    {
      artist: "Artist 3",
      title: "Test Song 3",
      year: 2000,
      youtubeVideoId: "xyz789",
    },
  ];

  const result = await t.mutation(api.tracks.importTracks, { tracks });

  expect(result.importedCount).toBe(3);
  expect(result.trackIds).toHaveLength(3);

  const allTracks = await t.query(api.tracks.list);
  expect(allTracks).toHaveLength(3);
});

test("importTracks validates required title", async () => {
  const t = convexTest(schema, modules);

  const tracks = [{ artist: "Artist", title: "", year: 1990 }];

  await expect(t.mutation(api.tracks.importTracks, { tracks })).rejects.toThrow(
    "Track title is required"
  );
});

test("importTracks validates required artist", async () => {
  const t = convexTest(schema, modules);

  const tracks = [{ artist: "", title: "Song", year: 1990 }];

  await expect(t.mutation(api.tracks.importTracks, { tracks })).rejects.toThrow(
    "Track artist is required"
  );
});

test("importTracks validates year range", async () => {
  const t = convexTest(schema, modules);

  const tracksTooEarly = [{ artist: "Artist", title: "Song", year: 1800 }];
  const tracksTooLate = [{ artist: "Artist", title: "Song", year: 2050 }];

  await expect(
    t.mutation(api.tracks.importTracks, { tracks: tracksTooEarly })
  ).rejects.toThrow("Track year must be between 1900 and 2030");
  await expect(
    t.mutation(api.tracks.importTracks, { tracks: tracksTooLate })
  ).rejects.toThrow("Track year must be between 1900 and 2030");
});

test("importTracks validates empty array", async () => {
  const t = convexTest(schema, modules);

  await expect(
    t.mutation(api.tracks.importTracks, { tracks: [] })
  ).rejects.toThrow("At least one track must be provided");
});

test("importTracks validates max batch size", async () => {
  const t = convexTest(schema, modules);

  const tracks = Array.from({ length: 1001 }, (_, i) => ({
    artist: "Artist",
    title: `Song ${i}`,
    year: 2000,
  }));

  await expect(t.mutation(api.tracks.importTracks, { tracks })).rejects.toThrow(
    "Cannot import more than 1000 tracks at once"
  );
});

test("importTracks validates empty youtubeVideoId", async () => {
  const t = convexTest(schema, modules);

  const tracks = [
    { artist: "Artist", title: "Song", year: 1990, youtubeVideoId: "   " },
  ];

  await expect(t.mutation(api.tracks.importTracks, { tracks })).rejects.toThrow(
    "YouTube video ID must be a non-empty string if provided"
  );
});

test("importTracks validates negative durationMs", async () => {
  const t = convexTest(schema, modules);

  const tracks = [
    { artist: "Artist", durationMs: -100, title: "Song", year: 1990 },
  ];

  await expect(t.mutation(api.tracks.importTracks, { tracks })).rejects.toThrow(
    "Duration must be a non-negative number if provided"
  );
});

test("importTracks with optional mbid", async () => {
  const t = convexTest(schema, modules);

  const tracks = [
    {
      artist: "Artist",
      mbid: "12345678-1234-1234-1234-123456789012",
      title: "Song with MBID",
      year: 1990,
    },
  ];

  const result = await t.mutation(api.tracks.importTracks, { tracks });

  expect(result.importedCount).toBe(1);

  const allTracks = await t.query(api.tracks.list);
  expect(allTracks[0]?.mbid).toBe("12345678-1234-1234-1234-123456789012");
});

test("importTracks with optional durationMs", async () => {
  const t = convexTest(schema, modules);

  const tracks = [
    { artist: "Artist", durationMs: 180_000, title: "Song", year: 1990 },
  ];

  const result = await t.mutation(api.tracks.importTracks, { tracks });

  expect(result.importedCount).toBe(1);

  const allTracks = await t.query(api.tracks.list);
  expect(allTracks[0]?.durationMs).toBe(180_000);
});

test("importTracks trims whitespace from strings", async () => {
  const t = convexTest(schema, modules);

  const tracks = [
    { artist: "  Artist Name  ", title: "  Song Title  ", year: 1990 },
  ];

  const result = await t.mutation(api.tracks.importTracks, { tracks });

  expect(result.importedCount).toBe(1);

  const allTracks = await t.query(api.tracks.list);
  expect(allTracks[0]?.title).toBe("Song Title");
  expect(allTracks[0]?.artist).toBe("Artist Name");
});

async function seedRoundTestData(t: ReturnType<typeof convexTest>) {
  await t.run(async (ctx) => {
    const trackId = await ctx.db.insert("tracks", {
      artist: "Round Artist",
      createdAt: Date.now(),
      durationMs: 210_000,
      externalIds: { youtubeVideoId: "video123" },
      links: { youtubeUrl: "https://youtube.com/watch?v=video123" },
      mbid: "test-mbid-123",
      source: "test",
      title: "Round Song",
      year: 1985,
    });

    const lobbyId = await ctx.db.insert("lobbies", {
      code: "TEST123",
      hostSessionId: "host-session",
      settings: {
        allowBetRetraction: true,
        allowGuessTitleArtist: true,
        bettingWindowSeconds: 10,
        maxYear: 2030,
        minYear: 1900,
        showLiveBets: true,
        startingCoins: 10,
        targetTimelineSize: 6,
        turnSeconds: 30,
      },
      status: "in_game",
    });

    await ctx.db.insert("players", {
      coins: 10,
      createdAt: Date.now(),
      displayName: "Host",
      isHost: true,
      lobbyId,
      sessionId: asSessionId("host-session"),
      timeline: [],
      timelineSize: 0,
    });

    await ctx.db.insert("players", {
      coins: 10,
      createdAt: Date.now(),
      displayName: "Player",
      isHost: false,
      lobbyId,
      sessionId: asSessionId("player-session"),
      timeline: [],
      timelineSize: 0,
    });

    const gameId = await ctx.db.insert("games", {
      currentRoundNumber: 1,
      lobbyId,
      startedAt: Date.now(),
      status: "active",
      turnOrder: [],
    });

    await ctx.db.patch(lobbyId, { activeGameId: gameId });

    const player = await ctx.db
      .query("players")
      .filter((q) => q.eq(q.field("sessionId"), "host-session"))
      .first();

    if (player) {
      const roundId = await ctx.db.insert("rounds", {
        gameId,
        phase: "placing",
        roundNumber: 1,
        startedAt: Date.now(),
        trackId,
        turnPlayerId: player._id,
      });

      await ctx.db.patch(gameId, {
        currentRoundId: roundId,
        turnOrder: [player._id],
      });
    }

    return trackId;
  });
}

test("getForRound returns full track info for host", async () => {
  const t = convexTest(schema, modules);

  await seedRoundTestData(t);

  const lobby = await t.run(
    async (ctx) => await ctx.db.query("lobbies").first()
  );

  expect(lobby).not.toBeNull();

  const result = await t.query(api.tracks.getForRound, {
    lobbyId: lobby!._id,
    sessionId: asSessionId("host-session"),
  });

  expect(result).not.toBeNull();
  expect(result?.title).toBe("Round Song");
  expect(result?.artist).toBe("Round Artist");
  expect(result?.year).toBe(1985);
  expect(result?.durationMs).toBe(210_000);
  expect(result?.mbid).toBe("test-mbid-123");
  expect(result?.externalIds.youtubeVideoId).toBe("video123");
  expect(result?.links.youtubeUrl).toBe("https://youtube.com/watch?v=video123");
});

test("getForRound returns null for non-host", async () => {
  const t = convexTest(schema, modules);

  await seedRoundTestData(t);

  const lobby = await t.run(
    async (ctx) => await ctx.db.query("lobbies").first()
  );

  expect(lobby).not.toBeNull();

  const result = await t.query(api.tracks.getForRound, {
    lobbyId: lobby!._id,
    sessionId: asSessionId("player-session"),
  });

  expect(result).toBeNull();
});

test("getForRound returns null when no active game", async () => {
  const t = convexTest(schema, modules);

  await seedRoundTestData(t);

  const lobby = await t.run(async (ctx) => {
    const l = await ctx.db.query("lobbies").first();
    if (l) {
      await ctx.db.patch(l._id, { activeGameId: undefined });
    }
    return l;
  });

  expect(lobby).not.toBeNull();

  const result = await t.query(api.tracks.getForRound, {
    lobbyId: lobby!._id,
    sessionId: asSessionId("host-session"),
  });

  expect(result).toBeNull();
});

test("getPublic returns track info when round is resolved", async () => {
  const t = convexTest(schema, modules);

  await seedRoundTestData(t);

  let roundId: Id<"rounds"> | null = null;
  await t.run(async (ctx) => {
    const game = await ctx.db.query("games").first();
    if (game?.currentRoundId) {
      await ctx.db.patch(game.currentRoundId, { phase: "resolved" });
      roundId = game.currentRoundId;
    }
  });

  expect(roundId).not.toBeNull();

  const result = await t.query(api.tracks.getPublic, { roundId: roundId! });

  expect(result).not.toBeNull();
  expect(result?.title).toBe("Round Song");
  expect(result?.artist).toBe("Round Artist");
  expect(result?.year).toBe(1985);
  expect(result?.youtubeVideoId).toBe("video123");
});

test("getPublic returns null when round is not resolved", async () => {
  const t = convexTest(schema, modules);

  await seedRoundTestData(t);

  const round = await t.run(
    async (ctx) => await ctx.db.query("rounds").first()
  );

  expect(round).not.toBeNull();

  const result = await t.query(api.tracks.getPublic, { roundId: round!._id });

  expect(result).toBeNull();
});

test("getPublic returns null for non-existent round", async () => {
  const t = convexTest(schema, modules);

  const result = await t.query(api.tracks.getPublic, {
    roundId: "99999999999999999999999999999999rounds" as Id<"rounds">,
  });

  expect(result).toBeNull();
});

test("getPublic returns null youtubeVideoId when not set", async () => {
  const t = convexTest(schema, modules);

  const trackId = await t.run(
    async (ctx) =>
      await ctx.db.insert("tracks", {
        artist: "Unknown Artist",
        createdAt: Date.now(),
        externalIds: {},
        links: {},
        source: "test",
        title: "No Video Song",
        year: 2000,
      })
  );

  const lobbyId = await t.run(
    async (ctx) =>
      await ctx.db.insert("lobbies", {
        code: "NOVIDEO",
        hostSessionId: asSessionId("host2"),
        settings: {
          allowBetRetraction: true,
          allowGuessTitleArtist: true,
          bettingWindowSeconds: 10,
          maxYear: 2030,
          minYear: 1900,
          showLiveBets: true,
          startingCoins: 10,
          targetTimelineSize: 6,
          turnSeconds: 30,
        },
        status: "lobby",
      })
  );

  const gameId = await t.run(
    async (ctx) =>
      await ctx.db.insert("games", {
        currentRoundNumber: 1,
        lobbyId,
        startedAt: Date.now(),
        status: "active",
        turnOrder: [],
      })
  );

  const player = await t.run(
    async (ctx) =>
      await ctx.db.insert("players", {
        coins: 10,
        createdAt: Date.now(),
        displayName: "Host2",
        isHost: true,
        lobbyId,
        sessionId: asSessionId("host2"),
        timeline: [],
        timelineSize: 0,
      })
  );

  const roundId = await t.run(async (ctx) => {
    const rid = await ctx.db.insert("rounds", {
      gameId,
      phase: "resolved",
      roundNumber: 1,
      startedAt: Date.now(),
      trackId,
      turnPlayerId: player,
    });
    await ctx.db.patch(gameId, { currentRoundId: rid, turnOrder: [player] });
    return rid;
  });

  const result = await t.query(api.tracks.getPublic, { roundId });

  expect(result).not.toBeNull();
  expect(result?.youtubeVideoId).toBeNull();
});
