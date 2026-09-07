import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import { Suspense } from "react";

import { AppLoadingScreen } from "@/components/ui/app-loading-screen";
import { routing } from "@/i18n/routing";

import { LocalizedProviders } from "./localized-providers";

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

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html className={inter.variable} lang={routing.defaultLocale} suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Suspense fallback={<AppLoadingScreen />}>
          <LocalizedProviders>{children}</LocalizedProviders>
        </Suspense>
      </body>
    </html>
  );
}
