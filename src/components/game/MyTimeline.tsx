"use client";

import { useQuery } from "convex/react";
import type { GenericId } from "convex/values";
import { Music } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { api } from "@/convex/_generated/api.js";
import { useMounted } from "@/lib/hooks/useMounted";
import { sortTimelineByYear } from "@/lib/timeline";
import { TimelineCard } from "./TimelineCard";

interface TimelineEntry {
  trackId: GenericId<"tracks">;
  year: number;
  earnedAtRoundNumber: number;
  earnedBy: "placement" | "bet" | "initial";
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
  player: Player | null;
}

export function MyTimeline({ player }: MyTimelineProps): React.ReactNode {
  const mounted = useMounted();

  const trackIds = player?.timeline.map((entry) => entry.trackId) ?? [];
  const tracks = useQuery(api.tracks.get, mounted && trackIds.length > 0 ? { trackIds } : "skip");

  if (!mounted) {
    return (
      <div className="w-full space-y-3">
        <div className="h-6 w-32 rounded bg-muted animate-pulse" />
        <TimelineCard isLoading={true} />
        <TimelineCard isLoading={true} />
      </div>
    );
  }

  if (!player || player.timeline.length === 0) {
    return (
      <div className="w-full">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-muted-foreground">My Timeline</h3>
          {player && <span className="text-xs text-muted-foreground">0 cards</span>}
        </div>
        <div className="flex flex-col items-center justify-center py-8 rounded-lg border border-dashed bg-muted/30">
          <Music className="h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground text-center">
            {player ? "No cards yet" : "Loading..."}
          </p>
          {player && (
            <p className="text-xs text-muted-foreground text-center mt-1">
              Place songs on your timeline to collect cards
            </p>
          )}
        </div>
      </div>
    );
  }

  const isLoading = tracks === undefined;
  const trackMap = useMemo(() => {
    if (!tracks || !Array.isArray(tracks)) return new Map();
    return new Map(
      tracks
        .filter((track): track is NonNullable<typeof track> => track != null)
        .map((track) => [track._id, track]),
    );
  }, [tracks]);
  const sortedTimeline = sortTimelineByYear(player.timeline);

  return (
    <div className="w-full space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">My Timeline</h3>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <TimelineCard isLoading={true} />
          <TimelineCard isLoading={true} />
        </div>
      ) : (
        <div className="space-y-2">
          {sortedTimeline.map((entry) => {
            const track = trackMap.get(entry.trackId);
            if (!track) {
              return (
                <TimelineCard
                  key={`${entry.trackId}-${entry.earnedAtRoundNumber}`}
                  icon="music"
                  iconColor="muted"
                  title="Unknown Track"
                  subtitle={
                    entry.earnedBy === "placement"
                      ? "Placed yourself"
                      : entry.earnedBy === "bet"
                        ? "Won from bet"
                        : entry.earnedBy === "initial"
                          ? "Initial placement"
                          : "Unknown"
                  }
                  year={entry.year}
                />
              );
            }

            const isPlacement = entry.earnedBy === "placement";

            return (
              <TimelineCard
                key={`${entry.trackId}-${entry.earnedAtRoundNumber}`}
                icon={isPlacement ? "target" : "trophy"}
                iconColor={isPlacement ? "primary" : "amber"}
                title={track.title}
                artist={track.artist}
                year={track.year}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
