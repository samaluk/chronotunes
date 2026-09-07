import type { Locale } from "next-intl";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { cookies } from "next/headers";
import type { ReactNode } from "react";

import { DocumentLanguage } from "@/i18n/document-language";

import { Providers } from "./providers";

export async function LocalizedProviders({ children }: { children: ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages();

  async function changeLocaleAction(nextLocale: Locale) {
    "use server";
    const store = await cookies();
    store.set("locale", nextLocale, { path: "/", sameSite: "lax" });
  }

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <div lang={locale}>
        <DocumentLanguage />
        <Providers changeLocaleAction={changeLocaleAction}>{children}</Providers>
      </div>
    </NextIntlClientProvider>
  );
}
