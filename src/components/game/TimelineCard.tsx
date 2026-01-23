"use client";

import { Coins, HelpCircle, Music, Target, Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface TimelineCardProps {
  icon?: "music" | "target" | "trophy" | "help" | "question";
  iconColor?: "primary" | "amber" | "muted";
  title?: string;
  artist?: string;
  subtitle?: string;
  year?: number;
  yearMin?: number;
  yearMax?: number | null;
  showYearBadge?: boolean;
  isNew?: boolean;
  isLoading?: boolean;
  isPreview?: boolean;
  isBetPreview?: boolean;
  coinCost?: number;
  playerName?: string;
  className?: string;
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
    primary: "bg-primary/20 text-primary",
    amber: "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400",
    muted: "bg-muted text-muted-foreground",
  };

  const IconComponent = {
    music: Music,
    target: Target,
    trophy: Trophy,
    help: HelpCircle,
    question: HelpCircle,
  }[icon];

  const formatYearRange = (min: number | undefined, max: number | null | undefined): string => {
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
      <Card className={cn("flex items-center gap-3 p-3 animate-pulse", className)}>
        <div className="h-10 w-10 rounded-full bg-muted" />
        <div className="flex-1 min-w-0 space-y-2">
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
        isPreview && "bg-primary/10 border-primary border-dashed animate-pulse",
        isBetPreview && "bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800",
        className,
      )}
    >
      <div
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
          iconColors[iconColor ?? "primary"],
        )}
      >
        <IconComponent className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        {title && <p className="font-medium truncate">{title}</p>}
        {artist && <p className="text-sm text-muted-foreground truncate">{artist}</p>}
        {isBetPreview && playerName && (
          <p className="text-xs text-muted-foreground mt-1">{playerName}</p>
        )}
      </div>
      <div className="flex flex-col items-end gap-2">
        {isBetPreview && (
          <div className="flex items-center gap-1">
            <Badge
              variant="outline"
              className="border-amber-200 text-amber-700 dark:border-amber-700 dark:text-amber-400"
            >
              {formatYearRange(yearMin, yearMax)}
            </Badge>
          </div>
        )}
        <div className="flex items-center gap-2">
          {isBetPreview && coinCost !== undefined && coinCost > 0 && (
            <Badge
              variant="outline"
              className="border-amber-200 text-amber-700 dark:border-amber-700 dark:text-amber-400"
            >
              -{coinCost} <Coins className="ml-1 h-3 w-3" />
            </Badge>
          )}
          {showYearBadge && !isBetPreview && year !== undefined && <Badge>{year}</Badge>}
        </div>
      </div>
    </Card>
  );
}
