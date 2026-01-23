"use client";

import { CheckCircle2, CircleDashed, RefreshCw, WifiOff } from "lucide-react";
import { type ConvexConnectionStatus, useConvexStatus } from "@/lib/hooks/use-convex-status";
import { cn } from "@/lib/utils";

interface NetworkStatusProps {
  className?: string;
  showLabel?: boolean;
}

export function NetworkStatus({ className, showLabel = true }: NetworkStatusProps) {
  const { status, retry } = useConvexStatus();

  if (status === "connected") {
    return null;
  }

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-full px-3 py-1.5 font-medium text-xs transition-all",
        status === "error" && "bg-destructive/10 text-destructive",
        status === "disconnected" && "bg-muted text-muted-foreground",
        status === "connecting" && "bg-primary/10 text-primary",
        status === "reconnecting" &&
          "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
        className,
      )}
    >
      <StatusIcon status={status} />
      {showLabel && <StatusLabel onRetry={retry} status={status} />}
    </div>
  );
}

function StatusIcon({ status }: { status: ConvexConnectionStatus }) {
  switch (status) {
    case "connecting":
      return <CircleDashed className="h-3.5 w-3.5 animate-spin" />;
    case "reconnecting":
      return <RefreshCw className="h-3.5 w-3.5 animate-spin" />;
    case "disconnected":
      return <WifiOff className="h-3.5 w-3.5" />;
    case "error":
      return <WifiOff className="h-3.5 w-3.5" />;
    case "connected":
      return <CheckCircle2 className="h-3.5 w-3.5" />;
  }
}

function StatusLabel({ status, onRetry }: { status: ConvexConnectionStatus; onRetry: () => void }) {
  switch (status) {
    case "connecting":
      return <span>Connecting...</span>;
    case "reconnecting":
      return (
        <span className="flex items-center gap-1.5">
          Reconnecting
          <button
            className="underline hover:no-underline"
            onClick={(e) => {
              e.stopPropagation();
              onRetry();
            }}
            type="button"
          >
            Retry now
          </button>
        </span>
      );
    case "disconnected":
      return <span>Disconnected</span>;
    case "error":
      return (
        <span className="flex items-center gap-1.5">
          Connection error
          <button
            className="underline hover:no-underline"
            onClick={(e) => {
              e.stopPropagation();
              onRetry();
            }}
            type="button"
          >
            Retry
          </button>
        </span>
      );
    case "connected":
      return <span>Connected</span>;
  }
}

export function ConnectionBanner() {
  const { status, retry } = useConvexStatus();

  if (status === "connected") {
    return null;
  }

  return (
    <div
      className={cn(
        "fixed right-0 bottom-0 left-0 z-50 flex items-center justify-center gap-2 px-4 py-2 font-medium text-sm",
        status === "error" && "bg-destructive text-destructive-foreground",
        status === "disconnected" && "bg-muted text-muted-foreground",
        status === "connecting" && "bg-primary/10 text-primary",
        status === "reconnecting" &&
          "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
      )}
    >
      <StatusIcon status={status} />
      <StatusLabel onRetry={retry} status={status} />
    </div>
  );
}
