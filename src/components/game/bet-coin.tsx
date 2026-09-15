"use client";

import { AlertTriangle, Clock, Lock } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type BetCoinState = "pending" | "locked" | "blocked";

export interface BetCoinProps {
  isPreview?: boolean;
  playerName: string;
  state: BetCoinState;
}

const NAME_SPLIT_REGEX = /\s+/u;

const FALLBACK_INITIAL = "?";

const STATE_CLASSES: Record<BetCoinState, string> = {
  blocked:
    "border-warning/50 bg-warning/15 text-warning dark:border-warning/40 dark:bg-warning/30 dark:text-warning",
  locked:
    "border-success/50 bg-success/15 text-success dark:border-success/40 dark:bg-success/30 dark:text-success",
  pending: "border-muted-foreground/30 bg-background text-muted-foreground/80",
};

const ICON_BY_STATE: Record<BetCoinState, ReactNode> = {
  blocked: <AlertTriangle className="h-3.5 w-3.5" />,
  locked: <Lock className="h-3.5 w-3.5" />,
  pending: <Clock className="h-3.5 w-3.5" />,
};

function getInitials(name: string): string {
  const [first = "", last = ""] = name.trim().split(NAME_SPLIT_REGEX);
  return `${first.charAt(0)}${last.charAt(0)}`.trim().toUpperCase() || FALLBACK_INITIAL;
}

export function BetCoin({ playerName, state, isPreview = false }: BetCoinProps): ReactNode {
  const initials = getInitials(playerName);

  return (
    <span
      className={cn(
        "inline-flex h-7 items-center gap-1.5 rounded-full border px-2 font-medium text-xs",
        STATE_CLASSES[state],
        isPreview && "ring-2 ring-primary/60",
      )}
      title={playerName}
    >
      {ICON_BY_STATE[state]}
      <span className="max-w-[140px] truncate">{playerName || initials}</span>
    </span>
  );
}
