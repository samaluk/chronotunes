import { convexTest } from "convex-test";
import { expect, test } from "vitest";

import { api } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import schema from "../schema";
import { modules } from "../test.setup";
import { asSessionId } from "./sessions";

async function seedTracks(t: ReturnType<typeof convexTest>) {
  await t.run(async (ctx) => {
    await Promise.all(
      Array.from({ length: (2050 - 1950) / 5 + 1 }, (_, index) => {
        const year = 1950 + index * 5;
        return ctx.db.insert("tracks", {
          artist: `Artist ${year}`,
          createdAt: Date.now(),
          externalIds: { youtubeVideoId: `video${year}` },
          links: {},
          source: "test",
          title: `Song ${year}`,
          year,
        });
      })
    );
  });
}

async function createGameWithPlayers(
  t: ReturnType<typeof convexTest>,
  minYear: number,
  maxYear: number
) {
  const { code } = await t.mutation(api.lobbies.create, {
    displayName: "Host",
    sessionId: asSessionId("host-session"),
  });

  await t.mutation(api.lobbies.join, {
    code,
    displayName: "Player1",
    sessionId: asSessionId("player1-session"),
  });

  await t.mutation(api.lobbies.join, {
    code,
    displayName: "Player2",
    sessionId: asSessionId("player2-session"),
  });

  await t.mutation(api.lobbies.updateSettings, {
    code,
    sessionId: asSessionId("host-session"),
    settings: {
      allowBetRetraction: true,
      allowGuessTitleArtist: false,
      bettingWindowSeconds: 15,
      maxYear,
      minYear,
      showLiveBets: true,
      startingCoins: 3,
      targetTimelineSize: 10,
      turnSeconds: 60,
    },
  });

  const lobby = await t.query(api.lobbies.get, { code });
  if (!lobby) {
    throw new Error("Lobby not found");
  }
  const lobbyId = lobby._id;

  const result = await t.mutation(api.games.start, {
    lobbyId,
    sessionId: asSessionId("host-session"),
  });

  return { code, gameId: result.gameId as Id<"games"> };
}

test("selectTrackForRound returns track within year range", async () => {
  const t = convexTest(schema, modules);

  await seedTracks(t);

  const { gameId } = await createGameWithPlayers(t, 1980, 2000);

  const track = await t.run(async (ctx) => {
    const { selectTrackForRound } = await import("./track_selection");
    return await selectTrackForRound(ctx, {
      gameId,
      maxYear: 2000,
      minYear: 1980,
    });
  });

  expect(track).not.toBeNull();
  expect(track!.year).toBeGreaterThanOrEqual(1980);
  expect(track!.year).toBeLessThanOrEqual(2000);
});

test("selectTrackForRound never returns track already used in game", async () => {
  const t = convexTest(schema, modules);

  await seedTracks(t);

  const { gameId } = await createGameWithPlayers(t, 1980, 2000);

  const firstTrack = await t.run(async (ctx) => {
    const { selectTrackForRound } = await import("./track_selection");
    return await selectTrackForRound(ctx, {
      gameId,
      maxYear: 2000,
      minYear: 1980,
    });
  });

  expect(firstTrack).not.toBeNull();

  await t.run(async (ctx) => {
    const game = await ctx.db.get(gameId);
    if (!game) {
      return;
    }

    const players = await ctx.db
      .query("players")
      .filter((q) => q.eq(q.field("lobbyId"), game.lobbyId))
      .collect();

    const player = players[0]!;
    await ctx.db.patch(player._id, {
      timeline: [
        {
          earnedAtRoundNumber: 1,
          earnedBy: "placement",
          trackId: firstTrack!.trackId,
          year: firstTrack!.year,
        },
      ],
      timelineSize: 1,
    });

    const rounds = await ctx.db
      .query("rounds")
      .filter((q) => q.eq(q.field("gameId"), gameId))
      .collect();

    await Promise.all(
      rounds
        .filter((round) => round.trackId !== firstTrack!.trackId)
        .map((round) => ctx.db.delete(round._id))
    );
  });

  const secondTrack = await t.run(async (ctx) => {
    const { selectTrackForRound } = await import("./track_selection");
    return await selectTrackForRound(ctx, {
      gameId,
      maxYear: 2000,
      minYear: 1980,
    });
  });

  expect(secondTrack).not.toBeNull();
  expect(secondTrack!.trackId).not.toBe(firstTrack!.trackId);
});

