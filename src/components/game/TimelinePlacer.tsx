"use client";

import { useMutation } from "convex/react";
import type { GenericId } from "convex/values";
import { Check, GripVertical, Loader2, Music } from "lucide-react";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import { useSessionId } from "@/lib/hooks/use-session-id";
import { cn } from "@/lib/utils";

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

interface TrackInfo {
  _id: GenericId<"tracks">;
  title: string;
  artist: string;
  year: number;
  youtubeVideoId?: string;
}

interface TimelinePlacerProps {
  lobbyId: GenericId<"lobbies">;
  player: Player;
  currentTrack: TrackInfo | null;
  existingPreviewIndex: number | null;
}

function TimelineCard({
  track,
  isPreview,
}: {
  track: { title: string; artist: string; year: number };
  isPreview?: boolean;
}): React.ReactNode {
  return (
    <div
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg border transition-all",
        isPreview ? "bg-primary/10 border-primary border-dashed animate-pulse" : "bg-card",
      )}
    >
      <div
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
          isPreview ? "bg-primary/20 text-primary" : "bg-muted",
        )}
      >
        <Music className={cn("h-5 w-5", isPreview ? "" : "text-muted-foreground")} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-foreground truncate">{track.title}</p>
        <p className="text-sm text-muted-foreground truncate">{track.artist}</p>
      </div>
      {!isPreview && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <span className="text-sm font-semibold text-primary">{track.year}</span>
        </div>
      )}
    </div>
  );
}

function DropZone({
  index,
  isActive,
  isPreview,
  onClick,
}: {
  index: number;
  isActive: boolean;
  isPreview: boolean;
  onClick: () => void;
}): React.ReactNode {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full py-1 my-1 rounded-md transition-all duration-200 flex items-center justify-center gap-2",
        isActive
          ? "bg-primary/20 border-2 border-primary border-dashed"
          : "opacity-0 hover:opacity-50 border-2 border-transparent",
        isPreview && "opacity-100 bg-primary/10 border-primary border-dashed",
      )}
    >
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <GripVertical className="h-3 w-3" />
        <span>Drop here</span>
      </div>
    </button>
  );
}

