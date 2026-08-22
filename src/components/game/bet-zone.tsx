"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** What fills the slot: an open drop target, the turn player's locked slot, or a filled position. */
type BetZoneAppearance = "filled" | "open" | "turn-player";

/** Whether the slot is pressed/selected, still selectable, or blocked for this player. */
type BetZoneInteraction = "available" | "blocked" | "selected";

interface BetZoneProps {
  appearance: BetZoneAppearance;
  coins: ReactNode;
  index: number;
  interaction: BetZoneInteraction;
  label: string;
  modifiers?: { pulse?: boolean; shake?: boolean };
  onClick: (index: number) => void;
}

export function BetZone({
  index,
  label,
  appearance,
  interaction,
  modifiers,
  coins,
  onClick,
}: BetZoneProps): ReactNode {
  const isSelected = interaction === "selected";
  const isBlocked = interaction === "blocked";
  // A blocked turn-player slot keeps its highlight; other blocked slots dim.
  const shouldDim = isBlocked && appearance !== "turn-player";

  return (
    <button
      aria-disabled={isBlocked}
      aria-label={label}
      aria-pressed={isSelected}
      className={cn(
        "min-h-14 w-full rounded-xl border px-4 py-3 text-left transition",
        isSelected ? "border-primary bg-primary/5 shadow-sm" : "border-border bg-card",
        appearance === "turn-player" &&
          "border-amber-200 bg-amber-50/70 text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100",
        appearance === "open" && "border-dashed",
        isBlocked && "cursor-not-allowed",
        shouldDim && "opacity-60",
        modifiers?.shake && "animate-shake",
        modifiers?.pulse && "animate-pulse border-primary/30 ring-1 ring-primary/15",
      )}
      disabled={isBlocked}
      onClick={() => onClick(index)}
      type="button"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-semibold text-foreground text-sm">{label}</p>
        <div className="flex min-h-7 flex-wrap items-center justify-end gap-2">{coins}</div>
      </div>
    </button>
  );
}
