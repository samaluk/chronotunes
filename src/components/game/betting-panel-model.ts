import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import type { Player, SlotInfo, SlotState, TimelineEntry } from "./betting-types";

export interface BettingPanelCallbacks {
  getSlotState: (slot: SlotInfo) => SlotState;
  onCancel: () => void;
  onConfirm: () => void;
  onDecline: () => void;
  onResolveRound: () => void;
  onSlotClick: (index: number) => void;
  renderTimelineEntry: (entry: TimelineEntry) => ReactNode;
}

export interface BettingPanelModel {
  callbacks: BettingPanelCallbacks;
  activityLabel: string | null;
  canResolveRound: boolean;
  coins: number;
  hasDeclinedBet: boolean;
  hasLockedBet: boolean;
  actionsVisible: boolean;
  isDeclining: boolean;
  isLockingIn: boolean;
  isPreviewing: boolean;
  isResolving: boolean;
  isTurnPlayer: boolean;
  me: Player | null;
  canBet: boolean;
  canDecline: boolean;
  selectedIndex: number | null;
  shakeSlotIndex: number | null;
  showPreviewDiscarded: boolean;
  slots: SlotInfo[];
  sortedTimeline: TimelineEntry[];
  t: ReturnType<typeof useTranslations>;
  tCommon: ReturnType<typeof useTranslations>;
  tTimer: ReturnType<typeof useTranslations>;
}
