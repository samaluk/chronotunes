"use client";

import { Check, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { memo } from "react";

import { VolumeSlider } from "@/components/player/volume-slider";
import { cn } from "@/lib/utils";

import { useGame } from "./game-provider";
import { GameTimer } from "./game-timer";

const phaseStyles = {
  betting: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  placing: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  resolved: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
};

export const GameHeader = memo((): React.ReactNode => {
  const t = useTranslations("game");
  const tCommon = useTranslations("common");
  const tPhase = useTranslations("phase");
  const { state } = useGame();
  const { game, isMyTurn, phase, turnPlayer, currentRound } = state;

  const roundNumber = game?.currentRoundNumber ?? 1;
  const bettingStartedAt = phase === "betting" ? currentRound?.startedAt : undefined;
  const { bettingWindowSeconds } = state;

  return (
    <div className="w-full space-y-4">
      <div className="flex flex-col items-center justify-between gap-4 rounded-xl border bg-card p-4 sm:flex-row">
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
                {t("round", { number: roundNumber })}
              </span>
              <span
                className={cn(
                  "inline-flex items-center rounded-full px-2 py-0.5 font-medium text-xs",
                  phaseStyles[phase],
                )}
              >
                {tPhase(phase)}
              </span>
            </div>
            <div className="mt-1 flex items-center gap-2">
              {turnPlayer && (
                <>
                  <span className="font-semibold text-lg">
                    {isMyTurn ? t("yourTurn") : t("playersTurn", { name: turnPlayer.displayName })}
                  </span>
                  {isMyTurn && phase === "placing" && (
                    <span className="inline-flex animate-pulse items-center gap-1 rounded-full bg-primary/20 px-2 py-0.5 font-medium text-primary text-xs">
                      {tCommon("active")}
                    </span>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {phase === "betting" && bettingStartedAt && bettingWindowSeconds && (
          <GameTimer
            className={isMyTurn ? "bg-amber-50 dark:bg-amber-950/20" : ""}
            startedAt={bettingStartedAt}
            totalSeconds={bettingWindowSeconds}
            variant="betting"
          />
        )}

        {phase === "resolved" && currentRound?.resolution && (
          <div
            className={cn(
              "flex items-center gap-2 rounded-lg px-4 py-2 font-medium",
              currentRound.resolution.turnPlayerWasCorrect
                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
            )}
          >
            {currentRound.resolution.turnPlayerWasCorrect ? (
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
});
