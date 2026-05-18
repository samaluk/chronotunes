"use client";

import { AlertTriangle, Timer } from "lucide-react";
import { memo, useEffect, useState } from "react";

import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface GameTimerProps {
  className?: string;
  lowTimeThreshold?: number;
  showProgress?: boolean;
  startedAt: number;
  totalSeconds: number;
  variant?: "betting" | "turn";
}

export const GameTimer = memo(function GameTimer({
  startedAt,
  totalSeconds,
  lowTimeThreshold = 10,
  showProgress = true,
  variant = "betting",
  className,
}: GameTimerProps): React.ReactNode {
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);

  useEffect(() => {
    const calculateTimeRemaining = (): number => {
      const elapsed = (Date.now() - startedAt) / 1000;
      const remaining = totalSeconds - elapsed;
      return remaining;
    };

    setTimeRemaining(calculateTimeRemaining());

    const interval = setInterval(() => {
      setTimeRemaining(calculateTimeRemaining());
    }, 100);

    return () => clearInterval(interval);
  }, [startedAt, totalSeconds]);

  const formatTime = (seconds: number): string => {
    const absSeconds = Math.abs(seconds);
    const mins = Math.floor(absSeconds / 60);
    const secs = Math.floor(absSeconds % 60);
    const sign = seconds < 0 ? "-" : "";
    return `${sign}${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const isExpired = timeRemaining !== null && timeRemaining <= 0;
  const isLowTime =
    timeRemaining !== null &&
    timeRemaining > 0 &&
    timeRemaining <= lowTimeThreshold;
  const isOverdue =
    variant === "turn" && timeRemaining !== null && timeRemaining <= -60;
  const progressValue =
    timeRemaining === null
      ? null
      : Math.max(0, Math.min(100, (timeRemaining / totalSeconds) * 100));

  const timerStateClass = (() => {
    if (isExpired || isOverdue) {
      return "bg-muted text-muted-foreground";
    }
    if (isLowTime) {
      return "animate-pulse bg-destructive/10 text-destructive";
    }
    return "bg-muted";
  })();

  return (
    <div className={className}>
      <div
        className={cn(
          "inline-flex items-center gap-2 rounded-lg px-4 py-2 font-mono text-lg",
          timerStateClass
        )}
      >
        <Timer className={cn("h-5 w-5", isLowTime && "animate-pulse")} />
        <span>
          {timeRemaining === null ? "--:--" : formatTime(timeRemaining)}
        </span>
        {isLowTime && <AlertTriangle className="h-4 w-4 animate-pulse" />}
        {isExpired && variant === "betting" && (
          <span className="ml-1 font-medium text-xs">Time&apos;s up</span>
        )}
      </div>
      {showProgress && progressValue !== null && (
        <Progress className="h-1.5" value={progressValue} />
      )}
    </div>
  );
});
