"use client";

import { useTranslations } from "next-intl";

import type { Id } from "@/convex/_generated/dataModel";

import { TimelinePlacementView } from "./timeline-placement-view";

interface TimelineEntry {
  earnedAtRoundNumber: number;
  earnedBy: "placement" | "bet" | "initial";
  trackId: Id<"tracks">;
  year: number;
}

interface RevealedTrack {
  artist: string;
  title: string;
  trackId: Id<"tracks">;
  year: number;
  youtubeVideoId?: string;
}

interface TurnPlayerTimelineProps {
  existingPreviewIndex: number | null;
  revealedTracks: RevealedTrack[];
  timeline: TimelineEntry[];
  timelineSize: number;
  turnPlayerName: string;
}

export function TurnPlayerTimeline({
  turnPlayerName,
  timeline,
  revealedTracks,
  existingPreviewIndex,
}: TurnPlayerTimelineProps): React.ReactNode {
  const t = useTranslations("placing");
  const badgeLabel = t("yourPickWithName", { name: turnPlayerName });

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-muted-foreground text-sm">
          {turnPlayerName}&apos;s Timeline
        </h3>
      </div>

      <TimelinePlacementView
        badgeLabel={badgeLabel}
        isDisabled={true}
        revealedTracks={revealedTracks}
        selectedIndex={existingPreviewIndex}
        timeline={timeline}
      />
    </div>
  );
}
