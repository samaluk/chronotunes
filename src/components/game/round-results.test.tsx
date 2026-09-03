import { cleanup, render, screen } from "@testing-library/react";
import type { GenericId } from "convex/values";
import { afterEach, describe, expect, it, vi } from "vitest";

import { GameContext } from "./game-context";
import { RoundResults } from "./round-results";

// oxlint-disable-next-line typescript/consistent-type-assertions, typescript/no-unsafe-type-assertion
const mockLobbyId = "lobby123" as GenericId<"lobbies">;
const now = Date.now();

const createMockPlayer = (overrides = {}) => ({
  _creationTime: now,
  // oxlint-disable-next-line typescript/consistent-type-assertions, typescript/no-unsafe-type-assertion
  _id: "player1" as GenericId<"players">,
  coins: 3,
  createdAt: now,
  displayName: "TestPlayer",
  isHost: true,
  lobbyId: mockLobbyId,
  sessionId: "session1",
  timeline: [],
  timelineSize: 0,
  ...overrides,
});

const mockPlayers = [
  createMockPlayer({
    // oxlint-disable-next-line typescript/consistent-type-assertions, typescript/no-unsafe-type-assertion
    _id: "player1" as GenericId<"players">,
    displayName: "Player1",
    isHost: true,
    sessionId: "session1",
  }),
  createMockPlayer({
    // oxlint-disable-next-line typescript/consistent-type-assertions, typescript/no-unsafe-type-assertion
    _id: "player2" as GenericId<"players">,
    coins: 2,
    displayName: "Player2",
    isHost: false,
    sessionId: "session2",
    timelineSize: 1,
  }),
];

const mockTrack = {
  // oxlint-disable-next-line typescript/consistent-type-assertions, typescript/no-unsafe-type-assertion
  _id: "track1" as GenericId<"tracks">,
  artist: "Test Artist",
  title: "Test Song",
  year: 2020,
};

const mockResolution = {
  // oxlint-disable-next-line typescript/consistent-type-assertions, typescript/no-unsafe-type-assertion
  awardedPlayerIds: ["player1"] as GenericId<"players">[],
  coinDeltas: [],
  resolvedAt: now,
  turnPlayerWasCorrect: true,
  validIndexMax: 1,
  validIndexMin: 0,
};

vi.mock(import("convex/react"), () => ({
  useMutation: vi.fn<() => () => void>(() => vi.fn<() => void>()),
  useQuery: vi.fn<() => null>(() => null),
}));

vi.mock(import("convex-helpers/react/sessions"), () => ({
  SessionProvider: ({ children }: { children: React.ReactNode }) => children,
  useSessionMutation: vi.fn<() => () => void>(() => vi.fn<() => void>()),
  useSessionQuery: vi.fn<() => null>(() => null),
}));

vi.mock(import("next-intl"), () => ({
  useTranslations: () => (key: string) => key,
}));

let useStateCallCount = 0;

vi.mock(import("react"), async () => {
  const actual = await vi.importActual<typeof import("react")>("react");
  return {
    ...actual,
    // oxlint-disable-next-line typescript/no-unsafe-call, typescript/no-unsafe-return
    useMemo: vi.fn<<T>(fn: () => T) => T>((fn) => fn()),
    useState: vi.fn<<T>(initial: T | (() => T)) => [T, (val: unknown) => void]>((initial) => {
      useStateCallCount += 1;
      if (useStateCallCount === 2) {
        return [true, vi.fn<(val: unknown) => void>()];
      }
      if (typeof initial === "function") {
        // oxlint-disable-next-line typescript/no-unsafe-call, typescript/no-unsafe-return
        return [initial(), vi.fn<(val: unknown) => void>()];
      }
      // oxlint-disable-next-line typescript/no-unsafe-return
      return [initial, vi.fn<(val: unknown) => void>()];
    }),
  };
});

afterEach(() => {
  cleanup();
  useStateCallCount = 0;
});

const startNextRoundRegex = /Start Next Round/i;
const waitingForHostRegex = /Waiting for host to start next round/i;
const resolvedAtRegex = /Resolved at/i;

const createContextValue = (
  overrides: {
    state?: Record<string, unknown>;
    meta?: Record<string, unknown>;
  } = {},
) => ({
  actions: {
    handleModalClose: vi.fn<() => void>(),
    setSelectedPlayerForTimeline: vi.fn<(player: unknown) => void>(),
  },
  meta: {
    code: "ABC123",
    lobbyId: mockLobbyId,
    sessionId: "session1",
    ...overrides.meta,
  },
  state: {
    bettingWindowSeconds: undefined,
    currentRound: { resolution: mockResolution },
    game: null,
    isGameFinished: false,
    isMyTurn: false,
    lobby: null,
    me: mockPlayers[0],
    phase: "resolved" as const,
    players: mockPlayers,
    revealedTracks: [],
    selectedPlayerForTimeline: null,
    showLiveBets: false,
    track: mockTrack,
    turnPlayer: mockPlayers[0],
    turnSeconds: undefined,
    ...overrides.state,
  },
});

