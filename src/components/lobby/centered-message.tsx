"use client";

import type { ReactNode } from "react";

export function CenteredMessage({ children }: { children: ReactNode }): ReactNode {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">{children}</div>
    </div>
  );
}
