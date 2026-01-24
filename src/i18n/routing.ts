import { createNavigation } from "next-intl/navigation"
import { defineRouting } from "next-intl/routing"

export const routing = defineRouting({
  locales: ["en", "es"],
  defaultLocale: "es",
  localePrefix: "never",
})

export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing)
