import { render, screen } from "@testing-library/react";
import type { GenericId } from "convex/values";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";
import messages from "../../../messages/en.json";
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
  useRef: vi.fn((initial) => ({ current: initial })),
}));

const createMockPlayer = (overrides = {}) => ({
  _id: "player123" as GenericId<"players">,
  displayName: "Test Player",
  timeline: [],
  timelineSize: 0,
  coins: 3,
  isHost: false,
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
      <NextIntlClientProvider locale="en" messages={messages}>
        <BettingPanel
          lobbyId={"lobby123" as GenericId<"lobbies">}
          me={player}
          players={[]}
          revealedTracks={[]}
          track={mockTrack}
          turnPlayerId={null}
          turnPlayerTimeline={[]}
        />
      </NextIntlClientProvider>,
    );

    expect(screen.getByText("5 coins")).toBeInTheDocument();
  });

  it("shows 'Not enough coins' message when player has no coins", () => {
    const player = createMockPlayer({ coins: 0 });

    render(
      <NextIntlClientProvider locale="en" messages={messages}>
        <BettingPanel
          lobbyId={"lobby123" as GenericId<"lobbies">}
          me={player}
          players={[]}
          revealedTracks={[]}
          track={mockTrack}
          turnPlayerId={null}
          turnPlayerTimeline={[]}
        />
      </NextIntlClientProvider>,
    );

    expect(screen.getByText("Not enough coins to place a bet")).toBeInTheDocument();
  });

  it("shows loading state when track is null", () => {
    const player = createMockPlayer();

    render(
      <NextIntlClientProvider locale="en" messages={messages}>
        <BettingPanel
          lobbyId={"lobby123" as GenericId<"lobbies">}
          me={player}
          players={[]}
          revealedTracks={[]}
          track={null}
          turnPlayerId={null}
          turnPlayerTimeline={[]}
        />
      </NextIntlClientProvider>,
    );

    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("displays header section", () => {
    const player = createMockPlayer();

    render(
      <NextIntlClientProvider locale="en" messages={messages}>
        <BettingPanel
          lobbyId={"lobby123" as GenericId<"lobbies">}
          me={player}
          players={[]}
          revealedTracks={[]}
          track={mockTrack}
          turnPlayerId={null}
          turnPlayerTimeline={[]}
        />
      </NextIntlClientProvider>,
    );

    expect(screen.getByText("Place Your Bet")).toBeInTheDocument();
    expect(screen.getByText("Choose an open placement slot for the song")).toBeInTheDocument();
    expect(screen.getByText("Open slot")).toBeInTheDocument();
    expect(screen.getByText("Don't bet")).toBeInTheDocument();
  });

  it("marks the turn player's placement slot", () => {
    const player = createMockPlayer();

    render(
      <NextIntlClientProvider locale="en" messages={messages}>
        <BettingPanel
          lobbyId={"lobby123" as GenericId<"lobbies">}
          me={player}
          players={[]}
          revealedTracks={[]}
          track={mockTrack}
          turnPlayerId={null}
          turnPlayerPlacementIndex={0}
          turnPlayerTimeline={[]}
        />
      </NextIntlClientProvider>,
    );

    const label = screen.getByText("Turn player's pick");
    const button = label.closest("button");

    expect(button).toHaveAttribute("aria-disabled", "true");
  });
});
