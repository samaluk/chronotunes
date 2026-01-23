"use client";

import { AlertTriangle, Timer } from "lucide-react";
import { useEffect, useState } from "react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface GameTimerProps {
  startedAt: number;
  totalSeconds: number;
  lowTimeThreshold?: number;
  showProgress?: boolean;
  variant?: "betting" | "turn";
  className?: string;
}

export function GameTimer({
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
    timeRemaining !== null && timeRemaining > 0 && timeRemaining <= lowTimeThreshold;
  const isOverdue = variant === "turn" && timeRemaining !== null && timeRemaining <= -60;
  const progressValue =
    timeRemaining !== null
      ? Math.max(0, Math.min(100, (timeRemaining / totalSeconds) * 100))
      : null;

  return (
    <div className={className}>
      <div
        className={cn(
          "inline-flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-lg",
          isExpired || isOverdue
            ? "bg-muted text-muted-foreground"
            : isLowTime
              ? "bg-destructive/10 text-destructive animate-pulse"
              : "bg-muted",
        )}
      >
        <Timer className={cn("h-5 w-5", isLowTime && "animate-pulse")} />
        <span>{timeRemaining !== null ? formatTime(timeRemaining) : "--:--"}</span>
        {isLowTime && <AlertTriangle className="h-4 w-4 animate-pulse" />}
        {isExpired && variant === "betting" && (
          <span className="text-xs font-medium ml-1">Time&apos;s up</span>
        )}
      </div>
      {showProgress && progressValue !== null && (
        <Progress value={progressValue} className="h-1.5" />
      )}
    </div>
  );
}
