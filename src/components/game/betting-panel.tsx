"use client";

import { useQuery } from "convex/react";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { BettingActions } from "./betting-actions";
import { BettingHeader } from "./betting-header";
import { BettingStatusArea } from "./betting-status-area";
import { BettingTimeline } from "./betting-timeline";
import type {
  Player,
  RevealedTrack,
  RoundBet,
  SlotBetInfo,
  SlotInfo,
  SlotState,
  TimelineEntry,
  TrackInfo,
} from "./betting-types";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { getRevealedTrackMap, sortTimelineByYear } from "@/lib/timeline";

import { ResolveRoundPanel } from "./resolve-round-panel";
import { TimelineCard } from "./timeline-card";
import { useBettingActions } from "./use-betting-actions";

interface BettingPanelProps {
  lobbyId: Id<"lobbies">;
  me: Player | null;
  players?: Player[];
  revealedTracks: RevealedTrack[];
  track: TrackInfo | null;
  turnPlayerId?: Id<"players"> | null;
  turnPlayerPlacementIndex?: number | null;
  turnPlayerTimeline: TimelineEntry[];
}

const EMPTY_ROUND_BETS: RoundBet[] = [];
const FORBIDDEN_SLOT_SHAKE_MS = 500;
const PREVIEW_DISCARDED_NOTICE_MS = 2500;

const buildSlotBets = (safeBets: RoundBet[]) => {
  const map = new Map<number, SlotBetInfo[]>();
  for (const bet of safeBets) {
    if (bet.declinedToBet) {
      continue;
    }
    const existing = map.get(bet.proposedIndex) ?? [];
    existing.push({
      lockedIn: bet.lockedIn,
      playerDisplayName: bet.playerDisplayName,
      playerId: bet.playerId,
    });
    map.set(bet.proposedIndex, existing);
  }
  return map;
};

const buildSlots = (sortedTimeline: TimelineEntry[], slotBets: Map<number, SlotBetInfo[]>) => {
  const result: SlotInfo[] = [];
  for (let index = 0; index <= sortedTimeline.length; index += 1) {
    result.push({
      above: sortedTimeline[index - 1],
      below: sortedTimeline[index],
      bets: slotBets.get(index) ?? [],
      index,
    });
  }
  return result;
};

interface SlotStateContext {
  canBet: boolean;
  hasDeclinedBet: boolean;
  hasLockedBet: boolean;
  me: Player | null;
  myPlayerId: Id<"players"> | null;
  selectedIndex: number | null;
  t: ReturnType<typeof useTranslations>;
  turnPlayerName: string | null;
  turnPlayerSlotIndex: number | null;
}

const getSlotLabel = (
  { t, turnPlayerName }: SlotStateContext,
  isTurnPlayerSlot: boolean,
  lockedBet?: SlotBetInfo,
): string => {
  if (isTurnPlayerSlot) {
    if (turnPlayerName) {
      return t("turnPlayerPickWithName", { name: turnPlayerName });
    }
    return t("turnPlayerPlacement");
  }

  if (lockedBet) {
    return t("playersSlot", { name: lockedBet.playerDisplayName });
  }

  return t("openSlot");
};

const computeSlotState = (ctx: SlotStateContext, slot: SlotInfo): SlotState => {
  const slotBetsForIndex = slot.bets;
  const lockedBet = slotBetsForIndex.find((bet) => bet.lockedIn);
  const isTurnPlayerSlot =
    ctx.turnPlayerSlotIndex !== null && slot.index === ctx.turnPlayerSlotIndex;
  const isSelected = ctx.selectedIndex === slot.index;
  const isActive = isSelected && !isTurnPlayerSlot;
  const hasLockedBetByOther = slotBetsForIndex.some(
    (bet) => bet.lockedIn && bet.playerId !== ctx.myPlayerId,
  );
  const canSelectSlot = ctx.canBet && !hasLockedBetByOther && !isTurnPlayerSlot;
  const label = getSlotLabel(ctx, isTurnPlayerSlot, lockedBet);
  const hasMyBet = slotBetsForIndex.some((bet) => bet.playerId === ctx.myPlayerId);
  const showPreviewCoin =
    isActive && !ctx.hasLockedBet && !ctx.hasDeclinedBet && Boolean(ctx.me) && !hasMyBet;
  const isDisabled = !(canSelectSlot || isActive);
  const shouldDim = isDisabled && !isTurnPlayerSlot;

  return {
    isActive,
    isDisabled,
    isTurnPlayerSlot,
    label,
    shouldDim,
    showPreviewCoin,
    slotBetsForIndex,
  };
};

