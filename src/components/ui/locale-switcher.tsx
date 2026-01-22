"use client";

import { Globe } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useLocalStorage } from "usehooks-ts";
import { cn } from "@/lib/utils";

const LOCALE_STORAGE_KEY = "locale";

const localeNames: Record<string, string> = {
  en: "English",
  es: "Español",
  fr: "Français",
  de: "Deutsch",
  pt: "Português",
  ja: "日本語",
};

const availableLocales = ["en", "es", "fr", "de", "pt", "ja"];

export function LocaleSwitcher(): React.ReactNode {
  const [locale, setLocale] = useLocalStorage(LOCALE_STORAGE_KEY, "en");
  const t = useTranslations("locale");
  const [isOpen, setIsOpen] = useState(false);

  const handleLocaleChange = (newLocale: string): void => {
    setIsOpen(false);
    if (newLocale === locale) return;
    setLocale(newLocale);
    window.location.reload();
  };

  const currentLocaleName = localeNames[locale] || localeNames.en;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center justify-center rounded-md border border-input bg-background p-2 text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        aria-label={t("selectLanguage")}
      >
        <Globe className="h-5 w-5 mr-1" />
        <span className="hidden sm:inline">{currentLocaleName}</span>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} aria-hidden="true" />
          <div className="absolute right-0 top-full z-50 mt-2 w-40 rounded-md border bg-popover p-1 shadow-lg">
            <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">
              {t("selectLanguage")}
            </div>
            <div className="space-y-1">
              {availableLocales.map((loc) => (
                <button
                  key={loc}
                  type="button"
                  onClick={() => handleLocaleChange(loc)}
                  className={cn(
                    "flex w-full items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors",
                    loc === locale
                      ? "bg-accent text-accent-foreground font-medium"
                      : "hover:bg-accent hover:text-accent-foreground",
                  )}
                >
                  {loc === locale && <span className="mr-2 text-primary">✓</span>}
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
}
