"use client";

import { Music } from "lucide-react";
import { useTranslations } from "next-intl";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { TimelinePlacer } from "./TimelinePlacer";
import { TurnPlayerTimeline } from "./TurnPlayerTimeline";

interface PlacingPhaseContentProps {
  isMyTurn: boolean;
  lobbyId: Id<"lobbies">;
  me: Doc<"players"> | null;
  players: Doc<"players">[] | null;
  track: {
    _id: Id<"tracks">;
    title?: string;
    artist?: string;
    year?: number;
    youtubeVideoId?: string;
  } | null;
  existingPreviewIndex: number | null;
  turnPlayerId: Id<"players"> | null;
  turnPlayerTimeline: Array<{
    trackId: Id<"tracks">;
    year: number;
    earnedAtRoundNumber: number;
    earnedBy: "placement" | "bet" | "initial";
  }>;
  turnPlayerTimelineSize: number;
  revealedTracks: Array<{
    trackId: Id<"tracks">;
    title: string;
    artist: string;
    year: number;
    youtubeVideoId?: string;
  }>;
}

export function PlacingPhaseContent({
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
}: PlacingPhaseContentProps): React.ReactNode {
  const tPlacing = useTranslations("placing");

  if (isMyTurn && lobbyId && me && track) {
    return (
      <TimelinePlacer
        lobbyId={lobbyId}
        player={me}
        currentTrack={track}
        existingPreviewIndex={existingPreviewIndex ?? null}
        revealedTracks={revealedTracks}
      />
    );
  }

  if (lobbyId && track && players && turnPlayerId) {
    const turnPlayer = players.find((p) => p._id === turnPlayerId);
    const turnPlayerName = turnPlayer?.displayName ?? "Player";
    return (
      <TurnPlayerTimeline
        turnPlayerName={turnPlayerName}
        timeline={turnPlayerTimeline}
        timelineSize={turnPlayerTimelineSize}
        revealedTracks={revealedTracks}
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
}
