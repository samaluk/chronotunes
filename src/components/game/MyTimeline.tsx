"use client";

import { useQuery } from "convex/react";
import type { GenericId } from "convex/values";
import { Music } from "lucide-react";
import { useMemo } from "react";
import { useIsMounted } from "usehooks-ts";
import { api } from "@/convex/_generated/api";
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
  const isMounted = useIsMounted();

  const trackIds = player?.timeline.map((entry) => entry.trackId) ?? [];
  const tracks = useQuery(
    api.tracks.get,
    isMounted() && trackIds.length > 0 ? { trackIds } : "skip",
  );

  if (!isMounted()) {
    return (
      <div className="w-full space-y-3">
        <div className="h-6 w-32 animate-pulse rounded bg-muted" />
        <TimelineCard isLoading={true} />
        <TimelineCard isLoading={true} />
      </div>
    );
  }

  if (!player || player.timeline.length === 0) {
    return (
      <div className="w-full">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-medium text-muted-foreground text-sm">My Timeline</h3>
          {player && <span className="text-muted-foreground text-xs">0 cards</span>}
        </div>
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-muted/30 py-8">
          <Music className="mb-2 h-8 w-8 text-muted-foreground" />
          <p className="text-center text-muted-foreground text-sm">
            {player ? "No cards yet" : "Loading..."}
          </p>
          {player && (
            <p className="mt-1 text-center text-muted-foreground text-xs">
              Place songs on your timeline to collect cards
            </p>
          )}
        </div>
      </div>
    );
  }

  const isLoading = tracks === undefined;
  const trackMap = useMemo(() => {
    if (!(tracks && Array.isArray(tracks))) return new Map();
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
        <h3 className="font-medium text-muted-foreground text-sm">My Timeline</h3>
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
                  icon="music"
                  iconColor="muted"
                  key={`${entry.trackId}-${entry.earnedAtRoundNumber}`}
                  subtitle={
                    entry.earnedBy === "placement"
                      ? "Placed yourself"
                      : entry.earnedBy === "bet"
                        ? "Won from bet"
                        : entry.earnedBy === "initial"
                          ? "Initial placement"
                          : "Unknown"
                  }
                  title="Unknown Track"
                  year={entry.year}
                />
              );
            }

            const isPlacement = entry.earnedBy === "placement";

            return (
              <TimelineCard
                artist={track.artist}
                icon={isPlacement ? "target" : "trophy"}
                iconColor={isPlacement ? "primary" : "amber"}
                key={`${entry.trackId}-${entry.earnedAtRoundNumber}`}
                title={track.title}
                year={track.year}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
