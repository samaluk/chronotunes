"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

export function ThemeToggle(): React.ReactNode {
  const { theme, setTheme } = useTheme();

  return (
    <button
      aria-label="Toggle theme"
      className="inline-flex items-center justify-center rounded-md border border-input bg-background p-2 font-medium text-sm ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      type="button"
    >
      <Sun className="h-5 w-5 transition-opacity dark:opacity-0" />
      <Moon className="absolute h-5 w-5 opacity-0 transition-opacity dark:opacity-100" />
    </button>
  );
}
