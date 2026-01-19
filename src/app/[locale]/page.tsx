"use client";

import dynamic from "next/dynamic";

const LandingPageContent = dynamic(() => import("../LandingPageContent"), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background font-sans">
      <main className="flex w-full max-w-3xl flex-col items-center justify-between gap-8 px-8 py-16 sm:px-16">
        <div className="flex w-full items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-primary/20 animate-pulse" />
            <div className="h-8 w-32 rounded bg-muted animate-pulse" />
          </div>
          <div className="h-8 w-8 rounded-md bg-muted animate-pulse" />
        </div>
        <div className="flex flex-col items-center gap-6 text-center">
          <div className="h-12 w-64 rounded bg-muted animate-pulse" />
          <div className="h-6 w-96 rounded bg-muted animate-pulse" />
        </div>
      </main>
    </div>
  ),
});

export default function LocaleLandingPage(): React.ReactNode {
  return <LandingPageContent />;
}
