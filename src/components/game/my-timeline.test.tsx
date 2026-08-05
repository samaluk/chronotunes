import { render, screen } from "@testing-library/react";
import type { GenericId } from "convex/values";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { GameContext } from "./game-provider";
import { MyTimeline } from "./my-timeline";

const CARD_REGEX = /card/i;

const now = Date.now();
const mockLobbyId = "lobby123" as GenericId<"lobbies">;

const createMockPlayer = (
  overrides: Partial<{
    timeline: {
      trackId: GenericId<"tracks">;
      year: number;
      earnedAtRoundNumber: number;
      earnedBy: "placement" | "bet" | "initial";
    }[];
    timelineSize: number;
  }> = {},
): any => ({
  _creationTime: now,
  _id: "player123" as GenericId<"players">,
  coins: 3,
  createdAt: now,
  displayName: "Test Player",
  isHost: false,
  lobbyId: mockLobbyId,
  sessionId: "session1",
  timeline: [],
  timelineSize: 0,
  ...overrides,
});

const createMockTrack = (id: string, title: string, artist: string, year: number): any => ({
  _id: id as GenericId<"tracks">,
  artist,
  title,
  year,
});

const mockUseQuery = vi.fn();

vi.mock(import("convex/react"), () => ({
  useQuery: vi.fn(),
}));

vi.mock(import("usehooks-ts"), () => ({
  useIsMounted: () => () => true,
}));

vi.mock(import("react"), async () => {
  const actual = await vi.importActual("react");
  return {
    ...actual,
    useMemo: vi.fn((fn) => fn()),
  };
});

import { useQuery } from "convex/react";

const createGameContext = (player: any): any => ({
  actions: {
    handleModalClose: vi.fn(),
    setSelectedPlayerForTimeline: vi.fn(),
  },
  meta: {
    code: "ABC123",
    lobbyId: mockLobbyId,
    sessionId: "session1",
  },
  state: {
    bettingWindowSeconds: undefined,
    currentRound: null,
    game: null,
    isGameFinished: false,
    isMyTurn: false,
    lobby: null,
    me: player,
    phase: "placing",
    players: [player],
    revealedTracks: [],
    selectedPlayerForTimeline: null,
    showLiveBets: false,
    track: null,
    turnPlayer: null,
    turnSeconds: undefined,
  },
});

beforeEach(() => {
  vi.clearAllMocks();
  (useQuery as unknown as ReturnType<typeof vi.fn>).mockImplementation(mockUseQuery);
});

describe(MyTimeline, () => {
  test("displays empty state when timeline is empty", () => {
    const mockPlayer = createMockPlayer();
    mockUseQuery.mockReturnValue([]);

    const TestWrapper = ({ children }: { children: React.ReactNode }) => (
      <GameContext.Provider value={createGameContext(mockPlayer)}>{children}</GameContext.Provider>
    );

    render(<MyTimeline />, { wrapper: TestWrapper });

    expect(screen.queryByText("No cards yet")).not.toBeNull();
    expect(screen.queryByText("Place songs on your timeline to collect cards")).not.toBeNull();
  });

  test("does not show card count when populated", () => {
    const mockPlayer = createMockPlayer({
      timeline: [
        {
          earnedAtRoundNumber: 1,
          earnedBy: "placement",
          trackId: "track1" as GenericId<"tracks">,
          year: 1990,
        },
      ],
      timelineSize: 1,
    });

    mockUseQuery.mockReturnValue([createMockTrack("track1", "Test Song", "Test Artist", 1990)]);

    const TestWrapper = ({ children }: { children: React.ReactNode }) => (
      <GameContext.Provider value={createGameContext(mockPlayer)}>{children}</GameContext.Provider>
    );

    render(<MyTimeline />, { wrapper: TestWrapper });

    expect(screen.queryByText(CARD_REGEX)).toBeNull();
  });

  test("displays multiple cards correctly", () => {
    const mockPlayer = createMockPlayer({
      timeline: [
        {
          earnedAtRoundNumber: 1,
          earnedBy: "placement",
          trackId: "track1" as GenericId<"tracks">,
          year: 1985,
        },
        {
          earnedAtRoundNumber: 2,
          earnedBy: "bet",
          trackId: "track2" as GenericId<"tracks">,
          year: 1995,
        },
      ],
      timelineSize: 2,
    });

    mockUseQuery.mockReturnValue([
      createMockTrack("track1", "Song One", "Artist One", 1985),
      createMockTrack("track2", "Song Two", "Artist Two", 1995),
    ]);

    const TestWrapper = ({ children }: { children: React.ReactNode }) => (
      <GameContext.Provider value={createGameContext(mockPlayer)}>{children}</GameContext.Provider>
    );

    render(<MyTimeline />, { wrapper: TestWrapper });

    expect(screen.queryByText("Song One")).not.toBeNull();
    expect(screen.queryByText("Song Two")).not.toBeNull();
    expect(screen.queryByText("Artist One")).not.toBeNull();
    expect(screen.queryByText("Artist Two")).not.toBeNull();
  });

  test("shows placement indicator for cards earned by placement", () => {
    const mockPlayer = createMockPlayer({
      timeline: [
        {
          earnedAtRoundNumber: 1,
          earnedBy: "placement",
          trackId: "track1" as GenericId<"tracks">,
          year: 1990,
        },
      ],
      timelineSize: 1,
    });

    mockUseQuery.mockReturnValue([createMockTrack("track1", "Test Song", "Test Artist", 1990)]);

    const TestWrapper = ({ children }: { children: React.ReactNode }) => (
      <GameContext.Provider value={createGameContext(mockPlayer)}>{children}</GameContext.Provider>
    );

    const { container } = render(<MyTimeline />, { wrapper: TestWrapper });

    expect(container.querySelector(".lucide-target")).not.toBeNull();
  });

  test("shows bet indicator for cards earned by bet", () => {
    const mockPlayer = createMockPlayer({
      timeline: [
        {
          earnedAtRoundNumber: 1,
          earnedBy: "bet",
          trackId: "track1" as GenericId<"tracks">,
          year: 1990,
        },
      ],
      timelineSize: 1,
    });

    mockUseQuery.mockReturnValue([createMockTrack("track1", "Test Song", "Test Artist", 1990)]);

    const TestWrapper = ({ children }: { children: React.ReactNode }) => (
      <GameContext.Provider value={createGameContext(mockPlayer)}>{children}</GameContext.Provider>
    );

    const { container } = render(<MyTimeline />, { wrapper: TestWrapper });

    expect(container.querySelector(".lucide-trophy")).not.toBeNull();
  });

  test("displays year for each card", () => {
    const mockPlayer = createMockPlayer({
      timeline: [
        {
          earnedAtRoundNumber: 1,
          earnedBy: "placement",
          trackId: "track1" as GenericId<"tracks">,
          year: 1990,
        },
      ],
      timelineSize: 1,
    });

    mockUseQuery.mockReturnValue([createMockTrack("track1", "Test Song", "Test Artist", 1990)]);

    const TestWrapper = ({ children }: { children: React.ReactNode }) => (
      <GameContext.Provider value={createGameContext(mockPlayer)}>{children}</GameContext.Provider>
    );

    render(<MyTimeline />, { wrapper: TestWrapper });

    const yearElements = screen.getAllByText("1990");
    expect(yearElements.length).toBeGreaterThanOrEqual(1);
  });
});
