"use client";

import { Music, Target, Trophy } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface TimelineCardProps {
  artist?: string;
  className?: string;
  icon?: "music" | "target" | "trophy";
  iconColor?: "primary" | "amber" | "muted";
  isLoading?: boolean;
  subtitle?: string;
  title?: string;
  year?: number;
}

export function TimelineCard({
  icon = "music",
  iconColor = "primary",
  title,
  artist,
  subtitle,
  year,
  isLoading = false,
  className,
}: TimelineCardProps): React.ReactNode {
  const iconColors = {
    amber: "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400",
    muted: "bg-muted text-muted-foreground",
    primary: "bg-primary/20 text-primary",
  };

  const IconComponent = {
    music: Music,
    target: Target,
    trophy: Trophy,
  }[icon];

  if (isLoading) {
    return (
      <Card className={cn("flex animate-pulse items-center gap-3 p-3", className)}>
        <div className="h-10 w-10 rounded-full bg-muted" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="h-5 w-3/4 rounded bg-muted" />
          <div className="h-4 w-1/2 rounded bg-muted" />
        </div>
        <div className="h-8 w-12 rounded bg-muted" />
      </Card>
    );
  }

  return (
    <Card className={cn("flex flex-row items-center gap-3 p-3", className)}>
      <div
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
          iconColors[iconColor ?? "primary"],
        )}
      >
        <IconComponent className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        {title && <p className="truncate font-medium">{title}</p>}
        {artist && <p className="truncate text-muted-foreground text-sm">{artist}</p>}
        {subtitle && <p className="truncate text-muted-foreground text-xs">{subtitle}</p>}
      </div>
      {year !== undefined && (
        <div className="flex flex-col items-end gap-2">
          <Badge>{year}</Badge>
        </div>
      )}
    </Card>
  );
}