/** Every non-turn player has either locked a bet or explicitly declined. */
const allBetsSettled = (
  isHost: boolean,
  players: Player[] | undefined,
  safeBets: RoundBet[],
  turnPlayerId: Id<"players"> | null | undefined,
): boolean => {
  if (!(isHost && players && turnPlayerId)) {
    return false;
  }

  const nonTurnPlayers = players.filter((p) => p._id !== turnPlayerId);
  if (nonTurnPlayers.length === 0) {
    return false;
  }

  const lockedBets = safeBets.filter((bet) => bet.lockedIn);
  const declinedBets = safeBets.filter((bet) => bet.declinedToBet);

  return nonTurnPlayers.every(
    (player) =>
      lockedBets.some((bet) => bet.playerId === player._id) ||
      declinedBets.some((bet) => bet.playerId === player._id),
  );
};

const timelineEntryFor = (
  revealedTrackMap: ReturnType<typeof getRevealedTrackMap>,
  tCommon: ReturnType<typeof useTranslations>,
  entry: TimelineEntry,
): React.ReactNode => {
  const trackInfo = revealedTrackMap.get(entry.trackId);

  if (trackInfo) {
    return <TimelineCard artist={trackInfo.artist} title={trackInfo.title} year={trackInfo.year} />;
  }

  return <TimelineCard title={tCommon("knownTrack")} year={entry.year} />;
};

const getActivityLabel = (
  t: ReturnType<typeof useTranslations>,
  flags: { cancelling: boolean; declining: boolean; lockingIn: boolean },
): string | null => {
  if (flags.lockingIn) {
    return t("lockingInBet");
  }
  if (flags.cancelling) {
    return t("cancellingBet");
  }
  if (flags.declining) {
    return t("decliningBet");
  }
  return null;
};

