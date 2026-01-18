"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ThemeProvider } from "next-themes";
import type { ReactNode } from "react";
import { Toaster } from "sonner";

// Create the Convex client lazily to avoid errors during static builds
function getConvexClient(): ConvexReactClient | null {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) {
    // During build, return null (will be handled in Providers)
    return null;
  }
  return new ConvexReactClient(url);
}

// Client is initialized once per browser session
let convexClient: ConvexReactClient | null = null;

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

  // During SSR or if no Convex URL is set, render without ConvexProvider
  const content = (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      {children}
      <Toaster richColors closeButton position="bottom-right" />
    </ThemeProvider>
  );

  // Wrap with ConvexProvider only if client is available
  if (client) {
    return <ConvexProvider client={client}>{content}</ConvexProvider>;
  }

  return content;
}
