"use client";

import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { CenteredMessage } from "@/components/lobby/centered-message";
import { Link } from "@/i18n/routing";

export function LobbyNotFoundScreen(): ReactNode {
  const t = useTranslations("lobby");

  return (
    <CenteredMessage>
      <p className="text-destructive">{t("lobbyNotFound")}</p>
      <Link
        className="mt-4 inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        href="/"
        prefetch="auto"
      >
        {t("returnHome")}
      </Link>
    </CenteredMessage>
  );
}
