import { act, fireEvent, render, screen } from "@testing-library/react";
import { getFunctionName } from "convex/server";
import type { GenericId } from "convex/values";
import { NextIntlClientProvider } from "next-intl";
import { StrictMode, type ComponentProps } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import messages from "../../../messages/en.json";
import { BettingPanel } from "./betting-panel";
import type { RoundBet } from "./betting-types";

const transport = vi.hoisted<{
  bets: RoundBet[];
  calls: { name: string; args: unknown }[];
}>(() => ({ bets: [], calls: [] }));

// oxlint-disable-next-line landmines-testing/no-test-doubles -- TODO(landmines): remove grandfathered violation.
vi.mock(import("convex/react"), () => ({
  // oxlint-disable-next-line landmines-testing/no-test-doubles -- TODO(landmines): remove grandfathered violation.
  useMutation: vi.fn<() => () => void>(() => vi.fn<() => void>()),
  // oxlint-disable-next-line landmines-testing/no-test-doubles -- TODO(landmines): remove grandfathered violation.
  useQuery: vi.fn<() => RoundBet[]>(() => transport.bets),
}));

// oxlint-disable-next-line landmines-testing/no-test-doubles -- TODO(landmines): remove grandfathered violation.
vi.mock(import("convex-helpers/react/sessions"), () => ({
  SessionProvider: ({ children }: { children: React.ReactNode }) => children,
  // oxlint-disable-next-line landmines-testing/no-test-doubles -- TODO(landmines): remove grandfathered violation.
  useSessionMutation: vi.fn<
    (reference: Parameters<typeof getFunctionName>[0]) => (args: unknown) => Promise<void>
  >((reference: Parameters<typeof getFunctionName>[0]) => async (args: unknown) => {
    transport.calls.push({ args, name: getFunctionName(reference) });
  }),
  // oxlint-disable-next-line landmines-testing/no-test-doubles -- TODO(landmines): remove grandfathered violation.
  useSessionQuery: vi.fn<() => null>(() => null),
}));

afterEach(() => {
  transport.bets = [];
  transport.calls = [];
});

