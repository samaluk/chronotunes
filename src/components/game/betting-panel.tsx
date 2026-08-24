"use client";

import { useQuery } from "convex/react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { toast } from "sonner";

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

import { BettingPanelBody } from "./betting-panel-body";
import type { BettingPanelModel } from "./betting-panel-model";
import { TimelineCard } from "./timeline-card";
import { useBettingActions } from "./use-betting-actions";
import { useForbiddenSlotShake } from "./use-forbidden-slot-shake";
import { useGlobalKeydown } from "./use-global-keydown";
import { useOptimisticSelection } from "./use-optimistic-selection";
import { usePreviewDiscarded } from "./use-preview-discarded";

export interface BettingPanelProps {
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
): ReactNode => {
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

interface BetFlags {
  hasDeclinedBet: boolean;
  hasLockedBet: boolean;
  myBet: RoundBet | null;
}

const deriveBetFlags = (safeBets: RoundBet[], me: Player | null): BetFlags => {
  const myBet = safeBets.find((bet) => bet.playerId === me?._id) ?? null;
  return {
    hasDeclinedBet: myBet?.declinedToBet ?? false,
    hasLockedBet: myBet?.lockedIn ?? false,
    myBet,
  };
};

interface Permissions {
  canBet: boolean;
  canDecline: boolean;
}

const serverSelectionFor = (myBet: RoundBet | null, flags: BetFlags): number | null =>
  myBet && !flags.hasLockedBet && !flags.hasDeclinedBet ? myBet.proposedIndex : null;

const derivePermissions = (
  me: Player | null,
  isTurnPlayer: boolean,
  flags: BetFlags,
): Permissions => ({
  canBet: Boolean(
    me && me.coins >= 1 && !flags.hasLockedBet && !flags.hasDeclinedBet && !isTurnPlayer,
  ),
  canDecline: Boolean(me && !flags.hasLockedBet && !flags.hasDeclinedBet && !isTurnPlayer),
});

interface TurnContext {
  isHost: boolean;
  isTurnPlayer: boolean;
  turnPlayerName: string | null;
  turnPlayerSlotIndex: number | null;
}

const deriveTurnContext = (
  players: Player[] | undefined,
  me: Player | null,
  turnPlayerId: Id<"players"> | null | undefined,
  turnPlayerPlacementIndex: number | null | undefined,
): TurnContext => ({
  isHost: players?.find((p) => p._id === me?._id)?.isHost ?? false,
  isTurnPlayer: Boolean(turnPlayerId && me?._id === turnPlayerId),
  turnPlayerName: players?.find((p) => p._id === turnPlayerId)?.displayName ?? null,
  turnPlayerSlotIndex: turnPlayerPlacementIndex ?? null,
});

interface SelectionConstraints {
  otherLockedSelection: boolean;
  selectedIndex: number | null;
}

/**
 * Constraints are derived during render rather than patched back into state
 * by effects: a slot locked by another player or reserved for the turn
 * player simply cannot stay selected.
 */
const deriveSelectionConstraints = (
  slotBets: Map<number, SlotBetInfo[]>,
  rawSelection: number | null,
  me: Player | null,
  turnPlayerSlotIndex: number | null,
): SelectionConstraints => {
  const betsAtSelection = rawSelection === null ? [] : (slotBets.get(rawSelection) ?? []);
  const otherLockedSelection =
    me !== null && betsAtSelection.some((bet) => bet.playerId !== me._id && bet.lockedIn);
  const selectionOnTurnSlot = turnPlayerSlotIndex !== null && rawSelection === turnPlayerSlotIndex;

  return {
    otherLockedSelection,
    selectedIndex: otherLockedSelection || selectionOnTurnSlot ? null : rawSelection,
  };
};

/**
 * Owns every derivation, mutation hook, keyboard subscription, and feedback
 * effect for the panel; the render component only branches on `track`.
 */
function useBettingPanelModel(
  lobbyId: Id<"lobbies">,
  me: Player | null,
  players: Player[] | undefined,
  revealedTracks: RevealedTrack[],
  track: TrackInfo | null,
  turnPlayerId: Id<"players"> | null | undefined,
  turnPlayerPlacementIndex: number | null | undefined,
  turnPlayerTimeline: TimelineEntry[],
): {
  model: BettingPanelModel;
  showTrackLoading: boolean;
} {
  const t = useTranslations("betting");
  const tCommon = useTranslations("common");
  const tTimer = useTranslations("timer");

  const existingBets = useQuery(api.bets.listForRound, lobbyId ? { lobbyId } : "skip");
  const safeBets = existingBets ?? EMPTY_ROUND_BETS;
  const flags = deriveBetFlags(safeBets, me);

  // Local optimism for the slot being previewed; the server echo through
  // myBet.proposedIndex is the source of truth once it arrives.
  const serverSelection = serverSelectionFor(flags.myBet, flags);
  const { optimisticIndex, setOptimisticIndex } = useOptimisticSelection(serverSelection);

  const turnContext = deriveTurnContext(players, me, turnPlayerId, turnPlayerPlacementIndex);
  const permissions = derivePermissions(me, turnContext.isTurnPlayer, flags);

  const sortedTimeline = sortTimelineByYear(turnPlayerTimeline);
  const revealedTrackMap = getRevealedTrackMap(revealedTracks);
  const myPlayerId = me?._id ?? null;

  const rawSelection = optimisticIndex ?? serverSelection;

  const slotBets = buildSlotBets(safeBets);
  const slots = buildSlots(sortedTimeline, slotBets);

  // Retriggering replaces the previous timeout because the cleanup of the
  // shake effect runs whenever shakeSlotIndex changes.
  const { shakeSlotIndex, triggerForbiddenSlot } = useForbiddenSlotShake();
  const triggerForbiddenSlotFeedback = (index: number): void => {
    triggerForbiddenSlot(index);
    toast.error(t("turnPlayerSlotBlocked"), {
      id: "turn-player-slot-blocked",
    });
  };

  const actions = useBettingActions({
    canBet: permissions.canBet,
    canDecline: permissions.canDecline,
    hasDeclinedBet: flags.hasDeclinedBet,
    hasLockedBet: flags.hasLockedBet,
    lobbyId,
    myBet: flags.myBet,
    myPlayerId,
    onPreviewStarted: setOptimisticIndex,
    onSelectionCleared: () => {
      setOptimisticIndex(null);
    },
    rawSelection,
    slotBets,
    slotCount: slots.length,
    t,
    turnPlayerSlotIndex: turnContext.turnPlayerSlotIndex,
    triggerForbiddenSlotFeedback,
  });

  const constraints = deriveSelectionConstraints(
    slotBets,
    rawSelection,
    me,
    turnContext.turnPlayerSlotIndex,
  );
  const showPreviewDiscarded = usePreviewDiscarded(constraints.otherLockedSelection);

  const getSlotState = (slot: SlotInfo): SlotState =>
    computeSlotState(
      {
        canBet: permissions.canBet,
        hasDeclinedBet: flags.hasDeclinedBet,
        hasLockedBet: flags.hasLockedBet,
        me,
        myPlayerId,
        selectedIndex: constraints.selectedIndex,
        t,
        turnPlayerName: turnContext.turnPlayerName,
        turnPlayerSlotIndex: turnContext.turnPlayerSlotIndex,
      },
      slot,
    );

  useGlobalKeydown(actions.handleKeyDown);

  const activityLabel = getActivityLabel(t, {
    cancelling: actions.isCancelling,
    declining: actions.isDeclining,
    lockingIn: actions.isLockingIn,
  });

  const canResolveRound = allBetsSettled(turnContext.isHost, players, safeBets, turnPlayerId);

  const model: BettingPanelModel = {
    callbacks: {
      getSlotState,
      onCancel: () => {
        void actions.handleCancel();
      },
      onConfirm: () => {
        void actions.handleConfirm();
      },
      onDecline: () => {
        void actions.handleDecline();
      },
      onResolveRound: () => void actions.handleResolveRound(),
      onSlotClick: (index) => {
        void actions.handleSlotClick(index);
      },
      renderTimelineEntry: (entry) => timelineEntryFor(revealedTrackMap, tCommon, entry),
    },
    activityLabel,
    canResolveRound,
    coins: me?.coins ?? 0,
    hasDeclinedBet: flags.hasDeclinedBet,
    hasLockedBet: flags.hasLockedBet,
    actionsVisible:
      constraints.selectedIndex !== null && !flags.hasLockedBet && !flags.hasDeclinedBet,
    isDeclining: actions.isDeclining,
    isLockingIn: actions.isLockingIn,
    isPreviewing: actions.isPreviewing,
    isResolving: actions.isResolving,
    isTurnPlayer: turnContext.isTurnPlayer,
    me,
    canBet: permissions.canBet,
    canDecline: permissions.canDecline,
    selectedIndex: constraints.selectedIndex,
    shakeSlotIndex,
    showPreviewDiscarded,
    slots,
    sortedTimeline,
    t,
    tCommon,
    tTimer,
  };

  return { model, showTrackLoading: !track };
}

export function BettingPanel({
  lobbyId,
  me,
  players,
  revealedTracks,
  track,
  turnPlayerId,
  turnPlayerPlacementIndex,
  turnPlayerTimeline,
}: Readonly<BettingPanelProps>): React.ReactNode {
  const { model, showTrackLoading } = useBettingPanelModel(
    lobbyId,
    me,
    players,
    revealedTracks,
    track,
    turnPlayerId,
    turnPlayerPlacementIndex,
    turnPlayerTimeline,
  );

  if (showTrackLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <div className="h-8 w-8 animate-spin rounded-full border-primary border-b-2" />
        <p className="mt-4 text-muted-foreground">{model.tCommon("loading")}</p>
      </div>
    );
  }

  return <BettingPanelBody m={model} />;
}
