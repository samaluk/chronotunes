"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface BetZoneProps {
  coins: ReactNode;
  index: number;
  isActive: boolean;
  isDisabled: boolean;
  isOpenSlot: boolean;
  isShaking: boolean;
  isTurnPlayerSlot: boolean;
  label: string;
  onClick: (index: number) => void;
  shouldDim: boolean;
  shouldPulse?: boolean;
}

export function BetZone({
  index,
  label,
  isActive,
  isDisabled,
  isTurnPlayerSlot,
  isOpenSlot,
  shouldDim,
  isShaking,
  shouldPulse = false,
  coins,
  onClick,
}: BetZoneProps): ReactNode {
  const isButtonDisabled = isDisabled || isTurnPlayerSlot;

  return (
    <button
      aria-disabled={isButtonDisabled}
      aria-label={label}
      aria-pressed={isActive}
      className={cn(
        "min-h-[56px] w-full rounded-xl border px-4 py-3 text-left transition",
        isActive
          ? "border-primary bg-primary/5 shadow-sm"
          : "border-border bg-card",
        isTurnPlayerSlot &&
          "border-amber-200 bg-amber-50/70 text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100",
        isOpenSlot && "border-dashed",
        isButtonDisabled && "cursor-not-allowed",
        shouldDim && "opacity-60",
        isShaking && "animate-shake",
        shouldPulse && "animate-pulse border-primary/30 ring-1 ring-primary/15"
      )}
      disabled={isButtonDisabled}
      onClick={() => onClick(index)}
      type="button"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-semibold text-foreground text-sm">{label}</p>
        <div className="flex min-h-7 flex-wrap items-center justify-end gap-2">
          {coins}
        </div>
      </div>
    </button>
  );
}
