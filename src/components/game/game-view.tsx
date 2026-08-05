"use client";

import { useSessionId, useSessionQuery } from "convex-helpers/react/sessions";
import { useQuery } from "convex/react";
import { useCallback, useMemo } from "react";
import { useIsMounted } from "usehooks-ts";

import { ErrorBoundary } from "@/components/ui/error-boundary";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";

import { BettingPhaseContent } from "./betting-phase-content";
import { GameHeader } from "./game-header";
import { GameProvider, useGame } from "./game-provider";
import { GameResults } from "./game-results";
import { PlacingPhaseContent } from "./placing-phase-content";
import { PlayerTimelineModal } from "./player-timeline-modal";
import { PlayersBar } from "./players-bar";
import { ResolvedPhaseContent } from "./resolved-phase-content";

function LoadingSkeleton(): React.ReactNode {
  return (
    <div className="w-full space-y-6">
      <div className="h-16 animate-pulse rounded-lg bg-muted" />
      <div className="h-12 animate-pulse rounded-lg bg-muted" />
      <div className="h-64 animate-pulse rounded-lg bg-muted" />
    </div>
  );
}

function PhaseContent(): React.ReactNode {
  const { state } = useGame();
  const { phase } = state;

  switch (phase) {
    case "placing": {
      return <PlacingPhaseContent />;
    }
    case "betting": {
      return <BettingPhaseContent />;
    }
    case "resolved": {
      return <ResolvedPhaseContent />;
    }
    default: {
      return (
        <div className="flex flex-col items-center justify-center py-12">
          <p className="text-muted-foreground">Waiting for round to start...</p>
        </div>
      );
    }
  }
}

function ActiveGameView(): React.ReactNode {
  const { state, actions } = useGame();
  const { selectedPlayerForTimeline } = state;
  const { handleModalClose } = actions;

  return (
    <>
      <ErrorBoundary>
        {selectedPlayerForTimeline && (
          <PlayerTimelineModal
            onOpenChange={(open) => {
              if (!open) {
                handleModalClose();
              }
            }}
            open={selectedPlayerForTimeline !== null}
            player={selectedPlayerForTimeline}
          />
        )}
        <GamePlayersBar />
        <GameHeader />
      </ErrorBoundary>
      <ErrorBoundary>
        <div className="w-full">
          <div className="overflow-hidden rounded-xl border bg-card">
            <div className="fade-in animate-in p-6 transition-all duration-300">
              <PhaseContent />
            </div>
          </div>
        </div>
      </ErrorBoundary>
    </>
  );
}

function GamePlayersBar(): React.ReactNode {
  const { state, actions, meta } = useGame();
  const { currentRound } = state;
  const { setSelectedPlayerForTimeline } = actions;
  const { sessionId, lobbyId } = meta;

  const handlePlayerClick = useCallback(
    (player: Doc<"players">) => {
      setSelectedPlayerForTimeline(player);
    },
    [setSelectedPlayerForTimeline],
  );

  return (
    <PlayersBar
      currentSessionId={sessionId}
      highlightPlayerId={currentRound?.turnPlayerId ?? null}
      lobbyId={lobbyId}
      onPlayerClick={handlePlayerClick}
    />
  );
}

function GameContent(): React.ReactNode {
  const { state, meta } = useGame();
  const { isGameFinished } = state;
  const { code, lobbyId } = meta;

  return (
    <div className="w-full space-y-4">
      {isGameFinished ? (
        <ErrorBoundary>
          <GameResults code={code} lobbyId={lobbyId} />
        </ErrorBoundary>
      ) : (
        <ActiveGameView />
      )}
    </div>
  );
}

interface GameViewProps {
  code: string;
  lobbyId: Id<"lobbies">;
}

export function GameView({ lobbyId, code }: GameViewProps): React.ReactNode {
  const [sessionId] = useSessionId();
  const isMounted = useIsMounted();
  const mounted = isMounted();

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
    if (!turnPlayer?.timeline) {
      return [];
    }
    return turnPlayer.timeline.map((t) => t.trackId);
  }, [turnPlayer]);

  const revealedTracks = useQuery(
    api.tracks.getPublicByIds,
    turnPlayerTrackIds.length > 0 ? { trackIds: turnPlayerTrackIds } : "skip",
  );

  if (!mounted) {
    return <LoadingSkeleton />;
  }

  if (
    lobby === undefined ||
    players === undefined ||
    game === undefined ||
    currentRound === undefined
  ) {
    return <LoadingSkeleton />;
  }

  if (!(lobby && currentRound)) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">No active game found</p>
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

  return (
    <GameProvider
      code={code}
      currentRound={currentRound}
      game={game}
      lobby={lobby}
      lobbyId={lobbyId}
      me={me ?? null}
      players={players}
      revealedTracks={revealedTracks ?? []}
      sessionId={sessionId ?? null}
    >
      <GameContent />
    </GameProvider>
  );
}
