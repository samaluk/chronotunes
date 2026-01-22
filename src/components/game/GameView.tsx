"use client";

import { useQuery } from "convex/react";
import type { GenericId } from "convex/values";
import { useSessionId, useSessionQuery } from "convex-helpers/react/sessions";
import { useEffect, useMemo, useState } from "react";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel";
import { CurrentRoundPanel } from "./CurrentRoundPanel";
import { GameHeader } from "./GameHeader";
import { GameResults } from "./GameResults";
import { MyTimeline } from "./MyTimeline";
import { PlayersBar } from "./PlayersBar";

interface GameViewProps {
  lobbyId: GenericId<"lobbies">;
  code: string;
}

export function GameView({ lobbyId, code }: GameViewProps): React.ReactNode {
  const [sessionId] = useSessionId();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const lobby = useQuery(api.lobbies.get, mounted && code ? { code } : "skip");
  const players = useQuery(api.players.list, mounted && lobbyId ? { lobbyId } : "skip");
  const me = useSessionQuery(api.players.getMe, mounted && lobbyId ? { lobbyId } : "skip");
  const game = useQuery(api.games.getCurrent, mounted && lobbyId ? { lobbyId } : "skip");
  const currentRound = useSessionQuery(
    api.rounds.getCurrent,
    mounted && lobbyId ? { lobbyId } : "skip",
  );

  const turnPlayer = players?.find((p) => p._id === currentRound?.turnPlayerId);

  const turnPlayerTrackIds = useMemo((): Id<"tracks">[] => {
    if (!turnPlayer?.timeline) return [];
    return turnPlayer.timeline.map((t) => t.trackId);
  }, [turnPlayer]);

  const revealedTracks = useQuery(
    api.tracks.getPublicByIds,
    turnPlayerTrackIds.length > 0 ? { trackIds: turnPlayerTrackIds } : "skip",
  );

  if (!mounted) {
    return (
      <div className="w-full space-y-6">
        <div className="h-16 bg-muted animate-pulse rounded-lg" />
        <div className="h-12 bg-muted animate-pulse rounded-lg" />
        <div className="h-64 bg-muted animate-pulse rounded-lg" />
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
        <div className="h-16 bg-muted animate-pulse rounded-lg" />
        <div className="h-12 bg-muted animate-pulse rounded-lg" />
        <div className="h-64 bg-muted animate-pulse rounded-lg" />
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
  const roundPhase = (currentRound?.phase ?? "placing") as "placing" | "betting" | "resolved";

  const trackInfo = ((): {
    _id: GenericId<"tracks">;
    title?: string;
    artist?: string;
    year?: number;
    youtubeVideoId?: string;
  } | null => {
    if (!currentRound?.track) return null;
    const track = currentRound.track;
    return {
      _id: track.trackId as GenericId<"tracks">,
      youtubeVideoId: "youtubeVideoId" in track ? track.youtubeVideoId : undefined,
      ...("title" in track
        ? {
            title: track.title,
            artist: track.artist,
            year: track.year,
          }
        : {}),
    };
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
              currentSessionId={sessionId ?? null}
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
              turnPlayerId={currentRound?.turnPlayerId ?? null}
              turnPlayerTimeline={turnPlayer?.timeline ?? []}
              turnPlayerTimelineSize={turnPlayer?.timelineSize ?? 0}
              revealedTracks={revealedTracks ?? []}
              resolution={currentRound?.resolution ?? null}
            />
          </ErrorBoundary>
        </>
      )}
    </div>
  );
}
