"use client";

import dynamic from "next/dynamic";
import { useParams } from "next/navigation";
import type { ReactNode } from "react";

const LobbyPageContent = dynamic(() => import("./LobbyPageContent"), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="mt-4 text-muted-foreground">Loading...</p>
      </div>
    </div>
  ),
});

export default function LobbyPage(): ReactNode {
  const params = useParams();
  const code = typeof params.code === "string" ? params.code.toUpperCase() : "";

  if (!code) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-destructive">Invalid lobby code</p>
        </div>
      </div>
    );
  }

  return <LobbyPageContent code={code} />;
}
