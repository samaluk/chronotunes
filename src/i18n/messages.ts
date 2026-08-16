import enMessages from "../../messages/en.json";
import esMessages from "../../messages/es.json";

import { routing } from "./routing";

export type Locale = (typeof routing.locales)[number];

export const messagesByLocale = { en: enMessages, es: esMessages } as const;

// oxlint-disable-next-line typescript/consistent-type-assertions, typescript/no-unsafe-type-assertion
const isLocale = (value: string): value is Locale => routing.locales.includes(value as Locale);

export function resolveLocale(cookieLocale: string | undefined): Locale {
  const rawLocale = cookieLocale || routing.defaultLocale;
  return isLocale(rawLocale) ? rawLocale : routing.defaultLocale;
}
