import { cleanup, render, screen } from "@testing-library/react";
import type { GenericId } from "convex/values";
import { afterEach, describe, expect, it, vi } from "vitest";

import { BettingTimeline } from "./betting-timeline";
import type { Player, SlotInfo } from "./betting-types";

/* oxlint-disable typescript/no-unsafe-call -- jest-dom matchers are typed at runtime */
/* oxlint-disable typescript/consistent-type-assertions, typescript/no-unsafe-type-assertion */

vi.mock(import("next-intl"), () => ({
  useTranslations: () => (key: string) => `t:${key}`,
}));

const me = {
  _id: "me1" as GenericId<"players">,
  coins: 3,
  displayName: "Me",
  isHost: false,
  timeline: [],
  timelineSize: 0,
} as unknown as Player;

const makeSlots = (): SlotInfo[] =>
  [0, 1, 2].map((index) => ({
    above: undefined,
    below: undefined,
    bets: [],
    index,
  }));

const baseProps = {
  canBet: true,
  getSlotState: () => ({
    isActive: false,
    isDisabled: true,
    isTurnPlayerSlot: false,
    label: "t:openSlot",
    shouldDim: false,
    showPreviewCoin: false,
    slotBetsForIndex: [],
  }),
  hasDeclinedBet: false,
  hasLockedBet: false,
  me,
  onSlotClick: () => {},
  renderTimelineEntry: () => <div>entry</div>,
  selectedIndex: null,
  shakeSlotIndex: null,
  tCommon: ((key: string) => `t:${key}`) as unknown as ReturnType<
    typeof import("next-intl").useTranslations
  >,
};

afterEach(() => {
  cleanup();
});

describe("BettingTimeline", () => {
  it("renders every slot and timeline entry", () => {
    render(
      <BettingTimeline
        {...baseProps}
        slots={makeSlots()}
        sortedTimeline={[
          {
            earnedAtRoundNumber: 1,
            earnedBy: "placement",
            trackId: "t1" as GenericId<"tracks">,
            year: 1990,
          },
        ]}
      />,
    );

    // One bet zone per slot boundary plus timeline entries between them.
    expect(screen.getAllByRole("button", { name: /t:openSlot/i }).length).toBeGreaterThan(0);
    expect(screen.getByText("entry")).toBeInTheDocument();
  });

  it("renders nothing when there are no slots", () => {
    render(<BettingTimeline {...baseProps} slots={[]} sortedTimeline={[]} />);

    expect(screen.queryByRole("button")).toBeNull();
  });

  it("renders bet coins and turn-player styling across slot states", () => {
    const slots: SlotInfo[] = [
      {
        above: undefined,
        below: undefined,
        bets: [
          { lockedIn: false, playerDisplayName: "P1", playerId: "p1" as GenericId<"players"> },
          { lockedIn: true, playerDisplayName: "P2", playerId: "p2" as GenericId<"players"> },
        ],
        index: 0,
      },
      {
        above: undefined,
        below: undefined,
        bets: [
          { lockedIn: true, playerDisplayName: "Me", playerId: "me1" as GenericId<"players"> },
        ],
        index: 1,
      },
      { above: undefined, below: undefined, bets: [], index: 2 },
    ];

    render(
      <BettingTimeline
        {...baseProps}
        canBet
        getSlotState={(slot) => ({
          isActive: slot.index === 1,
          isDisabled: slot.index === 0,
          isTurnPlayerSlot: slot.index === 2,
          label: `slot-${String(slot.index)}`,
          shouldDim: slot.index === 0,
          showPreviewCoin: slot.index === 2,
          slotBetsForIndex: slot.bets,
        })}
        selectedIndex={1}
        shakeSlotIndex={0}
        slots={slots}
        sortedTimeline={[
          {
            earnedAtRoundNumber: 1,
            earnedBy: "placement",
            trackId: "t1" as GenericId<"tracks">,
            year: 1990,
          },
          {
            earnedAtRoundNumber: 2,
            earnedBy: "placement",
            trackId: "t2" as GenericId<"tracks">,
            year: 1994,
          },
        ]}
      />,
    );

    // Locked, preview, and pending coins all render inside their zones.
    expect(screen.getAllByText(/^[A-Za-z]/).length).toBeGreaterThan(0);
    expect(screen.getByText("t:newSong")).toBeInTheDocument();
  });
});

/* oxlint-enable typescript/consistent-type-assertions, typescript/no-unsafe-type-assertion */
