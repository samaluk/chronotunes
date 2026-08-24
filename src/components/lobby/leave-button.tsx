"use client";

import { LogOut } from "lucide-react";
import type { ReactNode } from "react";

export function LeaveButton({ label, onLeave }: { label: string; onLeave: () => void }): ReactNode {
  return (
    <button
      aria-label={label}
      className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-3 font-medium text-destructive transition-colors hover:bg-accent hover:text-destructive"
      onClick={onLeave}
      type="button"
    >
      <LogOut className="h-4 w-4" />
    </button>
  );
}
