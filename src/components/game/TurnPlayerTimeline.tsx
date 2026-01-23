"use client";

import type { Id } from "@/convex/_generated/dataModel";
import { getRevealedTrackMap, sortTimelineByYear } from "@/lib/timeline";
import { TimelineCard } from "./TimelineCard";

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

export function TurnPlayerTimeline({
  turnPlayerName,
  timeline,
  timelineSize,
  revealedTracks,
  existingPreviewIndex,
}: TurnPlayerTimelineProps): React.ReactNode {
  const sortedTimeline = sortTimelineByYear(timeline);
  const revealedTrackMap = getRevealedTrackMap(revealedTracks);
  const hasEmptyTimeline = sortedTimeline.length === 0;

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">
          {turnPlayerName}&apos;s Timeline
        </h3>
      </div>

      <div className="space-y-2">
        {hasEmptyTimeline ? (
          existingPreviewIndex === 0 ? (
            <TimelineCard isNew={true} isPreview={true} />
          ) : (
            <TimelineCard icon="question" iconColor="muted" isNew={false} />
          )
        ) : (
          <>
            {sortedTimeline.map((entry, idx) => {
              const isBeforePreview = existingPreviewIndex !== null && idx === existingPreviewIndex;
              const revealedTrack = revealedTrackMap.get(entry.trackId);

              return (
                <div key={`${entry.trackId}-${entry.earnedAtRoundNumber}-${idx}`}>
                  {isBeforePreview && <TimelineCard isNew={true} isPreview={true} />}
                  {revealedTrack ? (
                    <TimelineCard
                      icon="music"
                      title={revealedTrack.title}
                      artist={revealedTrack.artist}
                      year={revealedTrack.year}
                    />
                  ) : (
                    <TimelineCard
                      icon="music"
                      title="Known Track"
                      subtitle="From round"
                      year={entry.year}
                      iconColor="primary"
                    />
                  )}
                </div>
              );
            })}

            {existingPreviewIndex === sortedTimeline.length && (
              <TimelineCard isNew={true} isPreview={true} />
            )}

            {existingPreviewIndex === null && (
              <TimelineCard icon="question" iconColor="muted" isNew={false} />
            )}
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