describe("RoundResults", () => {
  it("displays song title, artist, and year", () => {
    render(
      // oxlint-disable-next-line typescript/consistent-type-assertions, typescript/no-explicit-any, typescript/no-unsafe-assignment, typescript/no-unsafe-type-assertion
      <GameContext.Provider value={createContextValue() as any}>
        <RoundResults />
      </GameContext.Provider>,
    );

    // oxlint-disable-next-line typescript/no-unsafe-call
    expect(screen.getByText((content) => content.includes("Test Song"))).toBeInTheDocument();
    // oxlint-disable-next-line typescript/no-unsafe-call
    expect(screen.getByText((content) => content.includes("Test Artist"))).toBeInTheDocument();
    // oxlint-disable-next-line typescript/no-unsafe-call
    expect(screen.getByText("2020")).toBeInTheDocument();
  });

  it("shows correct placement result when turn player was correct", () => {
    render(
      // oxlint-disable-next-line typescript/consistent-type-assertions, typescript/no-explicit-any, typescript/no-unsafe-assignment, typescript/no-unsafe-type-assertion
      <GameContext.Provider value={createContextValue() as any}>
        <RoundResults />
      </GameContext.Provider>,
    );

    // oxlint-disable-next-line typescript/no-unsafe-call
    expect(screen.getByText("correct")).toBeInTheDocument();
  });

  it("shows incorrect placement result when turn player was wrong", () => {
    const wrongResolution = {
      ...mockResolution,
      turnPlayerWasCorrect: false,
    };

    render(
      <GameContext.Provider
        value={
          // oxlint-disable-next-line typescript/consistent-type-assertions, typescript/no-unsafe-assignment, typescript/no-unsafe-type-assertion
          createContextValue({
            state: { currentRound: { resolution: wrongResolution } },
            // oxlint-disable-next-line typescript/no-explicit-any
          }) as any
        }
      >
        <RoundResults />
      </GameContext.Provider>,
    );

    // oxlint-disable-next-line typescript/no-unsafe-call
    expect(screen.getByText("incorrect")).toBeInTheDocument();
  });

  it("displays card awards for awarded players", () => {
    render(
      // oxlint-disable-next-line typescript/consistent-type-assertions, typescript/no-explicit-any, typescript/no-unsafe-assignment, typescript/no-unsafe-type-assertion
      <GameContext.Provider value={createContextValue() as any}>
        <RoundResults />
      </GameContext.Provider>,
    );

    // oxlint-disable-next-line typescript/no-unsafe-call
    expect(screen.getByText("Card Awards")).toBeInTheDocument();
    // oxlint-disable-next-line typescript/no-unsafe-call
    expect(screen.getByText("Player1")).toBeInTheDocument();
  });

  it("displays resolved timestamp", () => {
    render(
      // oxlint-disable-next-line typescript/consistent-type-assertions, typescript/no-explicit-any, typescript/no-unsafe-assignment, typescript/no-unsafe-type-assertion
      <GameContext.Provider value={createContextValue() as any}>
        <RoundResults />
      </GameContext.Provider>,
    );

    // oxlint-disable-next-line typescript/no-unsafe-call
    expect(screen.getByText(resolvedAtRegex)).toBeInTheDocument();
  });

  it("shows message when no cards were awarded", () => {
    const noAwardResolution = {
      ...mockResolution,
      awardedPlayerIds: [],
      turnPlayerWasCorrect: false,
    };

    render(
      <GameContext.Provider
        value={
          // oxlint-disable-next-line typescript/consistent-type-assertions, typescript/no-unsafe-assignment, typescript/no-unsafe-type-assertion
          createContextValue({
            state: { currentRound: { resolution: noAwardResolution } },
            // oxlint-disable-next-line typescript/no-explicit-any
          }) as any
        }
      >
        <RoundResults />
      </GameContext.Provider>,
    );

    // oxlint-disable-next-line typescript/no-unsafe-call
    expect(screen.getByText("No cards were awarded this round")).toBeInTheDocument();
  });

  it("highlights current user with (You) indicator", () => {
    render(
      // oxlint-disable-next-line typescript/consistent-type-assertions, typescript/no-explicit-any, typescript/no-unsafe-assignment, typescript/no-unsafe-type-assertion
      <GameContext.Provider value={createContextValue() as any}>
        <RoundResults />
      </GameContext.Provider>,
    );

    // oxlint-disable-next-line typescript/no-unsafe-call
    expect(screen.getByText("(You)")).toBeInTheDocument();
  });

  it("shows host controls when user is host", () => {
    render(
      // oxlint-disable-next-line typescript/consistent-type-assertions, typescript/no-explicit-any, typescript/no-unsafe-assignment, typescript/no-unsafe-type-assertion
      <GameContext.Provider value={createContextValue() as any}>
        <RoundResults />
      </GameContext.Provider>,
    );

    // oxlint-disable-next-line typescript/no-unsafe-call
    expect(screen.getByRole("button", { name: startNextRoundRegex })).toBeInTheDocument();
  });

  it("shows waiting state when user is not host", () => {
    render(
      // oxlint-disable-next-line typescript/consistent-type-assertions, typescript/no-explicit-any, typescript/no-unsafe-assignment, typescript/no-unsafe-type-assertion
      <GameContext.Provider value={createContextValue({ state: { me: mockPlayers[1] } }) as any}>
        <RoundResults />
      </GameContext.Provider>,
    );

    // oxlint-disable-next-line typescript/no-unsafe-call
    expect(screen.getByText(waitingForHostRegex)).toBeInTheDocument();
  });
});
