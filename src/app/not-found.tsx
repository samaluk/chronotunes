"use client";

import { Music } from "lucide-react";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/routing";

export default function NotFoundPage(): React.ReactNode {
  const t = useTranslations("notFound");
  const tCommon = useTranslations("common");

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background p-6">
      <div className="flex items-center gap-2">
        <Music className="h-8 w-8 text-primary" />
        <span className="font-bold text-2xl text-foreground">{t("title")}</span>
      </div>
      <div className="text-center">
        <p className="font-semibold text-6xl text-foreground">404</p>
        <p className="mt-2 text-muted-foreground">{t("description")}</p>
      </div>
      <Link
        className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 font-medium text-primary-foreground transition-colors hover:bg-primary/80"
        href="/"
      >
        {tCommon("returnHome")}
      </Link>
    </div>
  );
}
