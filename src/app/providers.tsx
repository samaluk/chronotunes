"use client";

import { SessionProvider } from "convex-helpers/react/sessions";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import type { Locale } from "next-intl";
import { ThemeProvider } from "next-themes";
import type { ReactNode } from "react";
import { Toaster } from "sonner";
import { useLocalStorage } from "usehooks-ts";

import { ConnectionBanner } from "@/components/ui/network-status";
import { LocaleActionProvider } from "@/i18n/locale-action";

// oxlint-disable-next-line typescript/no-non-null-assertion
const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export function Providers({
  children,
  changeLocaleAction,
}: {
  children: ReactNode;
  changeLocaleAction: (locale: Locale) => Promise<void>;
}): ReactNode {
  return (
    <ConvexProvider client={convex}>
      <SessionProvider ssrFriendly storageKey="chronotunes-session-id" useStorage={useLocalStorage}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          disableTransitionOnChange
          enableSystem
        >
          <LocaleActionProvider changeLocaleAction={changeLocaleAction}>
            {children}
          </LocaleActionProvider>
          <ConnectionBanner />
          <Toaster closeButton position="bottom-right" richColors />
        </ThemeProvider>
      </SessionProvider>
    </ConvexProvider>
  );
}
