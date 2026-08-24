import { cleanup, render, screen } from "@testing-library/react";
import type { GenericId } from "convex/values";
import { getFunctionName } from "convex/server";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it, vi } from "vitest";

import messages from "../../../messages/en.json";
import { api } from "@/convex/_generated/api";

import { GameView } from "./game-view";

/* oxlint-disable typescript/no-unsafe-call -- jest-dom matchers are typed at runtime */
/* oxlint-disable typescript/no-unsafe-member-access -- the generated api resolves to opaque proxies under the lint type pass */

// oxlint-disable-next-line typescript/consistent-type-assertions, typescript/no-unsafe-type-assertion
const mockLobbyId = "lobby123" as GenericId<"lobbies">;

/**
 * Convex anyApi references are opaque proxies without useful types, so every
 * lookup goes through one documented escape hatch instead of scattering casts.
 */
// oxlint-disable-next-line typescript/consistent-type-assertions, typescript/no-unsafe-type-assertion
const nameOf = (fn: unknown): string => getFunctionName(fn as Parameters<typeof getFunctionName>[0]);

/** Query results keyed by Convex function name ("module/function"). */
const queryResults = new Map<string, unknown>();

vi.mock(import("convex/react"), () => ({
  useQuery: vi.fn((fn: unknown) => queryResults.get(nameOf(fn))),
}));

vi.mock(import("convex-helpers/react/sessions"), () => ({
  SessionProvider: ({ children }: { children: React.ReactNode }) => children,
  useSessionId: () => ["session-1"],
  useSessionMutation: vi.fn(() => vi.fn()),
  useSessionQuery: vi.fn((fn: unknown) => queryResults.get(nameOf(fn))),
}));

/** Flipped per-test to cover the pre-mount branch. */
let mounted = true;

vi.mock(import("usehooks-ts"), () => ({
  useIsMounted: () => () => mounted,
}));

const now = Date.now();

const playerA = {
  _creationTime: now,
  // oxlint-disable-next-line typescript/consistent-type-assertions, typescript/no-unsafe-type-assertion
  _id: "a" as GenericId<"players">,
  coins: 0,
  createdAt: now,
  displayName: "Player A",
  isHost: false,
  lobbyId: mockLobbyId,
  sessionId: "session-a",
  timeline: [],
  timelineSize: 0,
};

function seedReadyQueries(): void {
  queryResults.set(nameOf(api.lobbies.get), {
    _creationTime: now,
    _id: mockLobbyId,
    code: "ABC234",
    hostSessionId: "session-a",
    status: "in_game",
  });
  queryResults.set(nameOf(api.players.list), [playerA]);
  queryResults.set(nameOf(api.games.getCurrent), {
    _creationTime: now,
    // oxlint-disable-next-line typescript/consistent-type-assertions, typescript/no-unsafe-type-assertion
    _id: "game1" as GenericId<"games">,
    lobbyId: mockLobbyId,
    roundNumber: 1,
    status: "started",
  });
  queryResults.set(nameOf(api.rounds.getCurrent), {
    _creationTime: now,
    // oxlint-disable-next-line typescript/consistent-type-assertions, typescript/no-unsafe-type-assertion
    _id: "round1" as GenericId<"rounds">,
    // oxlint-disable-next-line typescript/consistent-type-assertions, typescript/no-unsafe-type-assertion
    gameId: "game1" as GenericId<"games">,
    phase: "placing",
    roundNumber: 1,
    startedAt: now,
    // oxlint-disable-next-line typescript/consistent-type-assertions, typescript/no-unsafe-type-assertion
    trackId: "track1" as GenericId<"tracks">,
    turnPlayerId: playerA._id,
  });
  queryResults.set(nameOf(api.players.getMe), playerA);
}

afterEach(() => {
  cleanup();
  queryResults.clear();
  mounted = true;
});

describe(GameView, () => {
  it("renders the loading skeleton before mount", () => {
    mounted = false;

    const { container } = render(<GameView code="ABC234" lobbyId={mockLobbyId} />);

    expect(container.querySelector(".animate-pulse")).not.toBeNull();
  });

  it("renders the loading skeleton while queries are pending", () => {
    const { container } = render(<GameView code="ABC234" lobbyId={mockLobbyId} />);

    expect(container.querySelector(".animate-pulse")).not.toBeNull();
  });

  it("renders the missing-game notice when lobby, game, or round is absent", () => {
    queryResults.set(nameOf(api.lobbies.get), null);
    queryResults.set(nameOf(api.players.list), []);
    queryResults.set(nameOf(api.games.getCurrent), null);
    queryResults.set(nameOf(api.rounds.getCurrent), null);

    render(
      <NextIntlClientProvider locale="en" messages={messages}>
        <GameView code="ABC234" lobbyId={mockLobbyId} />
      </NextIntlClientProvider>,
    );

    expect(screen.getByText("No active game found")).toBeInTheDocument();
  });

  it("renders the game content once every query resolves", () => {
    seedReadyQueries();

    const { container } = render(
      <NextIntlClientProvider locale="en" messages={messages}>
        <GameView code="ABC234" lobbyId={mockLobbyId} />
      </NextIntlClientProvider>,
    );

    expect(container.querySelector(".bg-muted.animate-pulse")).toBeNull();
    expect(screen.queryByText("No active game found")).not.toBeInTheDocument();
  });
});
