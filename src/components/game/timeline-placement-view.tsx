"use client";

import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import type { Id } from "@/convex/_generated/dataModel";
import { getRevealedTrackMap, sortTimelineByYear } from "@/lib/timeline";

import { getPlacementPositionLabel } from "./placement-position-label";
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
      // The array index is the semantic identity here: each index IS a
      // timeline slot position, stable across renders.
      // react-doctor-disable-next-line react-doctor/no-array-index-as-key
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

        sortedTimeline.forEach((entry, slotOffset) => {
          const revealedTrack = revealedTrackMap.get(entry.trackId);
          elements.push(
            <div key={`${entry.trackId}-${entry.earnedAtRoundNumber}`}>
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
            </div>,
          );

          elements.push(renderSlot(slotOffset + 1));
        });

        return elements;
      })()}
    </div>
  );
}
