"use client";

import { AlertTriangle, Clock, Lock } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type BetCoinState = "pending" | "locked" | "blocked";

interface BetCoinProps {
  isPreview?: boolean;
  playerName: string;
  state: BetCoinState;
}

const NAME_SPLIT_REGEX = /\s+/u;

function getInitials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) {
    return "?";
  }

  const parts = trimmed.split(NAME_SPLIT_REGEX);
  const first = parts[0]?.[0] ?? "";
  const lastInitial = parts.length > 1 ? (parts.at(-1)?.[0] ?? "") : "";
  const initials = `${first}${lastInitial}`.toUpperCase();

  return initials || trimmed[0]?.toUpperCase() || "?";
}

export function BetCoin({ playerName, state, isPreview = false }: BetCoinProps): ReactNode {
  const initials = getInitials(playerName);
  const stateClasses: Record<BetCoinState, string> = {
    blocked:
      "border-amber-300 bg-amber-100 text-amber-700 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-200",
    locked:
      "border-emerald-300 bg-emerald-100 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200",
    pending: "border-muted-foreground/30 bg-background text-muted-foreground/80",
  };

  const iconByState: Record<BetCoinState, ReactNode> = {
    blocked: <AlertTriangle className="h-3.5 w-3.5" />,
    locked: <Lock className="h-3.5 w-3.5" />,
    pending: <Clock className="h-3.5 w-3.5" />,
  };

  return (
    <span
      className={cn(
        "inline-flex h-7 items-center gap-1.5 rounded-full border px-2 font-medium text-xs",
        stateClasses[state],
        isPreview && "ring-2 ring-primary/60",
      )}
      title={playerName}
    >
      {iconByState[state]}
      <span className="max-w-[140px] truncate">{playerName || initials}</span>
    </span>
  );
}
