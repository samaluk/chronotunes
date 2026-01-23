"use client";

import { useQuery } from "convex/react";
import type { GenericId } from "convex/values";
import { useSessionId, useSessionQuery } from "convex-helpers/react/sessions";
import { Disc, History } from "lucide-react";
import { useMemo, useState } from "react";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/convex/_generated/api.js";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { useMounted } from "@/lib/hooks/useMounted";
import { CurrentRoundPanel } from "./CurrentRoundPanel";
import { GameHeader } from "./GameHeader";
import { GameResults } from "./GameResults";
import { MyTimeline } from "./MyTimeline";
import { PlayersBar } from "./PlayersBar";
import { PlayerTimelineModal } from "./PlayerTimelineModal";

interface GameViewProps {
  lobbyId: GenericId<"lobbies">;
  code: string;
}

export function GameView({ lobbyId, code }: GameViewProps): React.ReactNode {
  const [sessionId] = useSessionId();
  const mounted = useMounted();
  const [selectedPlayerForTimeline, setSelectedPlayerForTimeline] = useState<Doc<"players"> | null>(
    null,
  );

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
    <div className="w-full space-y-4">
      {isGameFinished ? (
        <ErrorBoundary>
          <GameResults lobbyId={lobbyId} code={code} />
        </ErrorBoundary>
      ) : (
        <>
          <ErrorBoundary>
            {selectedPlayerForTimeline && (
              <PlayerTimelineModal
                player={selectedPlayerForTimeline}
                open={selectedPlayerForTimeline !== null}
                onOpenChange={(open) => !open && setSelectedPlayerForTimeline(null)}
              />
            )}

            <PlayersBar
              lobbyId={lobbyId}
              currentSessionId={sessionId ?? null}
              highlightPlayerId={currentRound?.turnPlayerId ?? null}
              onPlayerClick={(player) => setSelectedPlayerForTimeline(player)}
            />

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
              roundPhase={roundPhase}
              bettingStartedAt={roundPhase === "betting" ? currentRound?.startedAt : undefined}
              bettingWindowSeconds={
                roundPhase === "betting" ? lobby?.settings?.bettingWindowSeconds : undefined
              }
              resolution={roundPhase === "resolved" ? (currentRound?.resolution ?? null) : null}
            />
          </ErrorBoundary>

          <Tabs defaultValue="round" className="w-full">
            <TabsList
              variant="line"
              className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent gap-6"
            >
              <TabsTrigger
                value="round"
                className="data-[active]:border-primary data-[active]:text-foreground px-0 pb-2 text-muted-foreground hover:text-foreground"
              >
                <Disc className="mr-2 h-4 w-4" />
                Current Round
              </TabsTrigger>
              <TabsTrigger
                value="timeline"
                className="data-[active]:border-primary data-[active]:text-foreground px-0 pb-2 text-muted-foreground hover:text-foreground"
              >
                <History className="mr-2 h-4 w-4" />
                My Timeline
              </TabsTrigger>
            </TabsList>

            <TabsContent value="round" className="mt-4">
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
                  roundStartedAt={currentRound?.startedAt}
                  turnSeconds={lobby?.settings?.turnSeconds}
                  bettingWindowSeconds={lobby?.settings?.bettingWindowSeconds}
                  resolution={currentRound?.resolution ?? null}
                  turnPlayerPlacementIndex={
                    currentRound?.phase === "betting"
                      ? (currentRound?.placement?.proposedIndex ?? null)
                      : null
                  }
                  showLiveBets={lobby?.settings?.showLiveBets ?? false}
                />
              </ErrorBoundary>
            </TabsContent>

            <TabsContent value="timeline" className="mt-4">
              <ErrorBoundary>
                <MyTimeline player={me ?? null} />
              </ErrorBoundary>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
