import { getRequestConfig } from "next-intl/server"
import { routing } from "./routing"

export default getRequestConfig(async ({ requestLocale }) => {
  // Get locale from request, fallback to default
  let locale = await requestLocale

  // Ensure locale is valid, fallback to default
  if (!(locale && routing.locales.includes(locale as any))) {
    locale = routing.defaultLocale
  }

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  }
})
