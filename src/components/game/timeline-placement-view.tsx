"use client";

import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import type { Id } from "@/convex/_generated/dataModel";
import { getRevealedTrackMap, sortTimelineByYear } from "@/lib/timeline";

import { PlacementSlot } from "./placement-slot";
import { TimelineCard } from "./timeline-card";

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

interface TimelinePlacementViewProps {
  badgeLabel?: string;
  isDisabled?: boolean;
  onSlotClick?: (index: number) => void;
  revealedTracks: RevealedTrack[];
  selectedIndex: number | null;
  timeline: TimelineEntry[];
}

export const getPlacementPositionLabel = (
  t: ReturnType<typeof useTranslations>,
  timeline: TimelineEntry[],
  index: number
): string => {
  if (index === 0 && timeline.length === 0) {
    return t("emptyTimeline");
  }
  if (index === 0) {
    const firstYear = timeline[0]?.year;
    return t("beforeYear", { year: firstYear });
  }
  if (index === timeline.length) {
    const lastYear = timeline.at(-1)?.year ?? 0;
    return t("afterYear", { year: lastYear });
  }
  const yearBefore = timeline[index - 1]?.year;
  const yearAfter = timeline[index]?.year;
  return t("betweenYears", { year1: yearBefore, year2: yearAfter });
};

export function TimelinePlacementView({
  timeline,
  revealedTracks,
  selectedIndex,
  badgeLabel,
  onSlotClick,
  isDisabled = false,
}: TimelinePlacementViewProps): ReactNode {
  const t = useTranslations("placing");
  const sortedTimeline = sortTimelineByYear(timeline);
  const revealedTrackMap = getRevealedTrackMap(revealedTracks);

  const renderSlot = (index: number): ReactNode => (
    <PlacementSlot
      badgeLabel={selectedIndex === index ? badgeLabel : undefined}
      index={index}
      isActive={selectedIndex === index}
      isDisabled={isDisabled}
      key={`slot-${index}`}
      label={getPlacementPositionLabel(t, sortedTimeline, index)}
      onClick={onSlotClick ?? (() => {})}
    />
  );

  return (
    <div className="space-y-2">
      {(() => {
        const elements: React.ReactNode[] = [];

        elements.push(renderSlot(0));

        sortedTimeline.forEach((entry, idx) => {
          const revealedTrack = revealedTrackMap.get(entry.trackId);
          elements.push(
            <div key={`${entry.trackId}-${entry.earnedAtRoundNumber}-${idx}`}>
              {revealedTrack ? (
                <TimelineCard
                  artist={revealedTrack.artist}
                  icon="music"
                  title={revealedTrack.title}
                  year={revealedTrack.year}
                />
              ) : (
                <TimelineCard
                  icon="music"
                  iconColor="primary"
                  subtitle="From round"
                  title="Known Track"
                  year={entry.year}
                />
              )}
            </div>
          );

          elements.push(renderSlot(idx + 1));
        });

        return elements;
      })()}
    </div>
  );
}
