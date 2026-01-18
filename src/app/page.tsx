"use client";

import { Music } from "lucide-react";
import dynamic from "next/dynamic";
import { ThemeToggle } from "@/components/ui/theme-toggle";

const LandingPageContent = dynamic(() => import("./LandingPageContent"), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background font-sans">
      <main className="flex w-full max-w-3xl flex-col items-center justify-between gap-8 px-8 py-16 sm:px-16">
        <div className="flex w-full items-center justify-between">
          <div className="flex items-center gap-2">
            <Music className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold text-foreground">ChronoTunes</span>
          </div>
          <ThemeToggle />
        </div>
        <div className="flex flex-col items-center gap-6 text-center">
          <h1 className="fl-text-2xl/4xl max-w-md font-semibold leading-tight tracking-tight text-foreground">
            Music Timeline Game
          </h1>
          <p className="fl-text-base/lg max-w-md leading-relaxed text-muted-foreground">
            Loading...
          </p>
        </div>
      </main>
    </div>
  ),
});

export default function LandingPage(): React.ReactNode {
  return <LandingPageContent />;
}
