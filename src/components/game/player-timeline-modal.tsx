"use client";

import { useQuery } from "convex/react";
import { Music } from "lucide-react";
import { useTranslations } from "next-intl";
import { useIsMounted } from "usehooks-ts";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { buildTrackMap, sortTimelineByYear } from "@/lib/timeline";

import { TimelineCard } from "./timeline-card";

export interface PlayerTimelineModalProps {
  onOpenChange: (open: boolean) => void;
  open: boolean;
  player: Doc<"players">;
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

  const trackMap = buildTrackMap(tracks);
  const sortedTimeline = sortTimelineByYear(player.timeline);

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>{t("title", { name: player.displayName })}</span>
            {player.isHost && (
              <span className="rounded bg-blue-100 px-2 py-0.5 text-2xs text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                {t("hostBadge")}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* Viewport-relative cap so long card lists scroll inside short screens. */}
        <div className="dialog-body-scroll space-y-4 overflow-y-auto">
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
                // oxlint-disable-next-line typescript/no-unsafe-assignment
                const track = trackMap.get(entry.trackId);
                if (!track) {
                  return null;
                }

                const isPlacement = entry.earnedBy === "placement";

                return (
                  <TimelineCard
                    artist={
                      track.artist /* oxlint-disable-line typescript/no-unsafe-assignment, typescript/no-unsafe-member-access */
                    }
                    icon="music"
                    iconColor={isPlacement ? "primary" : "amber"}
                    key={`${entry.trackId}-${entry.earnedAtRoundNumber}`}
                    title={
                      track.title /* oxlint-disable-line typescript/no-unsafe-assignment, typescript/no-unsafe-member-access */
                    }
                    year={
                      track.year /* oxlint-disable-line typescript/no-unsafe-assignment, typescript/no-unsafe-member-access */
                    }
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
