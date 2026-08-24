"use client";

import { BettingActions, type BettingActionsProps } from "./betting-actions";
import type { ReactNode } from "react";

export function BettingActionsSection({
  visible,
  isBusy,
  ...actionsProps
}: BettingActionsProps & { visible: boolean }): ReactNode {
  if (!visible) {
    return null;
  }
  return <BettingActions isBusy={isBusy} {...actionsProps} />;
}
