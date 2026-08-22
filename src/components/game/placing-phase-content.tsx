"use client";

import { Music } from "lucide-react";
import { useTranslations } from "next-intl";

import { useGame } from "./game-context";
import { TimelinePlacer } from "./timeline-placer";
import { TurnPlayerTimeline } from "./turn-player-timeline";

export function PlacingPhaseContent(): React.ReactNode {
  const tPlacing = useTranslations("placing");
  const { state } = useGame();
  const { isMyTurn, lobby, me, players, currentRound, track, turnPlayer } = state;

  const existingPreviewIndex = currentRound?.placementPreview?.proposedIndex ?? null;
  const turnPlayerId = currentRound?.turnPlayerId ?? null;
  const turnPlayerTimeline = turnPlayer?.timeline ?? [];
  const turnPlayerTimelineSize = turnPlayer?.timelineSize ?? 0;

  if (isMyTurn && lobby && me && track) {
    return (
      <TimelinePlacer
        currentTrack={track}
        existingPreviewIndex={existingPreviewIndex}
        lobbyId={lobby._id}
        player={me}
        revealedTracks={state.revealedTracks}
      />
    );
  }

  if (lobby && track && players && turnPlayerId) {
    const turnPlayerData = players.find((p) => p._id === turnPlayerId);
    const turnPlayerName = turnPlayerData?.displayName ?? "Player";
    return (
      <TurnPlayerTimeline
        existingPreviewIndex={existingPreviewIndex}
        revealedTracks={state.revealedTracks}
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
