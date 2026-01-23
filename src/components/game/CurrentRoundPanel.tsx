"use client";

import { useQuery } from "convex/react";
import { Music } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { YouTubePlayer } from "@/components/player/YouTubePlayer";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import { BettingPhaseContent } from "./BettingPhaseContent";
import { PlacingPhaseContent } from "./PlacingPhaseContent";
import { ResolvedPhaseContent } from "./ResolvedPhaseContent";

export type RoundPhase = "placing" | "betting" | "resolved";

interface TimelineEntry {
  trackId: Id<"tracks">;
  year: number;
  earnedAtRoundNumber: number;
  earnedBy: "placement" | "bet" | "initial";
}

interface CurrentRoundPanelProps {
  phase: RoundPhase;
  isMyTurn: boolean;
  lobbyId?: Id<"lobbies">;
  me?: Doc<"players"> | null;
  players?: Doc<"players">[] | null;
  track?: {
    _id: Id<"tracks">;
    title?: string;
    artist?: string;
    year?: number;
    youtubeVideoId?: string;
  } | null;
  existingPreviewIndex?: number | null;
  turnPlayerId?: Id<"players"> | null;
  turnPlayerTimeline?: TimelineEntry[];
  turnPlayerTimelineSize?: number;
  revealedTracks?: Array<{
    trackId: Id<"tracks">;
    title: string;
    artist: string;
    year: number;
    youtubeVideoId?: string;
  }>;
  roundStartedAt?: number;
  turnSeconds?: number;
  bettingWindowSeconds?: number;
  resolution?: {
    validIndexMin: number;
    validIndexMax: number;
    turnPlayerWasCorrect: boolean;
    awardedPlayerIds: Id<"players">[];
    coinDeltas: Array<{
      playerId: Id<"players">;
      delta: number;
    }>;
    resolvedAt: number;
  } | null;
  turnPlayerPlacementIndex?: number | null;
  showLiveBets?: boolean;
}

export function CurrentRoundPanel({
  phase,
  isMyTurn,
  lobbyId,
  me,
  players,
  track,
  existingPreviewIndex,
  turnPlayerId,
  turnPlayerTimeline,
  turnPlayerTimelineSize,
  revealedTracks,
  roundStartedAt,
  turnSeconds,
  bettingWindowSeconds,
  resolution,
  turnPlayerPlacementIndex,
  showLiveBets,
}: CurrentRoundPanelProps): React.ReactNode {
  const t = useTranslations("roundPhase");

  const renderPhaseContent = (): React.ReactNode => {
    return (
      <>
        {track?.youtubeVideoId && (
          <div className="w-full max-w-xs">
            <YouTubePlayer youtubeVideoId={track.youtubeVideoId} />
          </div>
        )}
        {(() => {
          switch (phase) {
            case "placing":
              return (
                <PlacingPhaseContent
                  isMyTurn={isMyTurn}
                  lobbyId={lobbyId ?? undefined}
                  me={me ?? null}
                  players={players ?? null}
                  track={track ?? null}
                  existingPreviewIndex={existingPreviewIndex ?? null}
                  turnPlayerId={turnPlayerId ?? null}
                  turnPlayerTimeline={turnPlayerTimeline ?? []}
                  turnPlayerTimelineSize={turnPlayerTimelineSize ?? 0}
                  revealedTracks={revealedTracks ?? []}
                />
              );

            case "betting":
              return (
                <BettingPhaseContent
                  lobbyId={lobbyId!}
                  me={me!}
                  track={track!}
                  turnPlayerTimeline={turnPlayerTimeline ?? []}
                  revealedTracks={revealedTracks ?? []}
                  players={players ?? null}
                  turnPlayerId={turnPlayerId ?? null}
                  roundStartedAt={roundStartedAt}
                  turnSeconds={turnSeconds}
                  bettingWindowSeconds={bettingWindowSeconds}
                  turnPlayerPlacementIndex={turnPlayerPlacementIndex ?? null}
                  showLiveBets={showLiveBets ?? false}
                />
              );

            case "resolved":
              return (
                <ResolvedPhaseContent
                  lobbyId={lobbyId!}
                  track={track!}
                  resolution={resolution!}
                  players={players!}
                  turnPlayerId={turnPlayerId!}
                  me={me!}
                />
              );

            default:
              return (
                <div className="flex flex-col items-center justify-center py-12">
                  <p className="text-muted-foreground">Waiting for round to start...</p>
                </div>
              );
          }
        })()}
      </>
    );
  };

  return (
    <div className="w-full">
      <div className="rounded-xl bg-card border overflow-hidden">
        <div className="px-4 py-3 border-b bg-muted/50">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{t("placingTitle")}</span>
            <span
              className={cn(
                "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium transition-all duration-300",
                phase === "placing"
                  ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                  : phase === "betting"
                    ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                    : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
              )}
            >
              {t(phase)}
            </span>
          </div>
        </div>
        <div className="p-6 transition-all duration-300 animate-in fade-in">
          {renderPhaseContent()}
        </div>
      </div>
    </div>
  );
}
