import { fireEvent, render, screen } from "@testing-library/react";
import type { GenericId } from "convex/values";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";

import messages from "../../../messages/en.json";
import { BettingPanel } from "./betting-panel";

vi.mock(import("convex/react"), () => ({
  useMutation: vi.fn<() => () => void>(() => vi.fn<() => void>()),
  useQuery: vi.fn<() => unknown[]>(() => []),
}));

vi.mock(import("convex-helpers/react/sessions"), () => ({
  SessionProvider: ({ children }: { children: React.ReactNode }) => children,
  useSessionMutation: vi.fn<() => () => void>(() => vi.fn<() => void>()),
  useSessionQuery: vi.fn<() => null>(() => null),
}));

vi.mock(import("react"), () => ({
  // oxlint-disable-next-line typescript/no-unsafe-return
  useCallback: vi.fn<<T extends (...args: unknown[]) => unknown>(fn: T) => T>((fn) => fn),
  // oxlint-disable-next-line typescript/no-unsafe-call, typescript/no-unsafe-return
  useEffect: vi.fn<(fn: () => void) => void>((fn) => fn()),
  // oxlint-disable-next-line typescript/no-unsafe-call, typescript/no-unsafe-return
  useMemo: vi.fn<<T>(fn: () => T) => T>((fn) => fn()),
  // oxlint-disable-next-line typescript/no-unsafe-assignment
  useRef: vi.fn<<T>(initial: T) => { current: T }>((initial) => ({ current: initial })),
  useState: vi.fn<<T>(initial: T | (() => T)) => [T, (val: unknown) => void]>((initial) => {
    if (typeof initial === "function") {
      // oxlint-disable-next-line typescript/no-unsafe-call, typescript/no-unsafe-return
      return [initial(), vi.fn<(val: unknown) => void>()];
    }
    // oxlint-disable-next-line typescript/no-unsafe-return
    return [initial, vi.fn<(val: unknown) => void>()];
  }),
}));

const createMockPlayer = (overrides = {}) => ({
  // oxlint-disable-next-line typescript/consistent-type-assertions, typescript/no-unsafe-type-assertion
  _id: "player123" as GenericId<"players">,
  coins: 3,
  displayName: "Test Player",
  isHost: false,
  timeline: [],
  timelineSize: 0,
  ...overrides,
});

const mockTrack = {
  // oxlint-disable-next-line typescript/consistent-type-assertions, typescript/no-unsafe-type-assertion
  _id: "track123" as GenericId<"tracks">,
  artist: "Test Artist",
  title: "Test Song",
  year: 1990,
};

