"use client";

import { Music } from "lucide-react";
import { useTranslations } from "next-intl";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { TimelinePlacer } from "./TimelinePlacer";
import { TurnPlayerTimeline } from "./TurnPlayerTimeline";

interface PlacingPhaseContentProps {
  isMyTurn: boolean;
  lobbyId?: Id<"lobbies">;
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
        currentTrack={track}
        existingPreviewIndex={existingPreviewIndex ?? null}
        lobbyId={lobbyId}
        player={me}
        revealedTracks={revealedTracks}
      />
    );
  }

  if (lobbyId && track && players && turnPlayerId) {
    const turnPlayer = players.find((p) => p._id === turnPlayerId);
    const turnPlayerName = turnPlayer?.displayName ?? "Player";
    return (
      <TurnPlayerTimeline
        existingPreviewIndex={existingPreviewIndex ?? null}
        revealedTracks={revealedTracks}
        timeline={turnPlayerTimeline}
        timelineSize={turnPlayerTimelineSize}
        turnPlayerName={turnPlayerName}
      />
    );
  }

  return (
    <div className="flex flex-col items-center justify-center space-y-4 py-12">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
        <Music className="h-8 w-8 animate-pulse text-primary" />
      </div>
      <div className="space-y-2 text-center">
        <p className="font-medium text-lg">
          {isMyTurn ? tPlacing("placeSong") : tPlacing("playerPlacing")}
        </p>
        <p className="text-muted-foreground text-sm">
          {isMyTurn ? tPlacing("dragDrop") : tPlacing("waitForPlayer")}
        </p>
      </div>
    </div>
  );
}
