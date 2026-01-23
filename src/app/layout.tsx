import type { Metadata } from "next"
import { Geist, Geist_Mono, Inter } from "next/font/google"
import { NextIntlClientProvider } from "next-intl"
import { routing } from "@/i18n/routing"
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

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html className={inter.variable} lang={routing.defaultLocale} suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <NextIntlClientProvider>
          <Providers>{children}</Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
