"use client";

import { useSessionMutation } from "convex-helpers/react/sessions";
import { Check, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { sortTimelineByYear } from "@/lib/timeline";

import {
  getPlacementPositionLabel,
  TimelinePlacementView,
} from "./timeline-placement-view";

interface TrackInfo {
  _id: Id<"tracks">;
  artist?: string;
  title?: string;
  year?: number;
  youtubeVideoId?: string;
}

interface RevealedTrack {
  artist: string;
  title: string;
  trackId: Id<"tracks">;
  year: number;
  youtubeVideoId?: string;
}

interface TimelinePlacerProps {
  currentTrack: TrackInfo | null;
  existingPreviewIndex: number | null;
  lobbyId: Id<"lobbies">;
  player: Doc<"players">;
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

  const [selectedIndex, setSelectedIndex] = useState<number>(
    existingPreviewIndex ?? 0
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const setPlacementPreview = useSessionMutation(
    api.rounds.setPlacementPreview
  );
  const submitPlacement = useSessionMutation(api.rounds.submitPlacement);

  const sortedTimeline = sortTimelineByYear(player.timeline);
  const maxPosition = sortedTimeline.length;

  const moveSelection = useCallback(
    (direction: "up" | "down") => {
      setSelectedIndex((prev) => {
        if (direction === "up") {
          return Math.max(0, prev - 1);
        }
        return Math.min(maxPosition, prev + 1);
      });
    },
    [maxPosition]
  );

  const handleSlotClick = useCallback((index: number) => {
    setSelectedIndex(index);
  }, []);

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
    if (existingPreviewIndex !== null) {
      setSelectedIndex(existingPreviewIndex);
    }
  }, [existingPreviewIndex]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "ArrowUp") {
        event.preventDefault();
        moveSelection("up");
        return;
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();
        moveSelection("down");
        return;
      }

      if (event.key === "Enter") {
        event.preventDefault();
        handleSubmitRef.current();
      }
    },
    [moveSelection]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    const updatePreview = async () => {
      await setPlacementPreview({
        lobbyId,
        proposedIndex: selectedIndex,
      });
    };

    updatePreview().catch((error) => {
      console.error("Failed to update placement preview:", error);
    });
  }, [lobbyId, selectedIndex, setPlacementPreview]);

  if (!currentTrack) {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <div className="h-8 w-8 animate-spin rounded-full border-primary border-b-2" />
        <p className="mt-4 text-muted-foreground">{t("loadingTrack")}</p>
      </div>
    );
  }

  const getPositionLabel = (index: number): string =>
    getPlacementPositionLabel(t, sortedTimeline, index);

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-muted-foreground text-sm">
          {t("placeTheSong")}
        </h3>
      </div>

      <TimelinePlacementView
        badgeLabel={t("yourPickWithName", { name: player.displayName })}
        isDisabled={isSubmitting}
        onSlotClick={handleSlotClick}
        revealedTracks={revealedTracks}
        selectedIndex={selectedIndex}
        timeline={player.timeline}
      />

      <div className="flex items-center justify-between border-t pt-4">
        <p className="font-medium text-foreground text-sm">
          {getPositionLabel(selectedIndex)}
        </p>
        <div className="text-right">
          <p className="hidden text-muted-foreground text-xs sm:block">
            {t("useArrowsToMove")}
          </p>
          <p className="hidden text-muted-foreground text-xs sm:block">
            {t("pressEnterToConfirm")}
          </p>
          <p className="text-muted-foreground text-xs sm:hidden">
            {t("tapButtonsToMove")}
          </p>
          <p className="text-muted-foreground text-xs sm:hidden">
            {t("tapConfirmToPlace")}
          </p>
        </div>
      </div>

      <Button
        className="w-full"
        disabled={isSubmitting}
        onClick={handleSubmit}
        size="lg"
      >
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