export function BettingPanel({
  lobbyId,
  me,
  track,
  turnPlayerTimeline,
  revealedTracks,
  players,
  turnPlayerId,
  turnPlayerPlacementIndex,
}: Readonly<BettingPanelProps>): React.ReactNode {
  const t = useTranslations("betting");
  const tCommon = useTranslations("common");
  const tTimer = useTranslations("timer");

  // Local optimism for the slot being previewed; the server echo through
  // myBet.proposedIndex is the source of truth once it arrives.
  const [optimisticIndex, setOptimisticIndex] = useState<number | null>(null);
  const [showPreviewDiscarded, setShowPreviewDiscarded] = useState(false);
  const [shakeSlotIndex, setShakeSlotIndex] = useState<number | null>(null);

  // Preview-discarded notice: armed when another player locks the slot we are
  // previewing, hidden after a fixed display window.
  const [wasOtherLocked, setWasOtherLocked] = useState(false);

  const existingBets = useQuery(api.bets.listForRound, lobbyId ? { lobbyId } : "skip");
  const safeBets = existingBets ?? EMPTY_ROUND_BETS;
  const myBet = safeBets.find((bet) => bet.playerId === me?._id) ?? null;
  const hasLockedBet = myBet?.lockedIn ?? false;
  const hasDeclinedBet = myBet?.declinedToBet ?? false;
  const isTurnPlayer = Boolean(turnPlayerId && me?._id === turnPlayerId);
  const turnPlayerSlotIndex = turnPlayerPlacementIndex ?? null;

  const sortedTimeline = sortTimelineByYear(turnPlayerTimeline);
  const revealedTrackMap = getRevealedTrackMap(revealedTracks);

  const isHost = players?.find((p) => p._id === me?._id)?.isHost ?? false;
  const turnPlayerName = players?.find((p) => p._id === turnPlayerId)?.displayName ?? null;

  const canBet = Boolean(me && me.coins >= 1 && !hasLockedBet && !hasDeclinedBet && !isTurnPlayer);
  const canDecline = Boolean(me && !hasLockedBet && !hasDeclinedBet && !isTurnPlayer);
  const myPlayerId = me?._id ?? null;

  const serverSelection = myBet && !hasLockedBet && !hasDeclinedBet ? myBet.proposedIndex : null;

  // Adopt server-side selection changes synchronously during render instead of
  // in an effect: local optimism wins until the echo confirms (and replaces)
  // it, and server resets (cancel, decline, resolution) clear any stale local
  // pick immediately.
  const [lastServerSelection, setLastServerSelection] = useState(serverSelection);
  if (serverSelection !== lastServerSelection) {
    setLastServerSelection(serverSelection);
    setOptimisticIndex(null);
  }

  const rawSelection = optimisticIndex ?? serverSelection;

  const slotBets = buildSlotBets(safeBets);
  const slots = buildSlots(sortedTimeline, slotBets);

  const triggerForbiddenSlotFeedback = (index: number): void => {
    // Retriggering replaces the previous timeout because the cleanup of the
    // shake effect runs whenever shakeSlotIndex changes.
    setShakeSlotIndex(index);
    toast.error(t("turnPlayerSlotBlocked"), {
      id: "turn-player-slot-blocked",
    });
  };

  const {
    handleCancel,
    handleConfirm,
    handleDecline,
    handleKeyDown,
    handleResolveRound,
    handleSlotClick,
    isCancelling,
    isDeclining,
    isLockingIn,
    isPreviewing,
    isResolving,
  } = useBettingActions({
    canBet,
    canDecline,
    hasDeclinedBet,
    hasLockedBet,
    lobbyId,
    myBet,
    myPlayerId,
    onPreviewStarted: setOptimisticIndex,
    onSelectionCleared: () => {
      setOptimisticIndex(null);
    },
    rawSelection,
    slotBets,
    slotCount: slots.length,
    t,
    turnPlayerSlotIndex,
    triggerForbiddenSlotFeedback,
  });

  // Constraints are derived during render rather than patched back into state
  // by effects: a slot locked by another player or reserved for the turn
  // player simply cannot stay selected.
  const betsAtSelection = rawSelection === null ? [] : (slotBets.get(rawSelection) ?? []);
  const otherLockedSelection =
    me !== null && betsAtSelection.some((bet) => bet.playerId !== me._id && bet.lockedIn);
  const selectionOnTurnSlot = turnPlayerSlotIndex !== null && rawSelection === turnPlayerSlotIndex;

  if (otherLockedSelection !== wasOtherLocked) {
    setWasOtherLocked(otherLockedSelection);
    setShowPreviewDiscarded(otherLockedSelection);
  }

  useEffect(() => {
    if (!showPreviewDiscarded) {
      return;
    }
    const timeoutId = setTimeout(() => {
      setShowPreviewDiscarded(false);
    }, PREVIEW_DISCARDED_NOTICE_MS);
    return () => clearTimeout(timeoutId);
  }, [showPreviewDiscarded]);

  const selectedIndex = otherLockedSelection || selectionOnTurnSlot ? null : rawSelection;

  useEffect(() => {
    if (shakeSlotIndex === null) {
      return;
    }
    const timeoutId = window.setTimeout(() => {
      setShakeSlotIndex(null);
    }, FORBIDDEN_SLOT_SHAKE_MS);
    return () => window.clearTimeout(timeoutId);
  }, [shakeSlotIndex]);

  const getSlotState = (slot: SlotInfo): SlotState =>
    computeSlotState(
      {
        canBet,
        hasDeclinedBet,
        hasLockedBet,
        me,
        myPlayerId,
        selectedIndex,
        t,
        turnPlayerName,
        turnPlayerSlotIndex,
      },
      slot,
    );

  const canResolveRound = allBetsSettled(isHost, players, safeBets, turnPlayerId);

  // Subscribe once; the latest handler is picked up through a ref refreshed
  // from an effect (never during render), so arrow keys and Escape always hit
  // current state without re-subscribing on every keystroke-affecting change.
  const keydownRef = useRef(handleKeyDown);

  useEffect(() => {
    keydownRef.current = handleKeyDown;
  }, [handleKeyDown]);

  useEffect(() => {
    const listener = (event: KeyboardEvent): void => {
      void keydownRef.current(event);
    };

    globalThis.addEventListener("keydown", listener);
    return () => globalThis.removeEventListener("keydown", listener);
  }, []);

  const activityLabel = getActivityLabel(t, {
    cancelling: isCancelling,
    declining: isDeclining,
    lockingIn: isLockingIn,
  });

  if (!track) {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <div className="h-8 w-8 animate-spin rounded-full border-primary border-b-2" />
        <p className="mt-4 text-muted-foreground">{tCommon("loading")}</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      <BettingHeader
        betCoinsLabel={t("betCoins", { count: me?.coins ?? 0 })}
        description={t("placeBetDescription")}
        title={t("placeYourBet")}
      />

      <BettingTimeline
        canBet={canBet}
        getSlotState={getSlotState}
        hasDeclinedBet={hasDeclinedBet}
        hasLockedBet={hasLockedBet}
        me={me}
        onSlotClick={(index) => {
          void handleSlotClick(index);
        }}
        renderTimelineEntry={(entry) => timelineEntryFor(revealedTrackMap, tCommon, entry)}
        selectedIndex={selectedIndex}
        shakeSlotIndex={shakeSlotIndex}
        slots={slots}
        sortedTimeline={sortedTimeline}
        tCommon={tCommon}
      />

      {selectedIndex !== null && !hasLockedBet && !hasDeclinedBet && (
        <BettingActions
          isBusy={isLockingIn || isPreviewing}
          onCancel={() => {
            void handleCancel();
          }}
          onConfirm={() => {
            void handleConfirm();
          }}
          t={t}
          tCommon={tCommon}
        />
      )}

      <BettingStatusArea
        status={{
          canBet,
          canDecline,
          coins: me?.coins ?? 0,
          hasDeclinedBet,
          hasLockedBet,
          isDeclining,
          isTurnPlayer,
          onDecline: () => {
            void handleDecline();
          },
          showPreviewDiscarded,
        }}
      />

      <ResolveRoundPanel
        canResolveRound={canResolveRound}
        isResolving={isResolving}
        onResolveRound={() => void handleResolveRound()}
        tTimer={tTimer}
      />

      {activityLabel && (
        <div className="flex items-center justify-center gap-2 rounded-lg bg-muted/50 p-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-muted-foreground text-sm">{activityLabel}</span>
        </div>
      )}
    </div>
  );
}
