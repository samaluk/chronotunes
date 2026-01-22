"use client";

import { HelpCircle, Music } from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";

interface TimelineEntry {
  trackId: Id<"tracks">;
  year: number;
  earnedAtRoundNumber: number;
  earnedBy: "placement" | "bet" | "initial";
}

interface RevealedTrack {
  trackId: Id<"tracks">;
  title: string;
  artist: string;
  year: number;
  youtubeVideoId?: string;
}

interface TurnPlayerTimelineProps {
  turnPlayerName: string;
  timeline: TimelineEntry[];
  timelineSize: number;
  revealedTracks: RevealedTrack[];
  existingPreviewIndex: number | null;
}

function RevealedCard({
  track,
}: {
  track: { title: string; artist: string; year: number };
}): React.ReactNode {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border bg-card">
      <div
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
          "bg-primary/10 text-primary",
        )}
      >
        <Music className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-foreground truncate">{track.title}</p>
        <p className="text-sm text-muted-foreground truncate">{track.artist}</p>
      </div>
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
        <span className="text-sm font-semibold text-primary">{track.year}</span>
      </div>
    </div>
  );
}

function YearCard({ year }: { year: number }): React.ReactNode {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border bg-card">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
        <span className="text-sm font-semibold text-primary">{year}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-foreground truncate">Known Track</p>
        <p className="text-sm text-muted-foreground truncate">From round</p>
      </div>
    </div>
  );
}

function MysteryCard({ isPreview }: { isPreview: boolean }): React.ReactNode {
  return (
    <div
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg border transition-all",
        isPreview
          ? "bg-primary/10 border-primary border-dashed animate-pulse"
          : "bg-muted/50 border-border border-dashed",
      )}
    >
      <div
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
          isPreview ? "bg-primary/20 text-primary" : "bg-muted",
        )}
      >
        <HelpCircle className={cn("h-5 w-5", isPreview ? "" : "text-muted-foreground")} />
      </div>
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "font-medium truncate",
            isPreview ? "text-foreground" : "text-muted-foreground",
          )}
        >
          {isPreview ? "New Song" : "Mystery Song"}
        </p>
        <p className="text-sm text-muted-foreground truncate">
          {isPreview ? "Guess the year!" : "???"}
        </p>
      </div>
    </div>
  );
}

export function TurnPlayerTimeline({
  turnPlayerName,
  timeline,
  timelineSize,
  revealedTracks,
  existingPreviewIndex,
}: TurnPlayerTimelineProps): React.ReactNode {
  const sortedTimeline = [...timeline].sort((a, b) => a.year - b.year);

  const revealedTrackMap = new Map(revealedTracks.map((t) => [t.trackId, t]));

  const hasEmptyTimeline = sortedTimeline.length === 0;

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">{turnPlayerName}'s Timeline</h3>
        <span className="text-xs text-muted-foreground">
          {timeline.length} / {timelineSize} cards
        </span>
      </div>

      <div className="space-y-2">
        {hasEmptyTimeline ? (
          existingPreviewIndex === 0 ? (
            <MysteryCard isPreview={true} />
          ) : (
            <MysteryCard isPreview={false} />
          )
        ) : (
          <>
            {sortedTimeline.map((entry, idx) => {
              const isBeforePreview = existingPreviewIndex !== null && idx === existingPreviewIndex;
              const isAfterPreview =
                existingPreviewIndex !== null && idx === existingPreviewIndex + 1;
              const revealedTrack = revealedTrackMap.get(entry.trackId);

              return (
                <div key={`${entry.trackId}-${entry.earnedAtRoundNumber}`}>
                  {isBeforePreview && <MysteryCard isPreview={true} />}
                  <div className={cn(isAfterPreview && "pl-4")}>
                    {revealedTrack ? (
                      <RevealedCard
                        track={{
                          title: revealedTrack.title,
                          artist: revealedTrack.artist,
                          year: revealedTrack.year,
                        }}
                      />
                    ) : (
                      <YearCard year={entry.year} />
                    )}
                  </div>
                </div>
              );
            })}

            {existingPreviewIndex === sortedTimeline.length && <MysteryCard isPreview={true} />}

            {existingPreviewIndex === null && <MysteryCard isPreview={false} />}
          </>
        )}
      </div>

      {existingPreviewIndex !== null && (
        <div className="flex items-center justify-center gap-2 p-2 rounded-lg bg-primary/10">
          <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
          <span className="text-xs text-primary font-medium">
            Previewing placement at position {existingPreviewIndex + 1}
          </span>
        </div>
      )}
    </div>
  );
}
