"use client";

import { CheckCircle2, CircleDashed, RefreshCw, WifiOff } from "lucide-react";
import { useOffline } from "next/offline";
import { useTranslations } from "next-intl";

import { useConvexStatus } from "@/lib/hooks/use-convex-status";
import type { ConvexConnectionStatus } from "@/lib/hooks/use-convex-status";
import { cn } from "@/lib/utils";

export interface NetworkStatusProps {
  className?: string;
  showLabel?: boolean;
}

type NetworkStatusKind = ConvexConnectionStatus | "offline";

export function NetworkStatus(props: NetworkStatusProps) {
  return <ConnectionIndicator {...props} />;
}

export function ConnectionBanner() {
  return <ConnectionIndicator isBanner />;
}

function ConnectionIndicator({
  className,
  showLabel = true,
  isBanner = false,
}: NetworkStatusProps & { isBanner?: boolean }) {
  const isOffline = useOffline();
  const { status } = useConvexStatus();
  const displayStatus = isOffline ? "offline" : status;

  if (displayStatus === "connected") {
    return null;
  }

  return (
    <div
      className={cn(
        isBanner
          ? "fixed right-0 bottom-0 left-0 z-50 flex items-center justify-center gap-2 px-4 py-2 font-medium text-sm"
          : "flex items-center gap-2 rounded-full px-3 py-1.5 font-medium text-xs transition-all",
        (displayStatus === "offline" || displayStatus === "disconnected") &&
          "bg-muted text-muted-foreground",
        displayStatus === "error" &&
          (isBanner
            ? "bg-destructive text-destructive-foreground"
            : "bg-destructive/10 text-destructive"),
        displayStatus === "connecting" && "bg-primary/10 text-primary",
        displayStatus === "reconnecting" &&
          "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
        className,
      )}
      role="status"
    >
      <StatusIcon status={displayStatus} />
      {showLabel && <StatusLabel status={displayStatus} />}
    </div>
  );
}

function StatusIcon({ status }: { status: NetworkStatusKind }) {
  switch (status) {
    case "connecting": {
      return <CircleDashed className="h-3.5 w-3.5 animate-spin" />;
    }
    case "reconnecting": {
      return <RefreshCw className="h-3.5 w-3.5 animate-spin" />;
    }
    case "offline":
    case "disconnected":
    case "error": {
      return <WifiOff className="h-3.5 w-3.5" />;
    }
    case "connected": {
      return <CheckCircle2 className="h-3.5 w-3.5" />;
    }
    default: {
      return null;
    }
  }
}

function StatusLabel({ status }: { status: NetworkStatusKind }) {
  const t = useTranslations("network");

  switch (status) {
    case "offline": {
      return <span>{t("offline")}</span>;
    }
    case "connecting": {
      return <span>{t("connecting")}</span>;
    }
    case "reconnecting": {
      return <span>{t("reconnecting")}</span>;
    }
    case "disconnected": {
      return <span>{t("disconnected")}</span>;
    }
    case "error": {
      return <span>{t("connectionError")}</span>;
    }
    case "connected": {
      return <span>{t("connected")}</span>;
    }
    default: {
      return null;
    }
  }
}
