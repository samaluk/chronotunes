"use client";

import { useSessionMutation } from "convex-helpers/react/sessions";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { runTrackedMutation, runWithLoading } from "@/lib/run-safely";

import type { RoundBet, SlotBetInfo } from "./betting-types";

const nextIndexForDirection = (
  slotCount: number,
  turnPlayerSlotIndex: number | null,
  currentIndex: number,
  direction: "up" | "down",
  onForbidden: (index: number) => void,
): number | null => {
  const step = direction === "down" ? 1 : -1;
  const candidateIndex = currentIndex + step;

  if (candidateIndex < 0 || candidateIndex >= slotCount) {
    return null;
  }

  if (turnPlayerSlotIndex === null || candidateIndex !== turnPlayerSlotIndex) {
    return candidateIndex;
  }

  const skippedIndex = candidateIndex + step;
  if (skippedIndex < 0 || skippedIndex >= slotCount) {
    onForbidden(candidateIndex);
    return null;
  }

  return skippedIndex;
};

export interface UseBettingActionsArgs {
  canBet: boolean;
  canDecline: boolean;
  hasDeclinedBet: boolean;
  hasLockedBet: boolean;
  lobbyId: Id<"lobbies">;
  myBet: RoundBet | null;
  myPlayerId: Id<"players"> | null;
  /** Clears the local optimistic slot selection. */
  onSelectionCleared: () => void;
  /** Adopts a slot as the locally previewed selection before the server echo. */
  onPreviewStarted: (index: number) => void;
  /** Currently highlighted slot (optimistic or echoed), used for arrow moves. */
  rawSelection: number | null;
  slotBets: Map<number, SlotBetInfo[]>;
  slotCount: number;
  t: ReturnType<typeof useTranslations>;
  turnPlayerSlotIndex: number | null;
  triggerForbiddenSlotFeedback: (index: number) => void;
}

/**
 * All betting mutations (preview, lock in, cancel, decline, resolve), their
 * transient loading flags, and the input handlers that drive them (slot
 * clicks, arrow keys, Escape). Selection state itself stays in the panel:
 * this hook reports intent through the callbacks above.
 */
export interface UseBettingActionsResult {
  handleCancel: () => Promise<void>;
  handleConfirm: () => Promise<void>;
  handleDecline: () => Promise<void>;
  handleKeyDown: (event: KeyboardEvent) => Promise<void>;
  handlePreview: (index: number) => Promise<void>;
  handleResolveRound: () => Promise<void>;
  handleSlotClick: (index: number) => Promise<void>;
  isCancelling: boolean;
  isDeclining: boolean;
  isLockingIn: boolean;
  isPreviewing: boolean;
  isResolving: boolean;
}

