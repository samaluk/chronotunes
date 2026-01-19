"use client";

import { useQuery } from "convex/react";
import type { GenericId } from "convex/values";
import { Music, Target, Trophy } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "@/convex/_generated/api.js";

interface TimelineEntry {
  trackId: GenericId<"tracks">;
  year: number;
  earnedAtRoundNumber: number;
  earnedBy: "placement" | "bet";
}

interface Player {
  _id: GenericId<"players">;
  displayName: string;
  timeline: TimelineEntry[];
  timelineSize: number;
}

interface Track {
  _id: GenericId<"tracks">;
  title: string;
  artist: string;
  year: number;
}

interface MyTimelineProps {
  player: Player;
}

function TimelineCard({
  track,
  earnedBy,
}: {
  track: Track;
  earnedBy: "placement" | "bet";
}): React.ReactNode {
  const isPlacement = earnedBy === "placement";

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-card border transition-all hover:shadow-md">
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
          isPlacement
            ? "bg-primary/20 text-primary"
            : "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400"
        }`}
      >
        {isPlacement ? <Target className="h-5 w-5" /> : <Trophy className="h-5 w-5" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-lg font-semibold text-foreground truncate">{track.title}</span>
        </div>
        <p className="text-sm text-muted-foreground truncate">{track.artist}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded">
            {track.year}
          </span>
          <span
            className={`text-xs ${
              isPlacement ? "text-primary" : "text-amber-600 dark:text-amber-400"
            }`}
          >
            {isPlacement ? "Placed yourself" : "Won from bet"}
          </span>
        </div>
      </div>
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
        <Music className="h-4 w-4 text-muted-foreground" />
      </div>
    </div>
  );
}

function TimelineCardSkeleton(): React.ReactNode {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-card border animate-pulse">
      <div className="h-10 w-10 rounded-full bg-muted" />
      <div className="flex-1 min-w-0 space-y-2">
        <div className="h-5 w-3/4 rounded bg-muted" />
        <div className="h-4 w-1/2 rounded bg-muted" />
        <div className="flex items-center gap-2">
          <div className="h-5 w-12 rounded bg-muted" />
        </div>
      </div>
      <div className="h-8 w-8 rounded-full bg-muted" />
    </div>
  );
}

export function MyTimeline({ player }: MyTimelineProps): React.ReactNode {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const trackIds = player.timeline.map((entry) => entry.trackId);
  const tracks = useQuery(api.tracks.get, mounted && trackIds.length > 0 ? { trackIds } : "skip");

  if (!mounted) {
    return (
      <div className="w-full space-y-3">
        <div className="h-6 w-32 rounded bg-muted animate-pulse" />
        <TimelineCardSkeleton />
        <TimelineCardSkeleton />
      </div>
    );
  }

  if (player.timeline.length === 0) {
    return (
      <div className="w-full">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-muted-foreground">My Timeline</h3>
          <span className="text-xs text-muted-foreground">0 cards</span>
        </div>
        <div className="flex flex-col items-center justify-center py-8 rounded-lg border border-dashed bg-muted/30">
          <Music className="h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground text-center">No cards yet</p>
          <p className="text-xs text-muted-foreground text-center mt-1">
            Place songs on your timeline to collect cards
          </p>
        </div>
      </div>
    );
  }

  const isLoading = tracks === undefined;
  const trackMap = new Map<GenericId<"tracks">, Track>();
  if (Array.isArray(tracks)) {
    for (const track of tracks) {
      if (track) {
        trackMap.set(track._id, track);
      }
    }
  }

  const sortedTimeline = [...player.timeline].sort((a, b) => a.year - b.year);

  return (
    <div className="w-full space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">My Timeline</h3>
        <span className="text-xs text-muted-foreground">
          {player.timelineSize} {player.timelineSize === 1 ? "card" : "cards"}
        </span>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <TimelineCardSkeleton />
          <TimelineCardSkeleton />
        </div>
      ) : (
        <div className="space-y-2">
          {sortedTimeline.map((entry) => {
            const track = trackMap.get(entry.trackId);
            if (!track) {
              return (
                <div
                  key={`${entry.trackId}-${entry.earnedAtRoundNumber}`}
                  className="flex items-start gap-3 p-3 rounded-lg bg-card border"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-muted-foreground">Track {entry.year}</p>
                    <p className="text-xs text-muted-foreground">
                      {entry.earnedBy === "placement" ? "Placed yourself" : "Won from bet"}
                    </p>
                  </div>
                </div>
              );
            }
            return (
              <TimelineCard
                key={`${entry.trackId}-${entry.earnedAtRoundNumber}`}
                track={track}
                earnedBy={entry.earnedBy}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
