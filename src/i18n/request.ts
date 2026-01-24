import { cookies } from "next/headers"
import { getRequestConfig } from "next-intl/server"
import { routing } from "./routing"

export default getRequestConfig(async ({ requestLocale }) => {
  const store = await cookies()
  const cookieLocale = store.get("locale")?.value
  let locale = (await requestLocale) || cookieLocale || routing.defaultLocale

  // Ensure locale is valid, fallback to default
  if (!(locale && routing.locales.includes(locale as any))) {
    locale = routing.defaultLocale
  }

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  }
})
