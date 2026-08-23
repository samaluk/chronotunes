"use client";

import { useSessionId, useSessionQuery } from "convex-helpers/react/sessions";
import { useQuery } from "convex/react";
import { useIsMounted } from "usehooks-ts";

import { ErrorBoundary } from "@/components/ui/error-boundary";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";

import { BettingPhaseContent } from "./betting-phase-content";
import { GameHeader } from "./game-header";
import { GameProvider } from "./game-provider";
import { useGame } from "./game-context";
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
            <div className="fade-in animate-in p-6">
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

  const handlePlayerClick = (player: Doc<"players">): void => {
    setSelectedPlayerForTimeline(player);
  };

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

export interface GameViewProps {
  code: string;
  lobbyId: Id<"lobbies">;
}

/** All session-guarded Convex queries for one mounted game view. */
function useGameQueries(code: string, lobbyId: Id<"lobbies">, mounted: boolean) {
  const haveCode = mounted && code.length > 0;
  const haveLobby = mounted && lobbyId !== undefined;

  const lobby = useQuery(api.lobbies.get, haveCode ? { code } : "skip");
  const players = useQuery(api.players.list, haveLobby ? { lobbyId } : "skip");
  const me = useSessionQuery(api.players.getMe, haveLobby ? { lobbyId } : "skip");
  const game = useQuery(api.games.getCurrent, haveLobby ? { lobbyId } : "skip");
  const currentRound = useSessionQuery(api.rounds.getCurrent, haveLobby ? { lobbyId } : "skip");

  const turnPlayer = players?.find((p) => p._id === currentRound?.turnPlayerId);
  const turnPlayerTrackIds: Id<"tracks">[] = turnPlayer?.timeline
    ? turnPlayer.timeline.map((t) => t.trackId)
    : [];

  const revealedTracks = useQuery(
    api.tracks.getPublicByIds,
    turnPlayerTrackIds.length > 0 ? { trackIds: turnPlayerTrackIds } : "skip",
  );

  return { currentRound, game, lobby, me, players, revealedTracks };
}

type ViewPhase = "loading" | "missing" | "ready";

const resolveViewPhase = (
  mounted: boolean,
  lobby: unknown,
  players: unknown,
  game: unknown,
  currentRound: unknown,
): ViewPhase => {
  if (!mounted) {
    return "loading";
  }
  const isPending =
    lobby === undefined ||
    players === undefined ||
    game === undefined ||
    currentRound === undefined;
  if (isPending) {
    return "loading";
  }
  const isMissing = !(lobby && currentRound && game);
  if (isMissing) {
    return "missing";
  }
  return "ready";
};

function useGameViewModel(code: string, lobbyId: Id<"lobbies">, mounted: boolean) {
  const [sessionId] = useSessionId();

  const queries = useGameQueries(code, lobbyId, mounted);
  const { currentRound, game, lobby, me, players, revealedTracks } = queries;

  const phase = resolveViewPhase(mounted, lobby, players, game, currentRound);
  if (phase !== "ready") {
    return { ...queries, phase } as const;
  }

  // Type narrowing the phase probe cannot express for the compiler.
  if (
    lobby === undefined ||
    players === undefined ||
    game === undefined ||
    currentRound === undefined
  ) {
    return { ...queries, phase: "loading" } as const;
  }

  return {
    currentRound,
    game,
    lobby,
    me: me ?? null,
    phase: "ready",
    players,
    revealedTracks: revealedTracks ?? [],
    sessionId: sessionId ?? null,
  };
}
function MissingGameNotice(): React.ReactNode {
  return (
    <div className="flex min-h-100 items-center justify-center">
      <div className="text-center">
        <p className="text-muted-foreground">No active game found</p>
      </div>
    </div>
  );
}

export function GameView({ lobbyId, code }: GameViewProps): React.ReactNode {
  const isMounted = useIsMounted();
  const mounted = isMounted();

  const view = useGameViewModel(code, lobbyId, mounted);

  if (view.phase !== "ready") {
    if (view.phase === "missing") {
      return <MissingGameNotice />;
    }
    return <LoadingSkeleton />;
  }

  return (
    <GameProvider
      code={code}
      currentRound={view.currentRound}
      game={view.game}
      lobby={view.lobby}
      lobbyId={lobbyId}
      me={view.me}
      players={view.players}
      revealedTracks={view.revealedTracks ?? []}
      sessionId={view.sessionId}
    >
      <GameContent />
    </GameProvider>
  );
}
