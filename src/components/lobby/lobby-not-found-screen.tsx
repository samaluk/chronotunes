"use client";

import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { CenteredMessage } from "@/components/lobby/centered-message";

export function LobbyNotFoundScreen({ onReturnHome }: { onReturnHome: () => void }): ReactNode {
  const t = useTranslations("lobby");

  return (
    <CenteredMessage>
      <p className="text-destructive">{t("lobbyNotFound")}</p>
      <button
        className="mt-4 inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        onClick={onReturnHome}
        type="button"
      >
        {t("returnHome")}
      </button>
    </CenteredMessage>
  );
}
