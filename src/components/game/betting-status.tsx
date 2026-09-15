"use client";

import { AlertTriangle } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";

export type StatusNoticeVariant = "amber" | "green" | "muted";

const VARIANT_CLASSES: Record<StatusNoticeVariant, string> = {
  amber:
    "border-warning/40 bg-warning/10 text-warning dark:border-warning/50 dark:bg-warning/20 dark:text-warning",
  green: "border-success/40 bg-success/10 dark:border-success/50 dark:bg-success/20",
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
