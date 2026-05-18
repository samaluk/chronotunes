import { createNavigation } from "next-intl/navigation";
import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  defaultLocale: "es",
  localePrefix: "never",
  locales: ["en", "es"],
});

export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
