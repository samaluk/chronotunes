"use client";

import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";

export interface ResolveRoundPanelProps {
  canResolveRound: boolean;
  isResolving: boolean;
  onResolveRound: () => void;
  tTimer: ReturnType<typeof useTranslations>;
}

export function ResolveRoundPanel({
  canResolveRound,
  isResolving,
  onResolveRound,
  tTimer,
}: Readonly<ResolveRoundPanelProps>): React.ReactNode {
  if (!canResolveRound) {
    return null;
  }

  return (
    <div className="flex items-center justify-center gap-2 rounded-lg border border-primary bg-primary/10 p-4">
      <Button disabled={isResolving} onClick={onResolveRound} size="lg" type="button">
        {isResolving ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {tTimer("resolvingRound")}
          </>
        ) : (
          tTimer("resolveRound")
        )}
      </Button>
      <p className="text-muted-foreground text-xs">{tTimer("waitingForBets")}</p>
    </div>
  );
}
