"use client";

import { Music } from "lucide-react";
import type { ReactNode } from "react";

export function LobbyHeader({ title, subtitle }: { title: string; subtitle: string }): ReactNode {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
        <Music className="h-5 w-5 text-primary" />
      </div>
      <div>
        <h1 className="font-bold text-xl">{title}</h1>
        <p className="text-muted-foreground text-sm">{subtitle}</p>
      </div>
    </div>
  );
}
