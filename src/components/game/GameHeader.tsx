"use client";

import type { GenericId } from "convex/values";
import { Check, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { VolumeSlider } from "@/components/player/VolumeSlider";
import { cn } from "@/lib/utils";
import { GameTimer } from "./GameTimer";

interface TurnPlayer {
  _id: GenericId<"players">;
  displayName: string;
}

interface ResolutionInfo {
  turnPlayerWasCorrect: boolean;
  awardedPlayerIds: GenericId<"players">[];
}

interface GameHeaderProps {
  roundNumber: number;
  turnPlayer: TurnPlayer | null;
  isMyTurn: boolean;
  roundPhase: "placing" | "betting" | "resolved";
  bettingStartedAt?: number;
  bettingWindowSeconds?: number;
  resolution?: ResolutionInfo | null;
}

export function GameHeader({
  roundNumber,
  turnPlayer,
  isMyTurn,
  roundPhase,
  bettingStartedAt,
  bettingWindowSeconds,
  resolution,
}: GameHeaderProps): React.ReactNode {
  const t = useTranslations("game");
  const tCommon = useTranslations("common");
  const tPhase = useTranslations("phase");

  return (
    <div className="w-full space-y-4">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-card border">
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {t("round", { number: roundNumber })}
              </span>
              <span
                className={cn(
                  "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
                  roundPhase === "placing"
                    ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                    : roundPhase === "betting"
                      ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                      : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
                )}
              >
                {tPhase(roundPhase)}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              {turnPlayer && (
                <>
                  <span className="text-lg font-semibold">
                    {isMyTurn ? t("yourTurn") : t("playersTurn", { name: turnPlayer.displayName })}
                  </span>
                  {isMyTurn && roundPhase === "placing" && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/20 text-primary text-xs font-medium animate-pulse">
                      {tCommon("active")}
                    </span>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {roundPhase === "betting" && bettingStartedAt && bettingWindowSeconds && (
          <GameTimer
            startedAt={bettingStartedAt}
            totalSeconds={bettingWindowSeconds}
            variant="betting"
            className={isMyTurn ? "bg-amber-50 dark:bg-amber-950/20" : ""}
          />
        )}

        {roundPhase === "resolved" && resolution && (
          <div
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg font-medium",
              resolution.turnPlayerWasCorrect
                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
            )}
          >
            {resolution.turnPlayerWasCorrect ? (
              <>
                <Check className="h-4 w-4" />
                <span>Correct!</span>
              </>
            ) : (
              <>
                <X className="h-4 w-4" />
                <span>Incorrect</span>
              </>
            )}
          </div>
        )}

        <VolumeSlider />
      </div>
    </div>
  );
}
