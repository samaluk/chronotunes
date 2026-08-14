import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";

import { routing } from "./routing";

type Locale = (typeof routing.locales)[number];

// oxlint-disable-next-line typescript/consistent-type-assertions, typescript/no-unsafe-type-assertion
const isLocale = (value: string): value is Locale => routing.locales.includes(value as Locale);

export default getRequestConfig(async () => {
  const store = await cookies();
  const cookieLocale = store.get("locale")?.value;
  let locale = cookieLocale || routing.defaultLocale;

  // Ensure locale is valid, fallback to default
  if (!isLocale(locale)) {
    locale = routing.defaultLocale;
  }

  return {
    locale,
    // oxlint-disable-next-line typescript/no-unsafe-assignment, typescript/no-unsafe-member-access
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
