"use client";

import { AlertTriangle } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";

export type StatusNoticeVariant = "amber" | "green" | "muted";

const VARIANT_CLASSES: Record<StatusNoticeVariant, string> = {
  amber:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200",
  green: "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30",
  muted: "border bg-muted/50 text-muted-foreground",
};

export interface StatusNoticeProps {
  children: ReactNode;
  icon?: ReactNode;
  variant: StatusNoticeVariant;
}

export function StatusNotice({ children, icon, variant }: StatusNoticeProps): React.ReactNode {
  return (
    <div
      className={`flex items-center justify-center gap-2 rounded-lg border p-3 ${VARIANT_CLASSES[variant]}`}
    >
      {icon}
      {children}
    </div>
  );
}

export interface DeclineBetButtonProps {
  isDeclining: boolean;
  onDecline: () => void;
  t: ReturnType<typeof useTranslations>;
}

export function DeclineBetButton({
  isDeclining,
  onDecline,
  t,
}: DeclineBetButtonProps): React.ReactNode {
  return (
    <div className="flex justify-end">
      <Button disabled={isDeclining} onClick={onDecline} size="sm" type="button" variant="outline">
        <AlertTriangle className="mr-2 h-4 w-4" />
        {t("declineBet")}
      </Button>
    </div>
  );
}
