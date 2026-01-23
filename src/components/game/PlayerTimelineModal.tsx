"use client";

import { useQuery } from "convex/react";
import { Music } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { api } from "@/convex/_generated/api.js";
import type { Doc } from "@/convex/_generated/dataModel";
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
  const isMounted = useIsMounted();

  const trackIds = player.timeline.map((entry) => entry.trackId);
  const tracks = useQuery(
    api.tracks.get,
    isMounted() && trackIds.length > 0 ? { trackIds } : "skip",
  );

  const trackMap = useMemo(() => {
    if (!(tracks && Array.isArray(tracks))) return new Map();
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
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>{t("title", { name: player.displayName })}</span>
            {player.isHost && (
              <span className="rounded bg-blue-100 px-2 py-0.5 text-[10px] text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                {t("hostBadge")}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="max-h-[60vh] space-y-4 overflow-y-auto">
          <div className="flex items-center justify-between text-muted-foreground text-sm">
            <span>{t("cardsCount", { count: player.timelineSize })}</span>
          </div>

          {sortedTimeline.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-muted/30 py-8">
              <Music className="mb-2 h-8 w-8 text-muted-foreground" />
              <p className="text-center text-muted-foreground text-sm">{t("noCards")}</p>
              <p className="mt-1 text-center text-muted-foreground text-xs">
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
                    artist={track.artist}
                    icon="music"
                    iconColor={isPlacement ? "primary" : "amber"}
                    key={`${entry.trackId}-${entry.earnedAtRoundNumber}`}
                    title={track.title}
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
