"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export interface PlacementSlotProps {
  badgeLabel?: string;
  index: number;
  isActive: boolean;
  isDisabled?: boolean;
  label: string;
  onClick: (index: number) => void;
}

export function PlacementSlot({
  index,
  label,
  isActive,
  isDisabled = false,
  badgeLabel,
  onClick,
}: PlacementSlotProps): ReactNode {
  return (
    <button
      aria-disabled={isDisabled}
      aria-pressed={isActive}
      className={cn(
        "min-h-[56px] w-full rounded-xl border border-dashed px-4 py-3 text-left transition",
        isActive ? "border-primary bg-primary/5 shadow-sm" : "border-border bg-card",
        isDisabled && "cursor-not-allowed opacity-60",
      )}
      disabled={isDisabled}
      onClick={() => onClick(index)}
      type="button"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="font-semibold text-foreground text-sm">{label}</p>
        {badgeLabel && (
          <span className="inline-flex h-7 items-center gap-1.5 rounded-full border border-warning/50 bg-warning/15 px-2 font-medium text-warning text-xs dark:border-warning/40 dark:bg-warning/30 dark:text-warning">
            {badgeLabel}
          </span>
        )}
      </div>
    </button>
  );
}
