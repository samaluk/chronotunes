import { convexTest } from "convex-test";
import { expect, expectTypeOf, test } from "vitest";

import { api, internal } from "./_generated/api";
import schema from "./schema";
import { modules } from "./test.setup";

test("destructive catalog administration is absent from the public API", () => {
  type HasPublicSeed = "seed" extends keyof typeof api.seed ? true : false;
  type HasPublicCsvImport = "importTracksFromCsv" extends keyof typeof api.import_tracks
    ? true
    : false;
  type HasPublicCsvParser = "parseAndImportCsv" extends keyof typeof api.import_tracks
    ? true
    : false;

  expectTypeOf<HasPublicSeed>().toEqualTypeOf<false>();
  expectTypeOf<HasPublicCsvImport>().toEqualTypeOf<false>();
  expectTypeOf<HasPublicCsvParser>().toEqualTypeOf<false>();
});

test("seed replaces existing tracks through the internal API", async () => {
  const t = convexTest(schema, modules);

  await t.run(async (ctx) => {
    await ctx.db.insert("tracks", {
      artist: "Existing Artist",
      createdAt: Date.now(),
      externalIds: {},
      links: {},
      source: "test",
      title: "Existing Track",
      year: 1990,
    });
  });

  const result = await t.mutation(internal.seed.seed, {});
  const tracks = await t.query(api.tracks.list, {});

  expect(result.trackCount).toBeGreaterThan(0);
  expect(tracks).toHaveLength(result.trackCount);
  expect(tracks.some((track) => track.title === "Existing Track")).toBe(false);
});
