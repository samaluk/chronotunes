"use client";

import { useSessionMutation } from "convex-helpers/react/sessions";
import { Check, HelpCircle, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { YouTubePlayer } from "@/components/player/YouTubePlayer";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";

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

function YearCard({ year, isNew }: { year?: number; isNew?: boolean }): React.ReactNode {
  return (
    <div
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg border bg-card",
        isNew && "bg-primary/10 border-primary border-dashed animate-pulse",
      )}
    >
      <div
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
          isNew ? "bg-primary/20 text-primary" : "bg-muted",
        )}
      >
        {isNew ? (
          <HelpCircle className="h-5 w-5" />
        ) : (
          <span className="text-sm font-semibold text-primary">{year ?? "?"}</span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "font-medium truncate",
            isNew ? "text-foreground" : "text-muted-foreground",
          )}
        >
          {isNew ? "New Song" : "Known Track"}
        </p>
        <p className="text-sm text-muted-foreground truncate">
          {isNew ? "Guess the year!" : `From round`}
        </p>
      </div>
    </div>
  );
}

function KnownTrackCard({ track }: { track: RevealedTrack }): React.ReactNode {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border bg-card">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
        <span className="text-sm font-semibold text-muted-foreground">{track.year}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-foreground truncate">{track.title}</p>
        <p className="text-sm text-muted-foreground truncate">{track.artist}</p>
      </div>
    </div>
  );
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

  const sortedTimeline = [...player.timeline].sort((a, b) => a.year - b.year);
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
    if (index === 0) return t("firstPosition");
    if (index === maxPosition) return t("lastPosition");
    return t("afterYear", { year: sortedTimeline[index - 1]?.year });
  };

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">{t("placeTheSong")}</h3>
        <span className="text-xs text-muted-foreground">
          {t("timelineCards", { count: player.timelineSize })}
        </span>
      </div>

      {currentTrack.youtubeVideoId && (
        <div className="mb-4">
          <YouTubePlayer youtubeVideoId={currentTrack.youtubeVideoId} className="w-full max-w-md" />
        </div>
      )}

      <div className="space-y-2">
        {sortedTimeline.map((entry, idx) => (
          <div key={`${entry.trackId}-${entry.earnedAtRoundNumber}`}>
            {idx === selectedIndex && <YearCard year={currentTrack.year} isNew={true} />}
            {revealedTrackMap.has(entry.trackId) ? (
              <KnownTrackCard track={revealedTrackMap.get(entry.trackId)!} />
            ) : (
              <YearCard year={entry.year} />
            )}
          </div>
        ))}
        {maxPosition === selectedIndex && <YearCard year={currentTrack.year} isNew={true} />}
      </div>

      <div className="flex items-center justify-between pt-4 border-t">
        <p className="text-sm text-muted-foreground">
          {t("selectPosition")}{" "}
          <span className="font-medium text-foreground">{getPositionLabel(selectedIndex)}</span>
        </p>
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
