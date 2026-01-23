"use client";

import { useQuery } from "convex/react";
import type { GenericId } from "convex/values";
import { useSessionId, useSessionQuery } from "convex-helpers/react/sessions";
import { Disc, History } from "lucide-react";
import { useMemo, useState } from "react";
import { useIsMounted } from "usehooks-ts";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
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
  const isMounted = useIsMounted();
  const [selectedPlayerForTimeline, setSelectedPlayerForTimeline] = useState<Doc<"players"> | null>(
    null,
  );

  const lobby = useQuery(api.lobbies.get, isMounted() && code ? { code } : "skip");
  const players = useQuery(api.players.list, isMounted() && lobbyId ? { lobbyId } : "skip");
  const me = useSessionQuery(api.players.getMe, isMounted() && lobbyId ? { lobbyId } : "skip");
  const game = useQuery(api.games.getCurrent, isMounted() && lobbyId ? { lobbyId } : "skip");
  const currentRound = useSessionQuery(
    api.rounds.getCurrent,
    isMounted() && lobbyId ? { lobbyId } : "skip",
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

  if (!isMounted()) {
    return (
      <div className="w-full space-y-6">
        <div className="h-16 animate-pulse rounded-lg bg-muted" />
        <div className="h-12 animate-pulse rounded-lg bg-muted" />
        <div className="h-64 animate-pulse rounded-lg bg-muted" />
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
        <div className="h-16 animate-pulse rounded-lg bg-muted" />
        <div className="h-12 animate-pulse rounded-lg bg-muted" />
        <div className="h-64 animate-pulse rounded-lg bg-muted" />
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
          <GameResults code={code} lobbyId={lobbyId} />
        </ErrorBoundary>
      ) : (
        <>
          <ErrorBoundary>
            {selectedPlayerForTimeline && (
              <PlayerTimelineModal
                onOpenChange={(open) => !open && setSelectedPlayerForTimeline(null)}
                open={selectedPlayerForTimeline !== null}
                player={selectedPlayerForTimeline}
              />
            )}

            <PlayersBar
              currentSessionId={sessionId ?? null}
              highlightPlayerId={currentRound?.turnPlayerId ?? null}
              lobbyId={lobbyId}
              onPlayerClick={(player) => setSelectedPlayerForTimeline(player)}
            />

            <GameHeader
              bettingStartedAt={roundPhase === "betting" ? currentRound?.startedAt : undefined}
              bettingWindowSeconds={
                roundPhase === "betting" ? lobby?.settings?.bettingWindowSeconds : undefined
              }
              isMyTurn={isMyTurn}
              resolution={roundPhase === "resolved" ? (currentRound?.resolution ?? null) : null}
              roundNumber={game.currentRoundNumber ?? 1}
              roundPhase={roundPhase}
              turnPlayer={
                turnPlayer
                  ? {
                      _id: turnPlayer._id,
                      displayName: turnPlayer.displayName,
                    }
                  : null
              }
            />
          </ErrorBoundary>

          <Tabs className="w-full" defaultValue="round">
            <TabsList
              className="h-auto w-full justify-start gap-6 rounded-none border-b bg-transparent p-0"
              variant="line"
            >
              <TabsTrigger
                className="px-0 pb-2 text-muted-foreground hover:text-foreground data-[active]:border-primary data-[active]:text-foreground"
                value="round"
              >
                <Disc className="mr-2 h-4 w-4" />
                Current Round
              </TabsTrigger>
              <TabsTrigger
                className="px-0 pb-2 text-muted-foreground hover:text-foreground data-[active]:border-primary data-[active]:text-foreground"
                value="timeline"
              >
                <History className="mr-2 h-4 w-4" />
                My Timeline
              </TabsTrigger>
            </TabsList>

            <TabsContent className="mt-4" value="round">
              <ErrorBoundary>
                <CurrentRoundPanel
                  bettingWindowSeconds={lobby?.settings?.bettingWindowSeconds}
                  existingPreviewIndex={currentRound?.placementPreview?.proposedIndex ?? null}
                  isMyTurn={isMyTurn}
                  lobbyId={lobbyId}
                  me={me ?? null}
                  phase={roundPhase}
                  players={players ?? null}
                  resolution={currentRound?.resolution ?? null}
                  revealedTracks={revealedTracks ?? []}
                  roundStartedAt={currentRound?.startedAt}
                  showLiveBets={lobby?.settings?.showLiveBets ?? false}
                  track={trackInfo}
                  turnPlayerId={currentRound?.turnPlayerId ?? null}
                  turnPlayerPlacementIndex={
                    currentRound?.phase === "betting"
                      ? (currentRound?.placement?.proposedIndex ?? null)
                      : null
                  }
                  turnPlayerTimeline={turnPlayer?.timeline ?? []}
                  turnPlayerTimelineSize={turnPlayer?.timelineSize ?? 0}
                  turnSeconds={lobby?.settings?.turnSeconds}
                />
              </ErrorBoundary>
            </TabsContent>

            <TabsContent className="mt-4" value="timeline">
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
