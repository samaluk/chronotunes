import { convexTest } from "convex-test";
import { assert, expect, test } from "vitest";

import { api } from "./_generated/api";
import { asSessionId } from "./lib/sessions";
import schema from "./schema";
import { modules } from "./test.setup";

test("list returns all players in lobby", async () => {
  const t = convexTest(schema, modules);

  const { code } = await t.mutation(api.lobbies.create, {
    displayName: "ListHost",
    sessionId: asSessionId("list-host-session"),
  });

  await t.mutation(api.lobbies.join, {
    code,
    displayName: "Player1",
    sessionId: asSessionId("list-player1-session"),
  });

  await t.mutation(api.lobbies.join, {
    code,
    displayName: "Player2",
    sessionId: asSessionId("list-player2-session"),
  });

  const lobby = await t.query(api.lobbies.get, { code });
  // oxlint-disable-next-line typescript/no-non-null-assertion
  const players = await t.query(api.players.list, { lobbyId: lobby!._id });

  expect(players).toHaveLength(3);
  // oxlint-disable-next-line typescript/no-unsafe-assignment, typescript/no-unsafe-call
  const displayNames = players.map((p) => p.displayName).toSorted();
  expect(displayNames).toStrictEqual(["ListHost", "Player1", "Player2"]);
});

test("list returns empty array for lobby with no players", async () => {
  const t = convexTest(schema, modules);

  const { code } = await t.mutation(api.lobbies.create, {
    displayName: "ListEmptyHost",
    sessionId: asSessionId("list-empty-host"),
  });

  const lobby = await t.query(api.lobbies.get, { code });
  // oxlint-disable-next-line typescript/no-non-null-assertion
  const players = await t.query(api.players.list, { lobbyId: lobby!._id });

  expect(players).toHaveLength(1);
});

test("list returns players with correct properties", async () => {
  const t = convexTest(schema, modules);

  const { code } = await t.mutation(api.lobbies.create, {
    displayName: "ListPropsHost",
    sessionId: asSessionId("list-props-host"),
  });

  await t.mutation(api.lobbies.join, {
    code,
    displayName: "ListPropsPlayer",
    sessionId: asSessionId("list-props-player"),
  });

  const lobby = await t.query(api.lobbies.get, { code });
  // oxlint-disable-next-line typescript/no-non-null-assertion
  const players = await t.query(api.players.list, { lobbyId: lobby!._id });

  const host = players.find((p) => p.isHost);
  const player = players.find((p) => !p.isHost);

  assert(host);
  assert(player);

  expect(host).toMatchObject({
    sessionId: "list-props-host",
    displayName: "ListPropsHost",
    coins: 0,
    timeline: [],
    timelineSize: 0,
  });
  expect(host.createdAt).toBeTypeOf("number");

  expect(player).toMatchObject({
    sessionId: "list-props-player",
    displayName: "ListPropsPlayer",
    isHost: false,
  });
});

test("getMe returns current player by sessionId", async () => {
  const t = convexTest(schema, modules);

  const { code } = await t.mutation(api.lobbies.create, {
    displayName: "MeHost",
    sessionId: asSessionId("me-host-session"),
  });

  await t.mutation(api.lobbies.join, {
    code,
    displayName: "MePlayer",
    sessionId: asSessionId("me-player-session"),
  });

  const lobby = await t.query(api.lobbies.get, { code });

  const me = await t.query(api.players.getMe, {
    // oxlint-disable-next-line typescript/no-non-null-assertion
    lobbyId: lobby!._id,
    sessionId: asSessionId("me-player-session"),
  });

  expect(me).toMatchObject({
    displayName: "MePlayer",
    sessionId: "me-player-session",
    isHost: false,
  });
});

test("getMe returns host player", async () => {
  const t = convexTest(schema, modules);

  const { code } = await t.mutation(api.lobbies.create, {
    displayName: "MeRealHost",
    sessionId: asSessionId("me-real-host-session"),
  });

  const lobby = await t.query(api.lobbies.get, { code });

  const me = await t.query(api.players.getMe, {
    // oxlint-disable-next-line typescript/no-non-null-assertion
    lobbyId: lobby!._id,
    sessionId: asSessionId("me-real-host-session"),
  });

  expect(me).toMatchObject({
    displayName: "MeRealHost",
    isHost: true,
  });
});

test("getMe returns null when session not in lobby", async () => {
  const t = convexTest(schema, modules);

  const { code } = await t.mutation(api.lobbies.create, {
    displayName: "MeNotInHost",
    sessionId: asSessionId("me-not-in-session"),
  });

  const lobby = await t.query(api.lobbies.get, { code });

  const me = await t.query(api.players.getMe, {
    // oxlint-disable-next-line typescript/no-non-null-assertion
    lobbyId: lobby!._id,
    sessionId: asSessionId("random-session-not-in-lobby"),
  });

  expect(me).toBeNull();
});
