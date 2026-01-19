"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ThemeProvider } from "next-themes";
import type { ReactNode } from "react";
import { Toaster } from "sonner";
import { ConnectionBanner } from "@/components/ui/network-status";

let convexClient: ConvexReactClient | null = null;

function getConvexClient(): ConvexReactClient | null {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) {
    return null;
  }
  if (!convexClient) {
    convexClient = new ConvexReactClient(url, {
      onWillRefreshAuthTokens: () => {
        return Promise.resolve();
      },
    });
  }
  return convexClient;
}

function useConvexClient(): ConvexReactClient | null {
  if (typeof window !== "undefined" && !convexClient) {
    convexClient = getConvexClient();
  }
  return convexClient;
}

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps): ReactNode {
  const client = useConvexClient();

  const content = (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      {children}
      <ConnectionBanner />
      <Toaster richColors closeButton position="bottom-right" />
    </ThemeProvider>
  );

  if (client) {
    return <ConvexProvider client={client}>{content}</ConvexProvider>;
  }

  return content;
}
