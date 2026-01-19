"use client";

import { useQuery } from "convex/react";
import type { GenericId } from "convex/values";
import { useEffect, useState } from "react";
import { api } from "@/convex/_generated/api.js";
import { useSessionId } from "@/lib/hooks/use-session-id";
import { CurrentRoundPanel, type RoundPhase } from "./CurrentRoundPanel";
import { GameHeader } from "./GameHeader";
import { MyTimeline } from "./MyTimeline";
import { PlayersBar } from "./PlayersBar";

interface GameViewProps {
  lobbyId: GenericId<"lobbies">;
  code: string;
}

interface Player {
  _id: GenericId<"players">;
  displayName: string;
  isHost: boolean;
  coins: number;
  timelineSize: number;
  sessionId: string;
  timeline: Array<{
    trackId: GenericId<"tracks">;
    year: number;
    earnedAtRoundNumber: number;
    earnedBy: "placement" | "bet";
  }>;
}

export function GameView({ lobbyId, code }: GameViewProps): React.ReactNode {
  const sessionId = useSessionId();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const lobby = useQuery(api.lobbies.get, mounted && code ? { code } : "skip");
  const players = useQuery(api.players.list, mounted && lobbyId ? { lobbyId } : "skip");
  const me = useQuery(
    api.players.getMe,
    mounted && lobbyId && sessionId ? { lobbyId, sessionId } : "skip",
  );
  const game = useQuery(api.games.getCurrent, mounted && lobbyId ? { lobbyId } : "skip");
  const currentRound = useQuery(
    api.rounds.getCurrent,
    mounted && lobbyId && sessionId ? { lobbyId, sessionId } : "skip",
  );

  if (!mounted) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading game...</p>
        </div>
      </div>
    );
  }

  if (
    lobby === undefined ||
    players === undefined ||
    game === undefined ||
    currentRound === undefined
  ) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading game state...</p>
        </div>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">No active game found</p>
        </div>
      </div>
    );
  }

  const isMyTurn = currentRound?.turnPlayerId === me?._id;
  const turnPlayer = players?.find((p: Player) => p._id === currentRound?.turnPlayerId);
  const roundPhase = (currentRound?.phase ?? "placing") as RoundPhase;

  const trackInfo = ((): {
    _id: GenericId<"tracks">;
    title: string;
    artist: string;
    year: number;
  } | null => {
    if (!currentRound?.track) return null;
    const track = currentRound.track;
    if ("title" in track) {
      return {
        _id: track.trackId as GenericId<"tracks">,
        title: track.title,
        artist: track.artist,
        year: track.year,
      };
    }
    return null;
  })();

  return (
    <div className="w-full space-y-6">
      <PlayersBar
        lobbyId={lobbyId}
        currentSessionId={sessionId}
        highlightPlayerId={currentRound?.turnPlayerId ?? null}
      />

      {me && me.timeline.length > 0 && (
        <div className="max-w-md">
          <MyTimeline player={me} />
        </div>
      )}

      <GameHeader
        roundNumber={game.currentRoundNumber ?? 1}
        turnPlayer={
          turnPlayer
            ? {
                _id: turnPlayer._id,
                displayName: turnPlayer.displayName,
              }
            : null
        }
        isMyTurn={isMyTurn}
        turnSeconds={lobby?.settings?.turnSeconds}
        startedAt={currentRound?.startedAt}
      />

      <CurrentRoundPanel
        phase={roundPhase}
        isMyTurn={isMyTurn}
        lobbyId={lobbyId}
        me={me}
        track={trackInfo}
        existingPreviewIndex={currentRound?.placementPreview?.proposedIndex ?? null}
      />
    </div>
  );
}
