"use client";

import { Check, X } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";

export interface BettingActionsProps {
  isBusy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  t: ReturnType<typeof useTranslations>;
  tCommon: ReturnType<typeof useTranslations>;
}

export function BettingActions({
  isBusy,
  onCancel,
  onConfirm,
  t,
  tCommon,
}: Readonly<BettingActionsProps>): React.ReactNode {
  return (
    <div className="rounded-lg border bg-muted/30 p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="hidden font-medium text-foreground text-sm sm:block">
            {t("pressEnterToConfirm")}
          </p>
          <p className="hidden text-muted-foreground text-xs sm:block">{t("useArrowsToMove")}</p>
          <p className="font-medium text-foreground text-sm sm:hidden">{t("tapConfirmToLock")}</p>
          <p className="text-muted-foreground text-xs sm:hidden">{t("tapSlotToPreview")}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={onCancel} size="sm" type="button" variant="ghost">
            <X className="mr-1 h-4 w-4" />
            {tCommon("cancel")}
          </Button>
          <Button disabled={isBusy} onClick={onConfirm} size="sm" type="button">
            <Check className="mr-1 h-4 w-4" />
            {t("confirmBet")}
          </Button>
        </div>
      </div>
    </div>
  );
}
