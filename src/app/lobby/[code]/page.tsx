"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function LobbyPage(): React.ReactNode {
  const params = useParams();
  const code = typeof params.code === "string" ? params.code : "";
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!code) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-destructive">Invalid lobby code</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b p-4">
        <div className="container mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold">ChronoTunes</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">Lobby Code:</span>
            <span className="font-mono text-lg font-bold">{code}</span>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto py-8">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold mb-6">Game Lobby</h2>

          <div className="p-4 rounded-lg bg-muted">
            <p className="text-center text-muted-foreground">
              Lobby page - full implementation coming in S11
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
