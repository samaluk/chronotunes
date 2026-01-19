"use client";

import { useQuery } from "convex/react";
import type { GenericId } from "convex/values";
import { useEffect, useState } from "react";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import {
  SkeletonGameHeader,
  SkeletonPlayersBar,
  SkeletonRoundPanel,
  SkeletonTimeline,
} from "@/components/ui/skeletons";
import { api } from "@/convex/_generated/api.js";
import { useSessionId } from "@/lib/hooks/use-session-id";
import { CurrentRoundPanel, type RoundPhase } from "./CurrentRoundPanel";
import { GameHeader } from "./GameHeader";
import { GameResults } from "./GameResults";
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
      <div className="w-full space-y-6">
        <SkeletonPlayersBar count={4} />
        <SkeletonGameHeader />
        <SkeletonRoundPanel />
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
      <div className="w-full space-y-6">
        <SkeletonPlayersBar count={players?.length || 4} />
        <SkeletonGameHeader />
        <SkeletonRoundPanel />
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

  const isGameFinished = game?.status === "finished";

  return (
    <div className="w-full space-y-6">
      {isGameFinished ? (
        <ErrorBoundary>
          <GameResults lobbyId={lobbyId} code={code} />
        </ErrorBoundary>
      ) : (
        <>
          <ErrorBoundary>
            <PlayersBar
              lobbyId={lobbyId}
              currentSessionId={sessionId}
              highlightPlayerId={currentRound?.turnPlayerId ?? null}
            />
          </ErrorBoundary>

          {me && me.timeline.length > 0 && (
            <div className="max-w-md">
              <ErrorBoundary>
                <MyTimeline player={me} />
              </ErrorBoundary>
            </div>
          )}

          <ErrorBoundary>
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
          </ErrorBoundary>

          <ErrorBoundary>
            <CurrentRoundPanel
              phase={roundPhase}
              isMyTurn={isMyTurn}
              lobbyId={lobbyId}
              me={me ?? null}
              players={players ?? null}
              track={trackInfo}
              existingPreviewIndex={currentRound?.placementPreview?.proposedIndex ?? null}
              turnPlayerTimeline={turnPlayer?.timeline ?? []}
              turnPlayerTimelineSize={turnPlayer?.timelineSize ?? 0}
              resolution={currentRound?.resolution ?? null}
            />
          </ErrorBoundary>
        </>
      )}
    </div>
  );
}
