"use client";

import { AlertTriangle, Timer } from "lucide-react";
import { useEffect, useState } from "react";
import { Progress, ProgressIndicator, ProgressTrack } from "@/components/ui/progress";

interface SoftTimerProps {
  startedAt: number;
  turnSeconds: number;
  lowTimeThreshold?: number;
  className?: string;
}

export function SoftTimer({
  startedAt,
  turnSeconds,
  lowTimeThreshold = 10,
  className,
}: SoftTimerProps): React.ReactNode {
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);

  useEffect(() => {
    const calculateTimeRemaining = (): number => {
      const elapsed = (Date.now() - startedAt) / 1000;
      const remaining = turnSeconds - elapsed;
      return remaining;
    };

    setTimeRemaining(calculateTimeRemaining());

    const interval = setInterval(() => {
      const remaining = calculateTimeRemaining();
      setTimeRemaining(remaining);
    }, 100);

    return () => clearInterval(interval);
  }, [startedAt, turnSeconds]);

  const formatTime = (seconds: number): string => {
    const absSeconds = Math.abs(seconds);
    const mins = Math.floor(absSeconds / 60);
    const secs = Math.floor(absSeconds % 60);
    const sign = seconds < 0 ? "-" : "";
    return `${sign}${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const isLowTime =
    timeRemaining !== null && timeRemaining <= lowTimeThreshold && timeRemaining > -60;
  const isOverdue = timeRemaining !== null && timeRemaining <= -60;
  const progressValue =
    timeRemaining !== null ? Math.max(0, Math.min(100, (timeRemaining / turnSeconds) * 100)) : null;

  return (
    <div className={className}>
      <div
        className={`
          inline-flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-lg
          ${isLowTime && !isOverdue ? "bg-destructive/10 text-destructive animate-pulse" : ""}
          ${isOverdue ? "bg-muted text-muted-foreground" : "bg-muted"}
        `}
      >
        <Timer className={`h-5 w-5 ${isLowTime && !isOverdue ? "animate-pulse" : ""}`} />
        <span>{timeRemaining !== null ? formatTime(timeRemaining) : "--:--"}</span>
        {isLowTime && !isOverdue && (
          <AlertTriangle data-testid="alert-triangle" className="h-4 w-4 animate-pulse" />
        )}
      </div>
      {progressValue !== null && (
        <div className="mt-2">
          <Progress value={progressValue} className="h-1.5">
            <ProgressTrack>
              <ProgressIndicator
                className={
                  progressValue <= (lowTimeThreshold / turnSeconds) * 100
                    ? "bg-destructive animate-pulse"
                    : ""
                }
              />
            </ProgressTrack>
          </Progress>
        </div>
      )}
    </div>
  );
}
