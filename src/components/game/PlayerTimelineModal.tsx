"use client";

import { useQuery } from "convex/react";
import type { GenericId } from "convex/values";
import { Music } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { api } from "@/convex/_generated/api.js";
import type { Doc } from "@/convex/_generated/dataModel";
import { useMounted } from "@/lib/hooks/useMounted";
import { sortTimelineByYear } from "@/lib/timeline";
import { TimelineCard } from "./TimelineCard";

interface PlayerTimelineModalProps {
  player: Doc<"players">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PlayerTimelineModal({
  player,
  open,
  onOpenChange,
}: PlayerTimelineModalProps): React.ReactNode {
  const t = useTranslations("playerTimeline");
  const mounted = useMounted();

  const trackIds = player.timeline.map((entry) => entry.trackId);
  const tracks = useQuery(api.tracks.get, mounted && trackIds.length > 0 ? { trackIds } : "skip");

  const trackMap = useMemo(() => {
    if (!tracks || !Array.isArray(tracks)) return new Map();
    return new Map(
      tracks
        .filter((track): track is NonNullable<typeof track> => track != null)
        .map((track) => [
          track._id,
          { title: track.title, artist: track.artist, year: track.year },
        ]),
    );
  }, [tracks]);
  const sortedTimeline = sortTimelineByYear(player.timeline);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>{t("title", { name: player.displayName })}</span>
            {player.isHost && (
              <span className="text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 px-2 py-0.5 rounded">
                {t("hostBadge")}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>{t("cardsCount", { count: player.timelineSize })}</span>
          </div>

          {sortedTimeline.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 rounded-lg border border-dashed bg-muted/30">
              <Music className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground text-center">{t("noCards")}</p>
              <p className="text-xs text-muted-foreground text-center mt-1">
                {t("noCardsDescription")}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {sortedTimeline.map((entry) => {
                const track = trackMap.get(entry.trackId);
                if (!track) return null;

                const isPlacement = entry.earnedBy === "placement";

                return (
                  <TimelineCard
                    key={`${entry.trackId}-${entry.earnedAtRoundNumber}`}
                    icon="music"
                    iconColor={isPlacement ? "primary" : "amber"}
                    title={track.title}
                    artist={track.artist}
                    year={track.year}
                  />
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
