import type { Metadata } from "next";
import type { Locale } from "next-intl";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import { cookies } from "next/headers";

import { Providers } from "./providers";

import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  description: "A multiplayer music timeline game inspired by Hitster",
  title: "ChronoTunes - Music Timeline Game",
};

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const messages = await getMessages();

  async function changeLocaleAction(nextLocale: Locale) {
    "use server";
    const store = await cookies();
    store.set("locale", nextLocale);
  }

  return (
    <html className={inter.variable} lang={locale} suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <NextIntlClientProvider locale={locale} messages={messages}>
          <Providers changeLocaleAction={changeLocaleAction}>
            {children}
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
