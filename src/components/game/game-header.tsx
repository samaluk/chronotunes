"use client";

import { Check, X } from "lucide-react";
import { useTranslations } from "next-intl";

import { VolumeSlider } from "@/components/player/volume-slider";
import { cn } from "@/lib/utils";

import { useGame } from "./game-context";
import { GameTimer } from "./game-timer";

const phaseStyles = {
  betting: "bg-warning/15 text-warning dark:bg-warning/30 dark:text-warning",
  placing: "bg-info/15 text-info dark:bg-info/30 dark:text-info",
  resolved: "bg-success/15 text-success dark:bg-success/30 dark:text-success",
};

export const GameHeader = (): React.ReactNode => {
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
            className={isMyTurn ? "bg-warning/10 dark:bg-warning/15" : ""}
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
                ? "bg-success/15 text-success dark:bg-success/30 dark:text-success"
                : "bg-destructive/15 text-destructive dark:bg-destructive/30 dark:text-destructive",
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
};
