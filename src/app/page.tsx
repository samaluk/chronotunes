"use client";

import { Music } from "lucide-react";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export default function Home(): React.ReactNode {
  return (
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
            Test your music knowledge by placing songs in chronological order. Compete with friends
            and bet on outcomes!
          </p>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row">
          <button
            type="button"
            onClick={() =>
              toast.success("Game created!", { description: "Share the code with friends" })
            }
            className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-primary px-6 text-base font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            Create Game
          </button>
          <button
            type="button"
            onClick={() => toast.info("Enter a game code to join")}
            className="inline-flex h-12 items-center justify-center rounded-full border border-input bg-background px-6 text-base font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            Join Game
          </button>
        </div>
      </main>
    </div>
  );
}
