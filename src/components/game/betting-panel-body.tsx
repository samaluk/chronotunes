"use client";

import type { ReactNode } from "react";

import { ActivityIndicator } from "./activity-indicator";
import { BettingActionsSection } from "./betting-actions-section";
import { BettingHeader } from "./betting-header";
import type { BettingPanelModel } from "./betting-panel-model";
import { BettingStatusArea } from "./betting-status-area";
import { BettingTimeline } from "./betting-timeline";
import { ResolveRoundPanel } from "./resolve-round-panel";

export function BettingPanelBody({ m }: { m: BettingPanelModel }): ReactNode {
  const { callbacks } = m;
  return (
    <div className="w-full space-y-4">
      <BettingHeader
        betCoinsLabel={m.t("betCoins", { count: m.coins })}
        description={m.t("placeBetDescription")}
        title={m.t("placeYourBet")}
      />

      <BettingTimeline
        canBet={m.canBet}
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
        visible={m.actionsVisible}
      />

      <BettingStatusArea
        status={{
          canBet: m.canBet,
          canDecline: m.canDecline,
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
