"use client";

import { Music } from "lucide-react";
import { useTranslations } from "next-intl";

import { BettingPanel } from "./betting-panel";
import { useGame } from "./game-context";

export function BettingPhaseContent(): React.ReactNode {
  const tBetting = useTranslations("betting");
  const { state } = useGame();
  const { lobby, me, players, currentRound, track, turnPlayer } = state;

  if (lobby && me && track && players) {
    return (
      <BettingPanel
        lobbyId={lobby._id}
        me={me}
        players={players}
        revealedTracks={state.revealedTracks}
        track={track}
        turnPlayerId={currentRound?.turnPlayerId ?? null}
        turnPlayerPlacementIndex={currentRound?.placement?.proposedIndex ?? null}
        turnPlayerTimeline={turnPlayer?.timeline ?? []}
      />
    );
  }

  return (
    <div className="flex flex-col items-center justify-center space-y-4 py-12">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-warning/15 dark:bg-warning/30">
        <Music className="h-8 w-8 text-warning dark:text-warning" />
      </div>
      <div className="space-y-2 text-center">
        <p className="font-medium text-lg">{tBetting("placeYourBet")}</p>
        <p className="text-muted-foreground text-sm">{tBetting("placeBetDescription")}</p>
      </div>
    </div>
  );
}
