"use client";

import { useQuery } from "convex/react";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";

import { BettingActions, type BettingActionsProps } from "./betting-actions";
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

/** Adopts server-side selection changes synchronously during render. */
function useOptimisticSelection(serverSelection: number | null): {
  optimisticIndex: number | null;
  setOptimisticIndex: (index: number | null) => void;
} {
  const [optimisticIndex, setOptimisticIndex] = useState<number | null>(null);
  const [lastServerSelection, setLastServerSelection] = useState(serverSelection);
  if (serverSelection !== lastServerSelection) {
    setLastServerSelection(serverSelection);
    setOptimisticIndex(null);
  }
  return { optimisticIndex, setOptimisticIndex };
}

/** Shows a transient notice when another player locks the slot we previewed. */
function usePreviewDiscarded(otherLockedSelection: boolean): boolean {
  const [showPreviewDiscarded, setShowPreviewDiscarded] = useState(false);
  const [wasOtherLocked, setWasOtherLocked] = useState(false);

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

  return showPreviewDiscarded;
}

/** Shakes a forbidden slot for a fixed window after it is clicked. */
function useForbiddenSlotShake(): {
  shakeSlotIndex: number | null;
  triggerForbiddenSlot: (index: number) => void;
} {
  const [shakeSlotIndex, setShakeSlotIndex] = useState<number | null>(null);

  useEffect(() => {
    if (shakeSlotIndex === null) {
      return;
    }
    const timeoutId = window.setTimeout(() => {
      setShakeSlotIndex(null);
    }, FORBIDDEN_SLOT_SHAKE_MS);
    return () => window.clearTimeout(timeoutId);
  }, [shakeSlotIndex]);

  return { shakeSlotIndex, triggerForbiddenSlot: setShakeSlotIndex };
}

/** Subscribes once; the latest handler is picked up through a refreshed ref. */
function useGlobalKeydown(handler: (event: KeyboardEvent) => Promise<void>): void {
  const keydownRef = useRef(handler);

  useEffect(() => {
    keydownRef.current = handler;
  }, [handler]);

  useEffect(() => {
    const listener = (event: KeyboardEvent): void => {
      void keydownRef.current(event);
    };

    globalThis.addEventListener("keydown", listener);
    return () => globalThis.removeEventListener("keydown", listener);
  }, []);
}

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

function BettingActionsSection({
  visible,
  isBusy,
  ...actionsProps
}: BettingActionsProps & { visible: boolean }): ReactNode {
  if (!visible) {
    return null;
  }
  return <BettingActions isBusy={isBusy} {...actionsProps} />;
}

function ActivityIndicator({ label }: { label: string | null }): ReactNode {
  if (!label) {
    return null;
  }
  return (
    <div className="flex items-center justify-center gap-2 rounded-lg bg-muted/50 p-2">
      <Loader2 className="h-4 w-4 animate-spin" />
      <span className="text-muted-foreground text-sm">{label}</span>
    </div>
  );
}

interface BettingPanelCallbacks {
  getSlotState: (slot: SlotInfo) => SlotState;
  onCancel: () => void;
  onConfirm: () => void;
  onDecline: () => void;
  onResolveRound: () => void;
  onSlotClick: (index: number) => void;
  renderTimelineEntry: (entry: TimelineEntry) => ReactNode;
}

interface BettingPanelModel {
  callbacks: BettingPanelCallbacks;
  activityLabel: string | null;
  canResolveRound: boolean;
  coins: number;
  hasDeclinedBet: boolean;
  hasLockedBet: boolean;
  isBusyActionsVisible: boolean;
  isDeclining: boolean;
  isLockingIn: boolean;
  isPreviewing: boolean;
  isResolving: boolean;
  isTurnPlayer: boolean;
  me: Player | null;
  permissionsCanBet: boolean;
  permissionsCanDecline: boolean;
  selectedIndex: number | null;
  shakeSlotIndex: number | null;
  showPreviewDiscarded: boolean;
  slots: SlotInfo[];
  sortedTimeline: TimelineEntry[];
  t: ReturnType<typeof useTranslations>;
  tCommon: ReturnType<typeof useTranslations>;
  tTimer: ReturnType<typeof useTranslations>;
}

function BettingPanelBody({ m }: { m: BettingPanelModel }): ReactNode {
  const { callbacks } = m;
  return (
    <div className="w-full space-y-4">
      <BettingHeader
        betCoinsLabel={m.t("betCoins", { count: m.coins })}
        description={m.t("placeBetDescription")}
        title={m.t("placeYourBet")}
      />

      <BettingTimeline
        canBet={m.permissionsCanBet}
        getSlotState={callbacks.getSlotState}
        hasDeclinedBet={m.hasDeclinedBet}
        hasLockedBet={m.hasLockedBet}
        me={m.me}
        onSlotClick={callbacks.onSlotClick}
        renderTimelineEntry={callbacks.renderTimelineEntry}
        selectedIndex={m.selectedIndex}
        shakeSlotIndex={m.shakeSlotIndex}
        slots={m.slots}
        sortedTimeline={m.sortedTimeline}
        tCommon={m.tCommon}
      />

      <BettingActionsSection
        isBusy={m.isLockingIn || m.isPreviewing}
        onCancel={callbacks.onCancel}
        onConfirm={callbacks.onConfirm}
        t={m.t}
        tCommon={m.tCommon}
        visible={m.isBusyActionsVisible}
      />

      <BettingStatusArea
        status={{
          canBet: m.permissionsCanBet,
          canDecline: m.permissionsCanDecline,
          coins: m.coins,
          hasDeclinedBet: m.hasDeclinedBet,
          hasLockedBet: m.hasLockedBet,
          isDeclining: m.isDeclining,
          isTurnPlayer: m.isTurnPlayer,
          onDecline: callbacks.onDecline,
          showPreviewDiscarded: m.showPreviewDiscarded,
        }}
      />

      <ResolveRoundPanel
        canResolveRound={m.canResolveRound}
        isResolving={m.isResolving}
        onResolveRound={callbacks.onResolveRound}
        tTimer={m.tTimer}
      />

      <ActivityIndicator label={m.activityLabel} />
    </div>
  );
}

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
  handleKeyDown: (event: KeyboardEvent) => Promise<void>;
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
    isBusyActionsVisible:
      constraints.selectedIndex !== null && !flags.hasLockedBet && !flags.hasDeclinedBet,
    isDeclining: actions.isDeclining,
    isLockingIn: actions.isLockingIn,
    isPreviewing: actions.isPreviewing,
    isResolving: actions.isResolving,
    isTurnPlayer: turnContext.isTurnPlayer,
    me,
    permissionsCanBet: permissions.canBet,
    permissionsCanDecline: permissions.canDecline,
    selectedIndex: constraints.selectedIndex,
    shakeSlotIndex,
    showPreviewDiscarded,
    slots,
    sortedTimeline,
    t,
    tCommon,
    tTimer,
  };

  return { handleKeyDown: actions.handleKeyDown, model, showTrackLoading: !track };
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
  const { handleKeyDown, model, showTrackLoading } = useBettingPanelModel(
    lobbyId,
    me,
    players,
    revealedTracks,
    track,
    turnPlayerId,
    turnPlayerPlacementIndex,
    turnPlayerTimeline,
  );

  useGlobalKeydown(handleKeyDown);

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