export function useBettingActions({
  canBet,
  canDecline,
  hasDeclinedBet,
  hasLockedBet,
  lobbyId,
  myBet,
  myPlayerId,
  onSelectionCleared,
  onPreviewStarted,
  rawSelection,
  slotBets,
  slotCount,
  t,
  turnPlayerSlotIndex,
  triggerForbiddenSlotFeedback,
}: UseBettingActionsArgs): UseBettingActionsResult {
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isLockingIn, setIsLockingIn] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isDeclining, setIsDeclining] = useState(false);
  const [isResolving, setIsResolving] = useState(false);

  const previewBet = useSessionMutation(api.bets.preview);
  const lockInBet = useSessionMutation(api.bets.lockIn);
  const cancelBet = useSessionMutation(api.bets.cancel);
  const declineBet = useSessionMutation(api.rounds.declineBet);
  const resolveRound = useSessionMutation(api.games.resolveRound);

  const handleResolveRound = async (): Promise<void> => {
    await runTrackedMutation({
      errorLabel: "Failed to resolve round:",
      mutation: () => resolveRound({ lobbyId }),
      setLoading: setIsResolving,
    });
  };

  const handlePreview = async (index: number): Promise<void> => {
    if (!canBet) {
      return;
    }

    if (turnPlayerSlotIndex !== null && index === turnPlayerSlotIndex) {
      triggerForbiddenSlotFeedback(index);
      return;
    }

    const slotBetsForIndex = slotBets.get(index) ?? [];
    const hasOtherLockedBet = slotBetsForIndex.some(
      (bet) => bet.playerId !== myPlayerId && bet.lockedIn,
    );
    if (hasOtherLockedBet) {
      return;
    }

    onPreviewStarted(index);

    const succeeded = await runWithLoading(
      setIsPreviewing,
      () => previewBet({ lobbyId, proposedIndex: index }),
      (error: unknown) => {
        console.error(t("failedToPreview"), error);
      },
    );

    if (!succeeded) {
      onSelectionCleared();
    }
  };

  /**
   * Builds a guarded mutation handler: bail when the action is not currently
   * allowed, run the mutation under its loading flag, clear the selection on
   * success. Shared by lock-in / cancel / decline, whose only differences are
   * the guard predicate, the loading flag, the mutation, and its error label.
   */
  const makeBetAction =
    (action: {
      errorMessage: string;
      guard: () => boolean;
      mutation: () => Promise<unknown>;
      setActive: (active: boolean) => void;
    }): (() => Promise<void>) =>
    async (): Promise<void> => {
      if (!action.guard()) {
        return;
      }

      const succeeded = await runTrackedMutation({
        errorLabel: action.errorMessage,
        mutation: action.mutation,
        setLoading: action.setActive,
      });
      if (succeeded) {
        onSelectionCleared();
      }
      action.setActive(false);
    };

  const handleConfirm = makeBetAction({
    errorMessage: t("failedToLockIn"),
    guard: (): boolean => {
      if (!(lobbyId && myBet)) {
        return false;
      }
      return !hasLockedBet && !hasDeclinedBet;
    },
    mutation: () => lockInBet({ lobbyId }),
    setActive: setIsLockingIn,
  });

  const handleCancel = makeBetAction({
    errorMessage: t("failedToCancel"),
    guard: (): boolean => {
      if (!(lobbyId && myBet)) {
        return false;
      }
      return !myBet.lockedIn && !myBet.declinedToBet;
    },
    mutation: () => cancelBet({ lobbyId }),
    setActive: setIsCancelling,
  });

  const handleDecline = makeBetAction({
    errorMessage: t("failedToDecline"),
    guard: (): boolean => Boolean(lobbyId && canDecline),
    mutation: () => declineBet({ lobbyId }),
    setActive: setIsDeclining,
  });

  const handleSlotClick = async (index: number): Promise<void> => {
    if (isPreviewing || isLockingIn) {
      return;
    }
    await handlePreview(index);
  };

  const handleArrowMove = async (direction: "up" | "down"): Promise<void> => {
    if (rawSelection === null) {
      return;
    }

    const nextIndex = nextIndexForDirection(
      slotCount,
      turnPlayerSlotIndex,
      rawSelection,
      direction,
      triggerForbiddenSlotFeedback,
    );
    if (nextIndex === null) {
      return;
    }

    await handlePreview(nextIndex);
  };

  const handleKeyDown = async (event: KeyboardEvent): Promise<void> => {
    if (!canBet || rawSelection === null) {
      return;
    }

    switch (event.key) {
      case "ArrowDown": {
        event.preventDefault();
        await handleArrowMove("down");
        return;
      }
      case "ArrowUp": {
        event.preventDefault();
        await handleArrowMove("up");
        return;
      }
      case "Escape": {
        event.preventDefault();
        await handleCancel();
        return;
      }
      default: {
        return;
      }
    }
  };

  return {
    handleCancel,
    handleConfirm,
    handleDecline,
    handleKeyDown,
    handlePreview,
    handleResolveRound,
    handleSlotClick,
    isCancelling,
    isDeclining,
    isLockingIn,
    isPreviewing,
    isResolving,
  };
}
