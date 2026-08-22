"use client";

import { Coins } from "lucide-react";

export interface BettingHeaderProps {
  betCoinsLabel: string;
  description: string;
  title: string;
}

export function BettingHeader({
  betCoinsLabel,
  title,
  description,
}: Readonly<BettingHeaderProps>): React.ReactNode {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h3 className="font-medium text-muted-foreground text-sm">{title}</h3>
        <p className="mt-1 text-muted-foreground text-xs">{description}</p>
      </div>
      <div className="flex items-center gap-2">
        <Coins className="h-4 w-4 text-amber-500" />
        <span className="font-medium text-sm">{betCoinsLabel}</span>
      </div>
    </div>
  );
}
