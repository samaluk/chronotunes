"use client";

import { useTranslations } from "next-intl";

import { BetCoin } from "./bet-coin";
import { BetZone } from "./bet-zone";
import type { Player, SlotInfo, SlotState, TimelineEntry } from "./betting-types";

export interface BettingTimelineProps {
  canBet: boolean;
  getSlotState: (slot: SlotInfo) => SlotState;
  hasDeclinedBet: boolean;
  hasLockedBet: boolean;
  me: Player | null;
  onSlotClick: (index: number) => void;
  renderTimelineEntry: (entry: TimelineEntry) => React.ReactNode;
  selectedIndex: number | null;
  shakeSlotIndex: number | null;
  slots: SlotInfo[];
  sortedTimeline: TimelineEntry[];
  tCommon: ReturnType<typeof useTranslations>;
}

export function BettingTimeline({
  slots,
  sortedTimeline,
  getSlotState,
  shakeSlotIndex,
  canBet,
  hasLockedBet,
  hasDeclinedBet,
  selectedIndex,
  me,
  renderTimelineEntry,
  onSlotClick,
  tCommon,
}: Readonly<BettingTimelineProps>): React.ReactNode {
  const elements: React.ReactNode[] = [];

  const renderBetZone = (slot: SlotInfo): React.ReactNode => {
    const slotState = getSlotState(slot);
    const isOpenSlot = slotState.slotBetsForIndex.length === 0 && !slotState.isTurnPlayerSlot;
    const shouldPulse =
      canBet && isOpenSlot && !hasLockedBet && !hasDeclinedBet && selectedIndex !== slot.index;
    const slotHasLockedBet = slotState.slotBetsForIndex.some((bet) => bet.lockedIn);
    const slotCoins = (
      <>
        {slotState.slotBetsForIndex.map((bet) => (
          <BetCoin
            isPreview={bet.playerId === me?._id && !bet.lockedIn}
            key={bet.playerId}
            playerName={bet.playerDisplayName}
            state={(() => {
              if (bet.lockedIn) {
                return "locked";
              }
              if (slotHasLockedBet) {
                return "blocked";
              }
              return "pending";
            })()}
          />
        ))}
        {slotState.showPreviewCoin && me && (
          <BetCoin isPreview playerName={me.displayName} state="pending" />
        )}
        {slotState.isTurnPlayerSlot && (
          <span className="inline-flex h-7 items-center gap-1.5 rounded-full border border-amber-300 bg-amber-100 px-2 font-medium text-amber-800 text-xs dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-200">
            {tCommon("newSong")}
          </span>
        )}
      </>
    );

    return (
      <BetZone
        appearance={slotState.isTurnPlayerSlot ? "turn-player" : isOpenSlot ? "open" : "filled"}
        coins={slotCoins}
        index={slot.index}
        interaction={
          slotState.isActive ? "selected" : slotState.isDisabled ? "blocked" : "available"
        }
        key={`slot-${slot.index}`}
        label={slotState.label}
        modifiers={{
          pulse: shouldPulse,
          shake: shakeSlotIndex === slot.index,
        }}
        onClick={onSlotClick}
      />
    );
  };

  const firstSlot = slots[0];
  if (firstSlot) {
    elements.push(renderBetZone(firstSlot));
  }

  sortedTimeline.forEach((entry, index) => {
    // earnedAtRoundNumber is unique within a player's timeline, so this pair
    // identifies the entry without resorting to the array index.
    elements.push(
      <div key={`${entry.trackId}-${entry.earnedAtRoundNumber}`}>{renderTimelineEntry(entry)}</div>,
    );

    const nextSlot = slots[index + 1];
    if (nextSlot) {
      elements.push(renderBetZone(nextSlot));
    }
  });

  return <div className="space-y-4">{elements}</div>;
}
