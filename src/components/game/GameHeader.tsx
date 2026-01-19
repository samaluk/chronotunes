"use client";

import type { GenericId } from "convex/values";
import { Timer } from "lucide-react";
import { useTranslations } from "next-intl";

interface TurnPlayer {
  _id: GenericId<"players">;
  displayName: string;
}

interface GameHeaderProps {
  roundNumber: number;
  turnPlayer: TurnPlayer | null;
  isMyTurn: boolean;
  turnSeconds?: number;
  startedAt?: number;
}

export function GameHeader({
  roundNumber,
  turnPlayer,
  isMyTurn,
  turnSeconds,
  startedAt,
}: GameHeaderProps): React.ReactNode {
  const t = useTranslations("game");
  const tCommon = useTranslations("common");

  const getTimeRemaining = (): number | null => {
    if (!startedAt || !turnSeconds) return null;
    const elapsed = (Date.now() - startedAt) / 1000;
    const remaining = turnSeconds - elapsed;
    return Math.max(0, remaining);
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const timeRemaining = getTimeRemaining();
  const isLowTime = timeRemaining !== null && timeRemaining <= 10 && timeRemaining > 0;

  return (
    <div className="w-full space-y-4">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-card border">
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {t("round", { number: roundNumber })}
            </span>
            <div className="flex items-center gap-2 mt-1">
              {turnPlayer && (
                <>
                  <span className="text-lg font-semibold">
                    {isMyTurn ? t("yourTurn") : t("playersTurn", { name: turnPlayer.displayName })}
                  </span>
                  {isMyTurn && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/20 text-primary text-xs font-medium animate-pulse">
                      {tCommon("active")}
                    </span>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {turnSeconds && startedAt && (
          <div
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-lg
              ${isLowTime ? "bg-destructive/10 text-destructive animate-pulse" : "bg-muted"}
            `}
          >
            <Timer className={`h-5 w-5 ${isLowTime ? "animate-pulse" : ""}`} />
            <span>{timeRemaining !== null ? formatTime(timeRemaining) : `--:--`}</span>
          </div>
        )}
      </div>
    </div>
  );
}
