"use client";

import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";

export function ActivityIndicator({ label }: { label: string | null }): ReactNode {
  if (!label) {
    return null;
  }
  return (
    <div className="flex items-center justify-center gap-2 rounded-lg bg-muted/50 p-2">
      <Loader2 className="h-4 w-4 animate-spin" />
      <span className="text-muted-foreground text-sm">{label}</span>
    </div>
  );
}
