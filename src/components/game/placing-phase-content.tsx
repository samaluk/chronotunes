"use client";

import { Music } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { useGame } from "./game-context";
import type { GameContextValue } from "./game-context";
import { TimelinePlacer } from "./timeline-placer";
import { TurnPlayerTimeline } from "./turn-player-timeline";

/** When it is my turn, render the placement interface; otherwise nothing. */
function MyTurnPlacer({ state }: { state: GameContextValue["state"] }): ReactNode | null {
  const { isMyTurn, lobby, me, track, revealedTracks } = state;

  if (!(isMyTurn && lobby && me && track)) {
    return null;
  }

  return (
    <TimelinePlacer
      currentTrack={track}
      existingPreviewIndex={state.currentRound?.placementPreview?.proposedIndex ?? null}
      lobbyId={lobby._id}
      player={me}
      revealedTracks={revealedTracks}
    />
  );
}

/** While another player places their song, spectate their timeline. */
function TurnPlayerSpectator({ state }: { state: GameContextValue["state"] }): ReactNode | null {
  const { lobby, players, currentRound, track, turnPlayer, revealedTracks } = state;
  const turnPlayerId = currentRound?.turnPlayerId ?? null;

  if (!(lobby && track && players && turnPlayerId)) {
    return null;
  }

  const turnPlayerData = players.find((p) => p._id === turnPlayerId);
  const turnPlayerName = turnPlayerData?.displayName ?? "Player";

  return (
    <TurnPlayerTimeline
      existingPreviewIndex={currentRound?.placementPreview?.proposedIndex ?? null}
      revealedTracks={revealedTracks}
      timeline={turnPlayer?.timeline ?? []}
      timelineSize={turnPlayer?.timelineSize ?? 0}
      turnPlayerName={turnPlayerName}
    />
  );
}

function WaitingToPlace({ isMyTurn }: { isMyTurn: boolean }): ReactNode {
  const tPlacing = useTranslations("placing");

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

export function PlacingPhaseContent(): React.ReactNode {
  const { state } = useGame();
  const { isMyTurn } = state;

  return (
    <>
      <MyTurnPlacer state={state} />
      <TurnPlayerSpectator state={state} />
      <WaitingToPlace isMyTurn={isMyTurn} />
    </>
  );
}
