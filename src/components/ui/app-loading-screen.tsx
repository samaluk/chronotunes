import { Music } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";

// The locale cookie has not resolved yet, so the first shell uses only the brand.
export function AppLoadingScreen() {
  return (
    <main
      aria-busy="true"
      className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background p-6"
    >
      <h1 className="flex items-center gap-2 font-bold text-2xl text-foreground">
        <Music aria-hidden="true" className="h-8 w-8 text-primary" />
        ChronoTunes
      </h1>
      <Skeleton className="h-40 w-full max-w-lg rounded-3xl" />
    </main>
  );
}
