import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";

import { routing } from "./routing";

type Locale = (typeof routing.locales)[number];

const isLocale = (value: string): value is Locale => routing.locales.includes(value as Locale);

export default getRequestConfig(async ({ requestLocale }) => {
  const store = await cookies();
  const cookieLocale = store.get("locale")?.value;
  let locale = (await requestLocale) || cookieLocale || routing.defaultLocale;

  // Ensure locale is valid, fallback to default
  if (!isLocale(locale)) {
    locale = routing.defaultLocale;
  }

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
