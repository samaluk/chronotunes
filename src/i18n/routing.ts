import { createNavigation } from "next-intl/navigation";
import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["en", "es", "fr", "de", "pt", "ja"],
  defaultLocale: "en",
  localePrefix: "always",
});

export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
