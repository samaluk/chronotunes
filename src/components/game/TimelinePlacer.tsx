"use client";

import { useSessionMutation } from "convex-helpers/react/sessions";
import { Check, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { sortTimelineByYear } from "@/lib/timeline";
import { TimelineCard } from "./TimelineCard";

interface TrackInfo {
  _id: Id<"tracks">;
  title?: string;
  artist?: string;
  year?: number;
  youtubeVideoId?: string;
}

interface RevealedTrack {
  trackId: Id<"tracks">;
  title: string;
  artist: string;
  year: number;
  youtubeVideoId?: string;
}

interface TimelinePlacerProps {
  lobbyId: Id<"lobbies">;
  player: Doc<"players">;
  currentTrack: TrackInfo | null;
  existingPreviewIndex: number | null;
  revealedTracks: RevealedTrack[];
}

export function TimelinePlacer({
  lobbyId,
  player,
  currentTrack,
  existingPreviewIndex,
  revealedTracks,
}: TimelinePlacerProps): React.ReactNode {
  const t = useTranslations("placing");

  const [selectedIndex, setSelectedIndex] = useState<number>(existingPreviewIndex ?? 0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const _setPlacementPreview = useSessionMutation(api.rounds.setPlacementPreview);
  const submitPlacement = useSessionMutation(api.rounds.submitPlacement);

  const sortedTimeline = sortTimelineByYear(player.timeline);
  const revealedTrackMap = useMemo(
    () => new Map(revealedTracks.map((track) => [track.trackId, track])),
    [revealedTracks],
  );
  const maxPosition = sortedTimeline.length;

  const handleSubmit = useCallback(async () => {
    setIsSubmitting(true);
    try {
      await submitPlacement({
        lobbyId,
      });
    } catch (error) {
      console.error("Failed to submit placement:", error);
    } finally {
      setIsSubmitting(false);
    }
  }, [lobbyId, submitPlacement]);

  const handleSubmitRef = useRef(handleSubmit);
  handleSubmitRef.current = handleSubmit;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(0, prev - 1));
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(maxPosition, prev + 1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        handleSubmitRef.current();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [maxPosition]);

  useEffect(() => {
    void _setPlacementPreview({
      lobbyId,
      proposedIndex: selectedIndex,
    });
  }, [lobbyId, selectedIndex, _setPlacementPreview]);

  if (!currentTrack) {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        <p className="mt-4 text-muted-foreground">{t("loadingTrack")}</p>
      </div>
    );
  }

  const getPositionLabel = (index: number): string => {
    if (index === 0 && maxPosition === 0) {
      return t("emptyTimeline");
    }
    if (index === 0) {
      const firstYear = sortedTimeline[0]?.year;
      return t("beforeYear", { year: firstYear });
    }
    if (index === maxPosition) {
      const lastYear = sortedTimeline[maxPosition - 1]?.year;
      return t("afterYear", { year: lastYear });
    }
    const yearBefore = sortedTimeline[index - 1]?.year;
    const yearAfter = sortedTimeline[index]?.year;
    return t("betweenYears", { year1: yearBefore, year2: yearAfter });
  };

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">{t("placeTheSong")}</h3>
      </div>

      <div className="space-y-2">
        {sortedTimeline.map((entry, idx) => (
          <div key={`${entry.trackId}-${entry.earnedAtRoundNumber}-${idx}`}>
            {idx === selectedIndex && (
              <TimelineCard
                icon="help"
                title="New Song"
                subtitle="Guess the year!"
                year={currentTrack.year}
                isNew={true}
                isPreview={true}
              />
            )}
            {revealedTrackMap.has(entry.trackId) ? (
              <TimelineCard
                icon="music"
                title={revealedTrackMap.get(entry.trackId)!.title}
                artist={revealedTrackMap.get(entry.trackId)!.artist}
                year={revealedTrackMap.get(entry.trackId)!.year}
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
        ))}
        {maxPosition === selectedIndex && (
          <TimelineCard
            icon="help"
            title="New Song"
            subtitle="Guess the year!"
            year={currentTrack.year}
            isNew={true}
            isPreview={true}
          />
        )}
      </div>

      <div className="flex items-center justify-between pt-4 border-t">
        <p className="text-sm text-foreground font-medium">{getPositionLabel(selectedIndex)}</p>
        <p className="text-xs text-muted-foreground mr-2">↑↓ to move, Enter to confirm</p>
      </div>

      <Button onClick={handleSubmit} disabled={isSubmitting} size="lg" className="w-full">
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {t("submitting")}
          </>
        ) : (
          <>
            <Check className="mr-2 h-4 w-4" />
            {t("confirmPlacement")}
          </>
        )}
      </Button>
    </div>
  );
}
