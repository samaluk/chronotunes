"use client"

import { ConvexProvider, ConvexReactClient } from "convex/react"
import { SessionProvider } from "convex-helpers/react/sessions"
import { ThemeProvider } from "next-themes"
import type { ReactNode } from "react"
import { Toaster } from "sonner"
import { useLocalStorage } from "usehooks-ts"
import { ConnectionBanner } from "@/components/ui/network-status"

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export function Providers({ children }: { children: ReactNode }): ReactNode {
  return (
    <ConvexProvider client={convex}>
      <SessionProvider ssrFriendly storageKey="chronotunes-session-id" useStorage={useLocalStorage}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          disableTransitionOnChange
          enableSystem
        >
          {children}
          <ConnectionBanner />
          <Toaster closeButton position="bottom-right" richColors />
        </ThemeProvider>
      </SessionProvider>
    </ConvexProvider>
  )
}
