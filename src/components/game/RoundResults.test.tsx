import { cleanup, render, screen } from "@testing-library/react";
import type { GenericId } from "convex/values";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RoundResults } from "./RoundResults";

vi.mock("convex/react", () => ({
  useMutation: vi.fn(() => vi.fn()),
}));

vi.mock("@/lib/hooks/use-session-id", () => ({
  useSessionId: vi.fn(() => "session123"),
}));

vi.mock("react", () => ({
  useState: vi.fn((initial) => {
    if (typeof initial === "function") {
      return [initial(), vi.fn()];
    }
    return [initial, vi.fn()];
  }),
}));

afterEach(() => {
  cleanup();
});

const createMockPlayer = (overrides = {}) => ({
  _id: "player1" as GenericId<"players">,
  displayName: "TestPlayer",
  timeline: [],
  timelineSize: 0,
  coins: 3,
  isHost: true,
  sessionId: "session1",
  ...overrides,
});

const mockLobbyId = "lobby123" as GenericId<"lobbies">;
const mockPlayers = [
  createMockPlayer({
    _id: "player1" as GenericId<"players">,
    displayName: "Player1",
    isHost: true,
    sessionId: "session1",
  }),
  createMockPlayer({
    _id: "player2" as GenericId<"players">,
    displayName: "Player2",
    isHost: false,
    sessionId: "session2",
    timelineSize: 1,
    coins: 2,
  }),
];

const mockTrack = {
  _id: "track1" as GenericId<"tracks">,
  title: "Test Song",
  artist: "Test Artist",
  year: 2020,
};

const mockResolution = {
  validIndexMin: 0,
  validIndexMax: 1,
  turnPlayerWasCorrect: true,
  awardedPlayerIds: ["player1"] as GenericId<"players">[],
  coinDeltas: [],
  resolvedAt: Date.now(),
};

describe("RoundResults", () => {
  it("displays song title, artist, and year", () => {
    render(
      <RoundResults
        lobbyId={mockLobbyId}
        track={mockTrack}
        resolution={mockResolution}
        turnPlayer={mockPlayers[0]}
        bets={[]}
        players={mockPlayers}
        me={null}
      />,
    );

    expect(screen.getByText((content) => content.includes("Test Song"))).toBeInTheDocument();
    expect(screen.getByText((content) => content.includes("Test Artist"))).toBeInTheDocument();
    expect(screen.getByText("2020")).toBeInTheDocument();
  });

  it("shows correct placement result when turn player was correct", () => {
    render(
      <RoundResults
        lobbyId={mockLobbyId}
        track={mockTrack}
        resolution={mockResolution}
        turnPlayer={mockPlayers[0]}
        bets={[]}
        players={mockPlayers}
        me={null}
      />,
    );

    expect(screen.getByText("Placement Correct!")).toBeInTheDocument();
  });

  it("shows incorrect placement result when turn player was wrong", () => {
    const wrongResolution = {
      ...mockResolution,
      turnPlayerWasCorrect: false,
    };

    render(
      <RoundResults
        lobbyId={mockLobbyId}
        track={mockTrack}
        resolution={wrongResolution}
        turnPlayer={mockPlayers[0]}
        bets={[]}
        players={mockPlayers}
        me={null}
      />,
    );

    expect(screen.getByText("Placement Incorrect")).toBeInTheDocument();
  });

  it("displays card awards for awarded players", () => {
    render(
      <RoundResults
        lobbyId={mockLobbyId}
        track={mockTrack}
        resolution={mockResolution}
        turnPlayer={mockPlayers[0]}
        bets={[]}
        players={mockPlayers}
        me={null}
      />,
    );

    expect(screen.getByText("Card Awards")).toBeInTheDocument();
    expect(screen.getByText("Player1")).toBeInTheDocument();
  });

  it("displays betting results when bets exist", () => {
    const bets = [
      {
        playerId: "player2" as GenericId<"players">,
        playerDisplayName: "Player2",
        proposedIndex: 0,
        status: "lost" as const,
      },
    ];

    render(
      <RoundResults
        lobbyId={mockLobbyId}
        track={mockTrack}
        resolution={mockResolution}
        turnPlayer={mockPlayers[0]}
        bets={bets}
        players={mockPlayers}
        me={null}
      />,
    );

    expect(screen.getByText("Betting Results")).toBeInTheDocument();
    expect(screen.getByText("Player2")).toBeInTheDocument();
  });

  it("shows won status for correct bets", () => {
    const bets = [
      {
        playerId: "player2" as GenericId<"players">,
        playerDisplayName: "Player2",
        proposedIndex: 0,
        status: "won" as const,
      },
    ];

    render(
      <RoundResults
        lobbyId={mockLobbyId}
        track={mockTrack}
        resolution={mockResolution}
        turnPlayer={mockPlayers[0]}
        bets={bets}
        players={mockPlayers}
        me={null}
      />,
    );

    expect(screen.getByText("Won")).toBeInTheDocument();
  });

  it("shows host controls when user is host", () => {
    render(
      <RoundResults
        lobbyId={mockLobbyId}
        track={mockTrack}
        resolution={mockResolution}
        turnPlayer={mockPlayers[0]}
        bets={[]}
        players={mockPlayers}
        me={mockPlayers[0]}
      />,
    );

    expect(screen.getByRole("button", { name: /Start Next Round/i })).toBeInTheDocument();
  });

  it("shows waiting state when user is not host", () => {
    render(
      <RoundResults
        lobbyId={mockLobbyId}
        track={mockTrack}
        resolution={mockResolution}
        turnPlayer={mockPlayers[0]}
        bets={[]}
        players={mockPlayers}
        me={mockPlayers[1]}
      />,
    );

    expect(screen.getByText(/Waiting for host to start next round/i)).toBeInTheDocument();
  });

  it("displays resolved timestamp", () => {
    render(
      <RoundResults
        lobbyId={mockLobbyId}
        track={mockTrack}
        resolution={mockResolution}
        turnPlayer={mockPlayers[0]}
        bets={[]}
        players={mockPlayers}
        me={null}
      />,
    );

    expect(screen.getByText(/Resolved at/i)).toBeInTheDocument();
  });

  it("shows message when no cards were awarded", () => {
    const noAwardResolution = {
      ...mockResolution,
      turnPlayerWasCorrect: false,
      awardedPlayerIds: [],
    };

    render(
      <RoundResults
        lobbyId={mockLobbyId}
        track={mockTrack}
        resolution={noAwardResolution}
        turnPlayer={mockPlayers[0]}
        bets={[]}
        players={mockPlayers}
        me={null}
      />,
    );

    expect(screen.getByText("No cards were awarded this round")).toBeInTheDocument();
  });

  it("highlights current user with (You) indicator", () => {
    render(
      <RoundResults
        lobbyId={mockLobbyId}
        track={mockTrack}
        resolution={mockResolution}
        turnPlayer={mockPlayers[0]}
        bets={[]}
        players={mockPlayers}
        me={mockPlayers[0]}
      />,
    );

    expect(screen.getByText("(You)")).toBeInTheDocument();
  });
});
