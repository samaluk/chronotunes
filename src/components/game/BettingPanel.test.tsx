import { render, screen } from "@testing-library/react";
import type { GenericId } from "convex/values";
import { describe, expect, it, vi } from "vitest";
import { BettingPanel } from "./BettingPanel";

vi.mock("convex/react", () => ({
  useMutation: vi.fn(() => vi.fn()),
  useQuery: vi.fn(() => []),
}));

vi.mock("convex-helpers/react/sessions", () => ({
  useSessionQuery: vi.fn(() => null),
  useSessionMutation: vi.fn(() => vi.fn()),
  SessionProvider: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock("react", () => ({
  useEffect: vi.fn((fn) => fn()),
  useState: vi.fn((initial) => {
    if (typeof initial === "function") {
      return [initial(), vi.fn()];
    }
    return [initial, vi.fn()];
  }),
  useCallback: vi.fn((fn) => fn),
  useMemo: vi.fn((fn) => fn()),
}));

const createMockPlayer = (overrides = {}) => ({
  _id: "player123" as GenericId<"players">,
  displayName: "Test Player",
  timeline: [],
  timelineSize: 0,
  coins: 3,
  ...overrides,
});

const mockTrack = {
  _id: "track123" as GenericId<"tracks">,
  title: "Test Song",
  artist: "Test Artist",
  year: 1990,
};

describe("BettingPanel", () => {
  it("shows coin balance in header", () => {
    const player = createMockPlayer({ coins: 5 });

    render(
      <BettingPanel
        lobbyId={"lobby123" as GenericId<"lobbies">}
        me={player}
        track={mockTrack}
        turnPlayerTimeline={[]}
        turnPlayerTimelineSize={0}
      />,
    );

    expect(screen.getByText("5 coins")).toBeInTheDocument();
  });

  it("shows 'Not enough coins' message when player has no coins", () => {
    const player = createMockPlayer({ coins: 0 });

    render(
      <BettingPanel
        lobbyId={"lobby123" as GenericId<"lobbies">}
        me={player}
        track={mockTrack}
        turnPlayerTimeline={[]}
        turnPlayerTimelineSize={0}
      />,
    );

    expect(screen.getByText("Not enough coins to place a bet")).toBeInTheDocument();
  });

  it("shows loading state when track is null", () => {
    const player = createMockPlayer();

    render(
      <BettingPanel
        lobbyId={"lobby123" as GenericId<"lobbies">}
        me={player}
        track={null}
        turnPlayerTimeline={[]}
        turnPlayerTimelineSize={0}
      />,
    );

    expect(screen.getByText("Loading track...")).toBeInTheDocument();
  });

  it("displays header section", () => {
    const player = createMockPlayer();

    render(
      <BettingPanel
        lobbyId={"lobby123" as GenericId<"lobbies">}
        me={player}
        track={mockTrack}
        turnPlayerTimeline={[]}
        turnPlayerTimelineSize={0}
      />,
    );

    expect(screen.getByText("Place Your Bet")).toBeInTheDocument();
    expect(screen.getByText("Guess where the song belongs on the timeline")).toBeInTheDocument();
  });
});
