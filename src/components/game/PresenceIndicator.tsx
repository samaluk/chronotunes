"use client";

import { Circle } from "lucide-react";
import { cn } from "@/lib/utils";

interface PresenceIndicatorProps {
  online: boolean;
  className?: string;
  size?: "sm" | "md" | "lg";
  showPulse?: boolean;
}

const sizeClasses = {
  sm: "h-2 w-2",
  md: "h-3 w-3",
  lg: "h-4 w-4",
};

const pulseSizeClasses = {
  sm: "h-2 w-2",
  md: "h-3 w-3",
  lg: "h-4 w-4",
};

export function PresenceIndicator({
  online,
  className,
  size = "md",
  showPulse = true,
}: PresenceIndicatorProps): React.ReactNode {
  return (
    <span className={cn("relative inline-flex", className)}>
      {showPulse && online && (
        <span
          className={cn(
            "absolute inline-flex h-full w-full animate-ping rounded-full opacity-75",
            pulseSizeClasses[size],
            "bg-green-400",
          )}
        />
      )}
      <Circle
        className={cn(
          "relative inline-flex rounded-full",
          sizeClasses[size],
          online ? "fill-green-500 text-green-500" : "fill-muted text-muted-foreground",
        )}
      />
    </span>
  );
}