test("selectTrackForRound returns null if no tracks available", async () => {
  const t = convexTest(schema, modules);

  await t.run(async (ctx) => {
    await Promise.all(
      Array.from({ length: (1995 - 1980) / 5 + 1 }, (_, index) => {
        const year = 1980 + index * 5;
        return ctx.db.insert("tracks", {
          artist: "Artist",
          createdAt: Date.now(),
          externalIds: { youtubeVideoId: `video${year}` },
          links: {},
          source: "test",
          title: `Song ${year}`,
          year,
        });
      })
    );
  });

  const { gameId } = await createGameWithPlayers(t, 1980, 2000);

  const allRounds = await t.run(
    async (ctx) =>
      await ctx.db
        .query("rounds")
        .filter((q) => q.eq(q.field("gameId"), gameId))
        .collect()
  );

  await Promise.all(
    allRounds.map((round) =>
      t.run(async (ctx) => {
        const game = await ctx.db.get(gameId);
        if (!game) {
          return;
        }

        const players = await ctx.db
          .query("players")
          .filter((q) => q.eq(q.field("lobbyId"), game.lobbyId))
          .collect();

        await Promise.all(
          players.map((player) =>
            ctx.db.patch(player._id, {
              timeline: player.timeline.concat({
                earnedAtRoundNumber: 1,
                earnedBy: "placement" as const,
                trackId: round.trackId,
                year: 1990,
              }),
              timelineSize: player.timeline.length + 1,
            })
          )
        );
      })
    )
  );

  const game = await t.run(async (ctx) => await ctx.db.get(gameId));

  if (game) {
    const players = await t.run(
      async (ctx) =>
        await ctx.db
          .query("players")
          .filter((q) => q.eq(q.field("lobbyId"), game.lobbyId))
          .collect()
    );

    const usedTrackIds = new Set<string>();
    for (const player of players) {
      for (const entry of player.timeline) {
        usedTrackIds.add(entry.trackId);
      }
    }

    const allTracks = await t.run(
      async (ctx) => await ctx.db.query("tracks").collect()
    );

    const unusedTracks = allTracks.filter(
      (track) => !usedTrackIds.has(track._id)
    );

    await Promise.all(
      unusedTracks.flatMap((track) =>
        players.map((player) =>
          t.run(async (ctx) => {
            await ctx.db.patch(player._id, {
              timeline: player.timeline.concat({
                earnedAtRoundNumber: 1,
                earnedBy: "placement" as const,
                trackId: track._id,
                year: track.year,
              }),
              timelineSize: player.timeline.length + 1,
            });
          })
        )
      )
    );

    for (const track of unusedTracks) {
      usedTrackIds.add(track._id);
    }
  }

  const track = await t.run(async (ctx) => {
    const { selectTrackForRound } = await import("./track_selection");
    return await selectTrackForRound(ctx, {
      gameId,
      maxYear: 2000,
      minYear: 1980,
    });
  });

  expect(track).toBeNull();
});

test("selectTrackForRound respects year range boundaries", async () => {
  const t = convexTest(schema, modules);

  await t.run(async (ctx) => {
    await Promise.all(
      Array.from({ length: 1995 - 1985 + 1 }, (_, index) => {
        const year = 1985 + index;
        return ctx.db.insert("tracks", {
          artist: `Artist ${year}`,
          createdAt: Date.now(),
          externalIds: { youtubeVideoId: `video${year}` },
          links: {},
          source: "test",
          title: `Song ${year}`,
          year,
        });
      })
    );
  });

  const { gameId } = await createGameWithPlayers(t, 1985, 1995);

  const track = await t.run(async (ctx) => {
    const { selectTrackForRound } = await import("./track_selection");
    return await selectTrackForRound(ctx, {
      gameId,
      maxYear: 1995,
      minYear: 1985,
    });
  });

  expect(track).not.toBeNull();
  expect(track!.year).toBeGreaterThanOrEqual(1985);
  expect(track!.year).toBeLessThanOrEqual(1995);
});
