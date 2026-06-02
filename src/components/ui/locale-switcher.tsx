"use client";

import { Globe } from "lucide-react";
import type { Locale } from "next-intl";
import { useLocale, useTranslations } from "next-intl";
import { memo, useState, useTransition } from "react";

import { useLocaleAction } from "@/i18n/locale-action";
import { cn } from "@/lib/utils";

const localeNames: Record<string, string> = {
  en: "English",
  es: "Español",
};

const availableLocales = ["en", "es"] as const;

export const LocaleSwitcher = memo((): React.ReactNode => {
  const t = useTranslations("locale");
  const [isOpen, setIsOpen] = useState(false);
  const locale = useLocale();
  const changeLocaleAction = useLocaleAction();
  const [isPending, startTransition] = useTransition();

  const handleLocaleChange = (newLocale: string): void => {
    setIsOpen(false);
    if (newLocale === locale) {
      return;
    }
    startTransition(() => {
      changeLocaleAction(newLocale as Locale).catch((error) => {
        console.error("Failed to change locale", error);
      });
    });
  };

  const currentLocaleName = localeNames[locale] || localeNames.en;

  return (
    <div className="relative">
      <button
        aria-label={t("selectLanguage")}
        className="inline-flex items-center justify-center rounded-md border border-input bg-background p-2 font-medium text-sm ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        disabled={isPending}
        onClick={() => setIsOpen(!isOpen)}
        type="button"
      >
        <Globe className="mr-1 h-5 w-5" />
        <span className="hidden sm:inline">{currentLocaleName}</span>
      </button>

      {isOpen && (
        <>
          <div
            aria-hidden="true"
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full right-0 z-50 mt-2 w-40 rounded-md border bg-popover p-1 shadow-lg">
            <div className="px-2 py-1.5 font-semibold text-muted-foreground text-sm">
              {t("selectLanguage")}
            </div>
            <div className="space-y-1">
              {availableLocales.map((loc) => (
                <button
                  className={cn(
                    "flex w-full items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors",
                    loc === locale
                      ? "bg-accent font-medium text-accent-foreground"
                      : "hover:bg-accent hover:text-accent-foreground"
                  )}
                  key={loc}
                  onClick={() => handleLocaleChange(loc)}
                  type="button"
                >
                  {loc === locale && (
                    <span className="mr-2 text-primary">✓</span>
                  )}
                  {loc !== locale && <span className="w-5" />}
                  {localeNames[loc]}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
});