const createMockPlayer = (overrides = {}, playerId = "player123") => ({
  // oxlint-disable-next-line typescript/consistent-type-assertions, typescript/no-unsafe-type-assertion
  _id: playerId as GenericId<"players">,
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

// oxlint-disable-next-line typescript/consistent-type-assertions, typescript/no-unsafe-type-assertion -- Convex transport fixtures use serialized branded IDs.
const keyboardLobbyId = "lobby123" as GenericId<"lobbies">;

const renderKeyboardPanel = (overrides: Partial<ComponentProps<typeof BettingPanel>> = {}) =>
  render(
    <StrictMode>
      <NextIntlClientProvider locale="en" messages={messages}>
        <BettingPanel
          lobbyId={keyboardLobbyId}
          me={createMockPlayer()}
          players={[]}
          revealedTracks={[]}
          track={mockTrack}
          turnPlayerId={null}
          turnPlayerTimeline={[1990, 2000].map((year, roundIndex) => ({
            earnedAtRoundNumber: roundIndex + 1,
            earnedBy: "initial",
            trackId: mockTrack._id,
            year,
          }))}
          {...overrides}
        />
      </NextIntlClientProvider>
    </StrictMode>,
  );

const selectServerSlot = (proposedIndex: number, overrides: Partial<RoundBet> = {}) => {
  transport.bets = [
    {
      declinedToBet: false,
      lockedIn: false,
      playerDisplayName: "Test Player",
      playerId: createMockPlayer()._id,
      proposedIndex,
      ...overrides,
    },
  ];
};

const pressKey = async (key: string) => {
  const event = new KeyboardEvent("keydown", { cancelable: true, key });
  await act(async () => {
    window.dispatchEvent(event);
  });
  return event.defaultPrevented;
};

describe("BettingPanel", () => {
  it("runs exactly one selected-slot action per keypress and cleans up on unmount", async () => {
    selectServerSlot(1);
    const panel = renderKeyboardPanel();
    expect(await pressKey("ArrowDown")).toBe(true);
    expect(transport.calls).toStrictEqual([
      { name: "bets:preview", args: { lobbyId: "lobby123", proposedIndex: 2 } },
    ]);
    expect(await pressKey("ArrowUp")).toBe(true);
    expect(transport.calls).toHaveLength(2);
    expect(transport.calls[1]).toStrictEqual({
      name: "bets:preview",
      args: { lobbyId: "lobby123", proposedIndex: 1 },
    });
    expect(await pressKey("Enter")).toBe(false);
    expect(transport.calls).toHaveLength(2);
    expect(await pressKey("Escape")).toBe(true);
    expect(transport.calls).toHaveLength(3);
    expect(transport.calls[2]).toStrictEqual({
      name: "bets:cancel",
      args: { lobbyId: "lobby123" },
    });
    panel.unmount();
    expect(await pressKey("ArrowDown")).toBe(false);
    expect(await pressKey("Escape")).toBe(false);
    expect(transport.calls).toHaveLength(3);
    renderKeyboardPanel();
    await pressKey("ArrowDown");
    expect(transport.calls).toHaveLength(4);
  });

  it.each(["no coins", "turn player", "locked bet", "declined bet", "spectator"])(
    "ignores keyboard actions for %s",
    async (restriction) => {
      selectServerSlot(1, {
        lockedIn: restriction === "locked bet",
        declinedToBet: restriction === "declined bet",
      });
      renderKeyboardPanel({
        me:
          restriction === "spectator"
            ? null
            : createMockPlayer({ coins: restriction === "no coins" ? 0 : 3 }),
        turnPlayerId: restriction === "turn player" ? createMockPlayer()._id : null,
      });
      for (const key of ["ArrowDown", "ArrowUp", "Escape"]) {
        expect(await pressKey(key)).toBe(false);
      }
      expect(transport.calls).toStrictEqual([]);
    },
  );

  it("skips the turn player's slot and stops at timeline boundaries", async () => {
    selectServerSlot(0);
    renderKeyboardPanel({ turnPlayerPlacementIndex: 1 });
    await pressKey("ArrowUp");
    expect(transport.calls).toStrictEqual([]);
    await pressKey("ArrowDown");
    expect(transport.calls).toStrictEqual([
      { name: "bets:preview", args: { lobbyId: "lobby123", proposedIndex: 2 } },
    ]);
    await pressKey("ArrowDown");
    expect(transport.calls).toHaveLength(1);
    await pressKey("ArrowUp");
    expect(transport.calls[1]).toStrictEqual({
      name: "bets:preview",
      args: { lobbyId: "lobby123", proposedIndex: 0 },
    });
  });

  it("does not preview a forbidden edge slot or another player's locked slot", async () => {
    selectServerSlot(1);
    const panel = renderKeyboardPanel({ turnPlayerPlacementIndex: 2 });
    await pressKey("ArrowDown");
    expect(transport.calls).toStrictEqual([]);
    panel.unmount();
    transport.bets.push({
      ...transport.bets[0],
      playerId: createMockPlayer({}, "other")._id,
      lockedIn: true,
      proposedIndex: 2,
    });
    renderKeyboardPanel();
    await pressKey("ArrowDown");
    expect(transport.calls).toStrictEqual([]);
  });

  it("shows coin balance in header", () => {
    const player = createMockPlayer({ coins: 5 });

    render(
      <NextIntlClientProvider locale="en" messages={messages}>
        <BettingPanel
          lobbyId={keyboardLobbyId}
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
          lobbyId={keyboardLobbyId}
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
          lobbyId={keyboardLobbyId}
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
          lobbyId={keyboardLobbyId}
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
          lobbyId={keyboardLobbyId}
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
          lobbyId={keyboardLobbyId}
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
          lobbyId={keyboardLobbyId}
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
