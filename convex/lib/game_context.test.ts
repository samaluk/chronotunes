import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";

import { getGameAndRound, getGameContext } from "./game_context";
import schema from "../schema";
import { factories, tracks } from "../test/factories";
import { modules } from "../test.setup";

describe("getGameContext", () => {
  test("returns lobby, game, and round when all exist", async () => {
    const t = convexTest(schema, modules);
    await tracks.createMany(t, 3);
    const created = await factories.lobbies.createWithGame(t, "ctx-host-session", 1);

    const context = await t.run(async (ctx) => getGameContext(ctx, created.id));

    expect(context.lobby._id).toBe(created.id);
    expect(context.game._id).toBe(created.gameId);
    expect(context.round?._id).toBe(created.roundId);
  });

  test("throws when lobby does not exist", async () => {
    const t = convexTest(schema, modules);

    await expect(
      t.run(async (ctx) =>
        getGameContext(
          ctx,
          // oxlint-disable-next-line typescript/consistent-type-assertions, typescript/no-unsafe-type-assertion
          "lobbies" as never,
        ),
      ),
    ).rejects.toThrow("Lobby not found");
  });

  test("throws when lobby has no active game", async () => {
    const t = convexTest(schema, modules);
    const lobby = await factories.lobbies.create(t, "no-game-host-session", "No Game Host");

    await expect(t.run(async (ctx) => getGameContext(ctx, lobby.id))).rejects.toThrow(
      "No active game in this lobby",
    );
  });
});

describe("getGameAndRound", () => {
  test("returns game and round for an in-game lobby", async () => {
    const t = convexTest(schema, modules);
    await tracks.createMany(t, 3);
    const created = await factories.lobbies.createWithGame(t, "gr-host-session", 1);

    const { game, round } = await t.run(async (ctx) => getGameAndRound(ctx, created.id));

    expect(game._id).toBe(created.gameId);
    expect(round._id).toBe(created.roundId);
  });

  test("throws when the game is missing its round", async () => {
    const t = convexTest(schema, modules);
    await tracks.createMany(t, 3);
    const created = await factories.lobbies.createWithGame(t, "nr-host-session", 1);

    await t.run(async (ctx) => {
      await ctx.db.patch(created.gameId, { currentRoundId: undefined });
    });

    await expect(t.run(async (ctx) => getGameAndRound(ctx, created.id))).rejects.toThrow(
      "Game or round not found",
    );
  });
});
