"use client";

import { AlertTriangle, Check, Coins, Lock } from "lucide-react";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";

import { DeclineBetButton, StatusNotice } from "./betting-status";

export interface BettingStatusAreaProps {
  status: {
    canBet: boolean;
    canDecline: boolean;
    coins: number;
    hasDeclinedBet: boolean;
    hasLockedBet: boolean;
    isDeclining: boolean;
    isTurnPlayer: boolean;
    onDecline: () => void;
    showPreviewDiscarded: boolean;
  };
}

/**
 * Contextual betting feedback: decline action plus the amber/green/muted
 * state banners.
 */
export function BettingStatusArea({ status }: BettingStatusAreaProps): React.ReactNode {
  const t = useTranslations("betting");
  const {
    canBet,
    canDecline,
    coins,
    hasDeclinedBet,
    hasLockedBet,
    isDeclining,
    isTurnPlayer,
    onDecline,
    showPreviewDiscarded,
  } = status;

  /** Each banner: visibility predicate, icon, tone, message key, label class. */
  const notices = [
    {
      icon: <AlertTriangle className="h-4 w-4" />,
      key: "previewDiscarded",
      labelClass: "font-medium",
      show: showPreviewDiscarded,
      variant: "amber",
    },
    {
      icon: <Lock className="h-4 w-4" />,
      key: "turnPlayerCannotBet",
      labelClass: "",
      show: isTurnPlayer,
      variant: "muted",
    },
    {
      icon: <Coins className="h-4 w-4" />,
      key: "notEnoughCoins",
      labelClass: "",
      show: !(canBet || hasLockedBet || hasDeclinedBet) && coins < 1,
      variant: "muted",
    },
    {
      icon: <AlertTriangle className="h-4 w-4" />,
      key: "declinedToBet",
      labelClass: "font-medium",
      show: hasDeclinedBet,
      variant: "amber",
    },
    {
      icon: <Check className="h-4 w-4 text-green-600 dark:text-green-400" />,
      key: "yourBetLocked",
      labelClass: "font-medium text-green-700 dark:text-green-300",
      show: hasLockedBet,
      variant: "green",
    },
  ] as const;

  return (
    <>
      {canDecline && <DeclineBetButton isDeclining={isDeclining} onDecline={onDecline} t={t} />}

      {notices.map(
        (notice): React.ReactNode =>
          notice.show && (
            <StatusNotice icon={notice.icon} key={notice.key} variant={notice.variant}>
              <span className={cn("text-sm", notice.labelClass)}>{t(notice.key)}</span>
            </StatusNotice>
          ),
      )}
    </>
  );
}
