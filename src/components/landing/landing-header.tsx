"use client";

import { Music } from "lucide-react";
import type { ReactNode } from "react";

import { LocaleSwitcher } from "@/components/ui/locale-switcher";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export function LandingHeader({ title }: { title: string }): ReactNode {
  return (
    <header className="flex w-full items-center justify-between">
      <div className="flex items-center gap-2">
        <Music className="h-8 w-8 text-primary" />
        <span className="font-bold text-2xl text-foreground">{title}</span>
      </div>
      <div className="flex items-center gap-2">
        <LocaleSwitcher />
        <ThemeToggle />
      </div>
    </header>
  );
}
