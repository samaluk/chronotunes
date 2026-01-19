"use client";

import type { GenericId } from "convex/values";
import { Music } from "lucide-react";
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
}

interface CurrentRoundPanelProps {
  phase: RoundPhase;
  isMyTurn: boolean;
  lobbyId?: GenericId<"lobbies">;
  me?: Player | null;
  track?: {
    _id: GenericId<"tracks">;
    title: string;
    artist: string;
    year: number;
  } | null;
  existingPreviewIndex?: number | null;
}

export function CurrentRoundPanel({
  phase,
  isMyTurn,
  lobbyId,
  me,
  track,
  existingPreviewIndex,
}: CurrentRoundPanelProps): React.ReactNode {
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
                {isMyTurn ? "Place the song on your timeline" : "Player is placing the song..."}
              </p>
              <p className="text-sm text-muted-foreground">
                {isMyTurn
                  ? "Drag and drop the song card to the correct position"
                  : "Wait for the player to finish placing"}
              </p>
            </div>
          </div>
        );

      case "betting":
        return (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
              <Music className="h-8 w-8 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="text-center space-y-2">
              <p className="text-lg font-medium">Place your bet!</p>
              <p className="text-sm text-muted-foreground">
                Where should the song go on the timeline?
              </p>
            </div>
          </div>
        );

      case "resolved":
        return (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
              <Music className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <div className="text-center space-y-2">
              <p className="text-lg font-medium">Round Results</p>
              <p className="text-sm text-muted-foreground">
                The song has been revealed and results are in!
              </p>
            </div>
            {track && (
              <div className="mt-4 p-4 rounded-lg bg-card border max-w-md w-full text-center">
                <p className="text-sm text-muted-foreground">The song was</p>
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
            <span className="text-sm font-medium">Current Round</span>
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
              {phase.charAt(0).toUpperCase() + phase.slice(1)}
            </span>
          </div>
        </div>
        <div className="p-6">{renderPhaseContent()}</div>
      </div>
    </div>
  );
}
