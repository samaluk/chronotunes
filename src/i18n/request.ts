import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";

import enMessages from "../../messages/en.json";
import esMessages from "../../messages/es.json";

import { routing } from "./routing";

type Locale = (typeof routing.locales)[number];

// oxlint-disable-next-line typescript/consistent-type-assertions, typescript/no-unsafe-type-assertion
const isLocale = (value: string): value is Locale => routing.locales.includes(value as Locale);

const messagesByLocale = { en: enMessages, es: esMessages } as const;

export default getRequestConfig(async () => {
  const store = await cookies();
  const cookieLocale = store.get("locale")?.value;
  const rawLocale = cookieLocale || routing.defaultLocale;
  // Ensure locale is valid, fallback to default
  const locale = isLocale(rawLocale) ? rawLocale : routing.defaultLocale;

  return {
    locale,
    messages: messagesByLocale[locale],
  };
});
