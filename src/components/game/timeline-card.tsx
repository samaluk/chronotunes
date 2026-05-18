"use client";

import { Coins, HelpCircle, Music, Target, Trophy } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface TimelineCardProps {
  artist?: string;
  className?: string;
  coinCost?: number;
  icon?: "music" | "target" | "trophy" | "help" | "question";
  iconColor?: "primary" | "amber" | "muted";
  isBetPreview?: boolean;
  isLoading?: boolean;
  isNew?: boolean;
  isPreview?: boolean;
  playerName?: string;
  showYearBadge?: boolean;
  subtitle?: string;
  title?: string;
  year?: number;
  yearMax?: number | null;
  yearMin?: number;
}

export function TimelineCard({
  icon = "music",
  iconColor = "primary",
  title,
  artist,
  subtitle: _subtitle,
  year,
  yearMin,
  yearMax,
  showYearBadge = true,
  isNew: _isNew = false,
  isLoading = false,
  isPreview = false,
  isBetPreview = false,
  coinCost,
  playerName,
  className,
}: TimelineCardProps): React.ReactNode {
  const iconColors = {
    amber:
      "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400",
    muted: "bg-muted text-muted-foreground",
    primary: "bg-primary/20 text-primary",
  };

  const IconComponent = {
    help: HelpCircle,
    music: Music,
    question: HelpCircle,
    target: Target,
    trophy: Trophy,
  }[icon];

  const formatYearRange = (
    min: number | undefined,
    max: number | null | undefined
  ): string => {
    if (min !== undefined && max !== undefined) {
      if (max === null) {
        return `${min} - ∞`;
      }
      return `${min} - ${max}`;
    }
    if (min !== undefined) {
      return String(min);
    }
    if (year !== undefined) {
      return String(year);
    }
    return "???";
  };

  if (isLoading) {
    return (
      <Card
        className={cn("flex animate-pulse items-center gap-3 p-3", className)}
      >
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
    <Card
      className={cn(
        "flex flex-row items-center gap-3 p-3 transition-all",
        isPreview && "animate-pulse border-primary border-dashed bg-primary/10",
        isBetPreview &&
          "border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30",
        className
      )}
    >
      <div
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
          iconColors[iconColor ?? "primary"]
        )}
      >
        <IconComponent className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        {title && <p className="truncate font-medium">{title}</p>}
        {artist && (
          <p className="truncate text-muted-foreground text-sm">{artist}</p>
        )}
        {isBetPreview && playerName && (
          <p className="mt-1 text-muted-foreground text-xs">{playerName}</p>
        )}
      </div>
      <div className="flex flex-col items-end gap-2">
        {isBetPreview && (
          <div className="flex items-center gap-1">
            <Badge
              className="border-amber-200 text-amber-700 dark:border-amber-700 dark:text-amber-400"
              variant="outline"
            >
              {formatYearRange(yearMin, yearMax)}
            </Badge>
          </div>
        )}
        <div className="flex items-center gap-2">
          {isBetPreview && coinCost !== undefined && coinCost > 0 && (
            <Badge
              className="border-amber-200 text-amber-700 dark:border-amber-700 dark:text-amber-400"
              variant="outline"
            >
              -{coinCost} <Coins className="ml-1 h-3 w-3" />
            </Badge>
          )}
          {showYearBadge && !isBetPreview && year !== undefined && (
            <Badge>{year}</Badge>
          )}
        </div>
      </div>
    </Card>
  );
}