export function TimelinePlacer({
  lobbyId,
  player,
  currentTrack,
  existingPreviewIndex,
}: TimelinePlacerProps): React.ReactNode {
  const sessionId = useSessionId();
  const [selectedIndex, setSelectedIndex] = useState<number | null>(existingPreviewIndex ?? null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const setPlacementPreview = useMutation(api.rounds.setPlacementPreview);
  const submitPlacement = useMutation(api.rounds.submitPlacement);

  const sortedTimeline = [...player.timeline].sort((a, b) => a.year - b.year);

  const handlePositionSelect = useCallback(
    (index: number) => {
      setSelectedIndex(index);
      if (sessionId) {
        void setPlacementPreview({
          lobbyId,
          sessionId,
          proposedIndex: index,
        });
      }
    },
    [lobbyId, sessionId, setPlacementPreview],
  );

  const handleSubmit = useCallback(async () => {
    if (selectedIndex === null || !sessionId) return;

    setIsSubmitting(true);
    try {
      await submitPlacement({
        lobbyId,
        sessionId,
      });
    } catch (error) {
      console.error("Failed to submit placement:", error);
    } finally {
      setIsSubmitting(false);
    }
  }, [lobbyId, sessionId, selectedIndex, submitPlacement]);

  if (!currentTrack) {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        <p className="mt-4 text-muted-foreground">Loading track...</p>
      </div>
    );
  }

  const hasEmptyTimeline = sortedTimeline.length === 0;

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">Place the Song</h3>
        <span className="text-xs text-muted-foreground">
          {player.timelineSize} {player.timelineSize === 1 ? "card" : "cards"} in timeline
        </span>
      </div>

      <div className="space-y-2">
        {hasEmptyTimeline ? (
          <>
            <DropZone
              index={0}
              isActive={selectedIndex === 0}
              isPreview={selectedIndex === 0}
              onClick={() => handlePositionSelect(0)}
            />
            <div className="pl-4">
              <TimelineCard
                track={{
                  title: currentTrack.title,
                  artist: currentTrack.artist,
                  year: currentTrack.year,
                }}
                isPreview={selectedIndex === 0}
              />
            </div>
          </>
        ) : (
          <>
            {sortedTimeline.map((entry, idx) => {
              const isBeforePreview = selectedIndex !== null && idx === selectedIndex;
              const isAfterPreview = selectedIndex !== null && idx === selectedIndex + 1;

              return (
                <div key={`${entry.trackId}-${entry.earnedAtRoundNumber}`}>
                  {isBeforePreview && (
                    <DropZone
                      index={idx}
                      isActive={true}
                      isPreview={true}
                      onClick={() => handlePositionSelect(idx)}
                    />
                  )}
                  <div className={cn(isAfterPreview && "pl-4")}>
                    <TimelineCard
                      track={{
                        title: "Known Track",
                        artist: "Artist",
                        year: entry.year,
                      }}
                    />
                  </div>
                  {isAfterPreview && (
                    <DropZone
                      index={idx + 1}
                      isActive={true}
                      isPreview={true}
                      onClick={() => handlePositionSelect(idx + 1)}
                    />
                  )}
                </div>
              );
            })}

            {selectedIndex === sortedTimeline.length && (
              <DropZone
                index={sortedTimeline.length}
                isActive={true}
                isPreview={true}
                onClick={() => handlePositionSelect(sortedTimeline.length)}
              />
            )}

            {selectedIndex === null && (
              <>
                <DropZone
                  index={0}
                  isActive={false}
                  isPreview={false}
                  onClick={() => handlePositionSelect(0)}
                />
                <div className="pl-4">
                  <TimelineCard
                    track={{
                      title: "Known Track",
                      artist: "Artist",
                      year: sortedTimeline[0].year,
                    }}
                  />
                </div>
                {sortedTimeline.slice(1).map((entry, idx) => (
                  <div key={`${entry.trackId}-${entry.earnedAtRoundNumber}`}>
                    <DropZone
                      index={idx + 1}
                      isActive={false}
                      isPreview={false}
                      onClick={() => handlePositionSelect(idx + 1)}
                    />
                    <div className="pl-4">
                      <TimelineCard
                        track={{
                          title: "Known Track",
                          artist: "Artist",
                          year: entry.year,
                        }}
                      />
                    </div>
                  </div>
                ))}
                <DropZone
                  index={sortedTimeline.length}
                  isActive={false}
                  isPreview={false}
                  onClick={() => handlePositionSelect(sortedTimeline.length)}
                />
              </>
            )}

            <div className="pl-4 mt-2">
              <div className="relative">
                <div className="absolute -left-4 top-1/2 -translate-y-1/2 w-px h-full bg-border" />
                <TimelineCard
                  track={{
                    title: currentTrack.title,
                    artist: currentTrack.artist,
                    year: currentTrack.year,
                  }}
                  isPreview={selectedIndex !== null}
                />
              </div>
            </div>
          </>
        )}
      </div>

      <div className="flex items-center justify-between pt-4 border-t">
        <div className="text-sm">
          {selectedIndex !== null ? (
            <p className="text-muted-foreground">
              Placement:{" "}
              <span className="font-medium text-foreground">
                {selectedIndex === 0
                  ? "First position"
                  : selectedIndex === sortedTimeline.length
                    ? "Last position"
                    : `After ${sortedTimeline[selectedIndex - 1]?.year ?? "position ${selectedIndex}"}`}
              </span>
            </p>
          ) : (
            <p className="text-muted-foreground">Select a position to place the song</p>
          )}
        </div>

        <Button onClick={handleSubmit} disabled={selectedIndex === null || isSubmitting} size="lg">
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <Check className="mr-2 h-4 w-4" />
              Confirm Placement
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
