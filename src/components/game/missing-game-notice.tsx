"use client";

import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

export function MissingGameNotice(): ReactNode {
  const t = useTranslations("game");

  return (
    <div className="flex min-h-100 items-center justify-center">
      <div className="text-center">
        <p className="text-muted-foreground">{t("noActiveGame")}</p>
      </div>
    </div>
  );
}
