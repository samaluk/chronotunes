"use client";

import type { GenericId } from "convex/values";
import { Music } from "lucide-react";
import { useTranslations } from "next-intl";
import { BettingPanel } from "./BettingPanel";
import { RoundResults } from "./RoundResults";
import { TimelinePlacer } from "./TimelinePlacer";

export type RoundPhase = "placing" | "betting" | "resolved";

interface TimelineEntry {
  trackId: GenericId<"tracks">;
  year: number;
  earnedAtRoundNumber: number;
  earnedBy: "placement" | "bet";
}

interface Player {
  _id: GenericId<"players">;
  displayName: string;
  timeline: TimelineEntry[];
  timelineSize: number;
  coins: number;
  isHost: boolean;
  sessionId: string;
}

interface CurrentRoundPanelProps {
  phase: RoundPhase;
  isMyTurn: boolean;
  lobbyId?: GenericId<"lobbies">;
  me?: Player | null;
  players?: Player[] | null;
  track?: {
    _id: GenericId<"tracks">;
    title: string;
    artist: string;
    year: number;
  } | null;
  existingPreviewIndex?: number | null;
  turnPlayerTimeline?: TimelineEntry[];
  turnPlayerTimelineSize?: number;
  resolution?: {
    validIndexMin: number;
    validIndexMax: number;
    turnPlayerWasCorrect: boolean;
    awardedPlayerIds: GenericId<"players">[];
    coinDeltas: Array<{
      playerId: GenericId<"players">;
      delta: number;
    }>;
    resolvedAt: number;
  } | null;
}

export function CurrentRoundPanel({
  phase,
  isMyTurn,
  lobbyId,
  me,
  players,
  track,
  existingPreviewIndex,
  turnPlayerTimeline,
  turnPlayerTimelineSize,
  resolution,
}: CurrentRoundPanelProps): React.ReactNode {
  const t = useTranslations("roundPhase");
  const tPlacing = useTranslations("placing");
  const tBetting = useTranslations("betting");
  const tResults = useTranslations("results");

  const renderPhaseContent = (): React.ReactNode => {
    switch (phase) {
      case "placing":
        if (isMyTurn && lobbyId && me && track) {
          return (
            <TimelinePlacer
              lobbyId={lobbyId}
              player={me}
              currentTrack={track}
              existingPreviewIndex={existingPreviewIndex ?? null}
            />
          );
        }
        return (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Music className="h-8 w-8 text-primary animate-pulse" />
            </div>
            <div className="text-center space-y-2">
              <p className="text-lg font-medium">
                {isMyTurn ? tPlacing("placeSong") : tPlacing("playerPlacing")}
              </p>
              <p className="text-sm text-muted-foreground">
                {isMyTurn ? tPlacing("dragDrop") : tPlacing("waitForPlayer")}
              </p>
            </div>
          </div>
        );

      case "betting":
        if (lobbyId && me && track && !isMyTurn) {
          return (
            <BettingPanel
              lobbyId={lobbyId}
              me={me}
              track={track}
              turnPlayerTimeline={turnPlayerTimeline ?? []}
              turnPlayerTimelineSize={turnPlayerTimelineSize ?? 0}
            />
          );
        }
        return (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
              <Music className="h-8 w-8 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="text-center space-y-2">
              <p className="text-lg font-medium">{tBetting("placeYourBet")}</p>
              <p className="text-sm text-muted-foreground">{tBetting("placeBetDescription")}</p>
            </div>
          </div>
        );

      case "resolved":
        if (lobbyId && track && resolution && players) {
          const turnPlayer = players.find((p) => p._id === resolution.awardedPlayerIds[0]) ?? {
            _id: "" as GenericId<"players">,
            displayName: "Unknown",
            timeline: [],
            timelineSize: 0,
            coins: 0,
            isHost: false,
            sessionId: "",
          };
          const _turnPlayerTimelineEntry = turnPlayerTimeline ?? [];
          const _turnPlayerTimelineSizeValue = turnPlayerTimelineSize ?? 0;

          return (
            <RoundResults
              lobbyId={lobbyId}
              track={track}
              resolution={resolution}
              turnPlayer={turnPlayer}
              bets={[]}
              players={players}
              me={me ?? null}
            />
          );
        }
        return (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
              <Music className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <div className="text-center space-y-2">
              <p className="text-lg font-medium">{tResults("roundResults")}</p>
              <p className="text-sm text-muted-foreground">{tResults("songRevealed")}</p>
            </div>
            {track && (
              <div className="mt-4 p-4 rounded-lg bg-card border max-w-md w-full text-center">
                <p className="text-sm text-muted-foreground">{tResults("songWas")}</p>
                <p className="text-xl font-bold mt-1">
                  {track.title} - {track.artist} ({track.year})
                </p>
              </div>
            )}
          </div>
        );

      default:
        return (
          <div className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground">Waiting for round to start...</p>
          </div>
        );
    }
  };

  return (
    <div className="w-full">
      <div className="rounded-xl bg-card border overflow-hidden">
        <div className="px-4 py-3 border-b bg-muted/50">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{t("placingTitle")}</span>
            <span
              className={`
                inline-flex items-center px-2 py-1 rounded-full text-xs font-medium
                ${
                  phase === "placing"
                    ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                    : phase === "betting"
                      ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                      : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                }
              `}
            >
              {t(phase)}
            </span>
          </div>
        </div>
        <div className="p-6">{renderPhaseContent()}</div>
      </div>
    </div>
  );
}
