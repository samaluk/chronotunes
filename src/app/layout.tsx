import type { Metadata } from "next"
import { Geist, Geist_Mono, Inter } from "next/font/google"
import { cookies } from "next/headers"
import type { Locale } from "next-intl"
import { NextIntlClientProvider } from "next-intl"
import { getLocale, getMessages } from "next-intl/server"
import { Providers } from "./providers"
import "./globals.css"

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" })

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "ChronoTunes - Music Timeline Game",
  description: "A multiplayer music timeline game inspired by Hitster",
}

export default async function Layout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale()
  const messages = await getMessages()

  async function changeLocaleAction(nextLocale: Locale) {
    "use server"
    const store = await cookies()
    store.set("locale", nextLocale)
  }

  return (
    <html className={inter.variable} lang={locale} suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <Providers changeLocaleAction={changeLocaleAction}>{children}</Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