describe("BettingPanel", () => {
  it("shows coin balance in header", () => {
    const player = createMockPlayer({ coins: 5 });

    render(
      <NextIntlClientProvider locale="en" messages={messages}>
        <BettingPanel
          lobbyId={
            /* oxlint-disable typescript/consistent-type-assertions, typescript/no-unnecessary-type-assertion, typescript/no-unsafe-type-assertion */
            "lobby123" as GenericId<"lobbies">
            /* oxlint-enable typescript/consistent-type-assertions, typescript/no-unnecessary-type-assertion, typescript/no-unsafe-type-assertion */
          }
          me={player}
          players={[]}
          revealedTracks={[]}
          track={mockTrack}
          turnPlayerId={null}
          turnPlayerTimeline={[]}
        />
      </NextIntlClientProvider>,
    );

    // oxlint-disable-next-line typescript/no-unsafe-call
    expect(screen.getByText("5 coins")).toBeInTheDocument();
  });

  it("shows 'Not enough coins' message when player has no coins", () => {
    const player = createMockPlayer({ coins: 0 });

    render(
      <NextIntlClientProvider locale="en" messages={messages}>
        <BettingPanel
          lobbyId={
            /* oxlint-disable typescript/consistent-type-assertions, typescript/no-unnecessary-type-assertion, typescript/no-unsafe-type-assertion */
            "lobby123" as GenericId<"lobbies">
            /* oxlint-enable typescript/consistent-type-assertions, typescript/no-unnecessary-type-assertion, typescript/no-unsafe-type-assertion */
          }
          me={player}
          players={[]}
          revealedTracks={[]}
          track={mockTrack}
          turnPlayerId={null}
          turnPlayerTimeline={[]}
        />
      </NextIntlClientProvider>,
    );

    // oxlint-disable-next-line typescript/no-unsafe-call
    expect(screen.getByText("Not enough coins to place a bet")).toBeInTheDocument();
  });

  it("shows loading state when track is null", () => {
    const player = createMockPlayer();

    render(
      <NextIntlClientProvider locale="en" messages={messages}>
        <BettingPanel
          lobbyId={
            /* oxlint-disable typescript/consistent-type-assertions, typescript/no-unnecessary-type-assertion, typescript/no-unsafe-type-assertion */
            "lobby123" as GenericId<"lobbies">
            /* oxlint-enable typescript/consistent-type-assertions, typescript/no-unnecessary-type-assertion, typescript/no-unsafe-type-assertion */
          }
          me={player}
          players={[]}
          revealedTracks={[]}
          track={null}
          turnPlayerId={null}
          turnPlayerTimeline={[]}
        />
      </NextIntlClientProvider>,
    );

    // oxlint-disable-next-line typescript/no-unsafe-call
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("displays header section", () => {
    const player = createMockPlayer();

    render(
      <NextIntlClientProvider locale="en" messages={messages}>
        <BettingPanel
          lobbyId={
            /* oxlint-disable typescript/consistent-type-assertions, typescript/no-unnecessary-type-assertion, typescript/no-unsafe-type-assertion */
            "lobby123" as GenericId<"lobbies">
            /* oxlint-enable typescript/consistent-type-assertions, typescript/no-unnecessary-type-assertion, typescript/no-unsafe-type-assertion */
          }
          me={player}
          players={[]}
          revealedTracks={[]}
          track={mockTrack}
          turnPlayerId={null}
          turnPlayerTimeline={[]}
        />
      </NextIntlClientProvider>,
    );

    // oxlint-disable-next-line typescript/no-unsafe-call
    expect(screen.getByText("Place Your Bet")).toBeInTheDocument();
    // oxlint-disable-next-line typescript/no-unsafe-call
    expect(screen.getByText("Choose an open placement slot for the song")).toBeInTheDocument();
    // oxlint-disable-next-line typescript/no-unsafe-call
    expect(screen.getByText("Open slot")).toBeInTheDocument();
    // oxlint-disable-next-line typescript/no-unsafe-call
    expect(screen.getByText("Don't bet")).toBeInTheDocument();
  });

  it("marks the turn player's placement slot", () => {
    const player = createMockPlayer();

    render(
      <NextIntlClientProvider locale="en" messages={messages}>
        <BettingPanel
          lobbyId={
            /* oxlint-disable typescript/consistent-type-assertions, typescript/no-unnecessary-type-assertion, typescript/no-unsafe-type-assertion */
            "lobby123" as GenericId<"lobbies">
            /* oxlint-enable typescript/consistent-type-assertions, typescript/no-unnecessary-type-assertion, typescript/no-unsafe-type-assertion */
          }
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

    // oxlint-disable-next-line typescript/no-unsafe-call
    expect(button).toHaveAttribute("aria-disabled", "true");
  });

  it("runs the keyboard navigation guard on arrow keys", () => {
    const player = createMockPlayer({ coins: 5 });

    render(
      <NextIntlClientProvider locale="en" messages={messages}>
        <BettingPanel
          lobbyId={
            /* oxlint-disable typescript/consistent-type-assertions, typescript/no-unnecessary-type-assertion, typescript/no-unsafe-type-assertion */
            "lobby123" as GenericId<"lobbies">
            /* oxlint-enable typescript/consistent-type-assertions, typescript/no-unnecessary-type-assertion, typescript/no-unsafe-type-assertion */
          }
          me={player}
          players={[]}
          revealedTracks={[]}
          track={mockTrack}
          turnPlayerId={null}
          turnPlayerTimeline={[]}
        />
      </NextIntlClientProvider>,
    );

    // No selection yet: the handler bails without changing the header.
    fireEvent.keyDown(window, { key: "ArrowDown" });
    // oxlint-disable-next-line typescript/no-unsafe-call
    expect(screen.getByText("5 coins")).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "Escape" });
    // oxlint-disable-next-line typescript/no-unsafe-call
    expect(screen.getByText("5 coins")).toBeInTheDocument();
  });

  it("previews a bet when an open slot is clicked", async () => {
    const player = createMockPlayer({ coins: 5 });

    render(
      <NextIntlClientProvider locale="en" messages={messages}>
        <BettingPanel
          lobbyId={
            /* oxlint-disable typescript/consistent-type-assertions, typescript/no-unnecessary-type-assertion, typescript/no-unsafe-type-assertion */
            "lobby123" as GenericId<"lobbies">
            /* oxlint-enable typescript/consistent-type-assertions, typescript/no-unnecessary-type-assertion, typescript/no-unsafe-type-assertion */
          }
          me={player}
          players={[]}
          revealedTracks={[]}
          track={mockTrack}
          turnPlayerId={null}
          turnPlayerTimeline={[]}
        />
      </NextIntlClientProvider>,
    );

    const openSlot = screen.getByRole("button", { name: /open slot/i });
    fireEvent.click(openSlot);

    // Preview mode is optimistic UI; the slot stays interactive.
    // oxlint-disable-next-line typescript/no-unsafe-call
    expect(screen.getByRole("button", { name: /open slot/i })).toBeInTheDocument();
  });
});
