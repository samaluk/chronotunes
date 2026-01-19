"use client";

import { Globe } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";

const locales = [
  { code: "en", name: "English" },
  { code: "es", name: "Español" },
  { code: "fr", name: "Français" },
  { code: "de", name: "Deutsch" },
  { code: "pt", name: "Português" },
  { code: "ja", name: "日本語" },
];

export function LocaleSwitcher(): React.ReactNode {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations("locale");
  const [isOpen, setIsOpen] = useState(false);

  const handleLocaleChange = (newLocale: string): void => {
    setIsOpen(false);
    if (newLocale === locale) return;
    const newPath = pathname.replace(`/${locale}`, `/${newLocale}`);
    router.push(newPath);
  };

  const currentLocale = locales.find((l) => l.code === locale) || locales[0];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center justify-center rounded-md border border-input bg-background p-2 text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        aria-label={t("selectLanguage")}
      >
        <Globe className="h-5 w-5 mr-1" />
        <span className="hidden sm:inline">{currentLocale.name}</span>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} aria-hidden="true" />
          <div className="absolute right-0 top-full z-50 mt-2 w-40 rounded-md border bg-popover p-1 shadow-lg">
            <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">
              {t("selectLanguage")}
            </div>
            <div className="space-y-1">
              {locales.map((loc) => (
                <button
                  key={loc.code}
                  type="button"
                  onClick={() => handleLocaleChange(loc.code)}
                  className={cn(
                    "flex w-full items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors",
                    loc.code === locale
                      ? "bg-accent text-accent-foreground font-medium"
                      : "hover:bg-accent hover:text-accent-foreground",
                  )}
                >
                  {loc.code === locale && <span className="mr-2 text-primary">✓</span>}
                  {loc.code !== locale && <span className="w-5" />}
                  {loc.name}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

import { cn } from "@/lib/utils";
