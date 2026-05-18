"use client"

import { useQuery } from "convex/react"
import { useSessionId, useSessionQuery } from "convex-helpers/react/sessions"
import { Disc, History } from "lucide-react"
import { useCallback, useMemo } from "react"
import { useIsMounted } from "usehooks-ts"
import { ErrorBoundary } from "@/components/ui/error-boundary"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { api } from "@/convex/_generated/api"
import type { Doc, Id } from "@/convex/_generated/dataModel"
import { BettingPhaseContent } from "./betting-phase-content"
import { GameHeader } from "./game-header"
import { GameProvider, useGame } from "./game-provider"
import { GameResults } from "./game-results"
import { MyTimeline } from "./my-timeline"
import { PlacingPhaseContent } from "./placing-phase-content"
import { PlayerTimelineModal } from "./player-timeline-modal"
import { PlayersBar } from "./players-bar"
import { ResolvedPhaseContent } from "./resolved-phase-content"

function LoadingSkeleton(): React.ReactNode {
  return (
    <div className="w-full space-y-6">
      <div className="h-16 animate-pulse rounded-lg bg-muted" />
      <div className="h-12 animate-pulse rounded-lg bg-muted" />
      <div className="h-64 animate-pulse rounded-lg bg-muted" />
    </div>
  )
}

function GameTabs(): React.ReactNode {
  const { state } = useGame()
  const { phase } = state

  const phaseBadgeClass = useMemo(() => {
    switch (phase) {
      case "placing":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
      case "betting":
        return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
      case "resolved":
        return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
      default:
        return "bg-muted text-muted-foreground"
    }
  }, [phase])

  return (
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
          <div className="w-full">
            <div className="overflow-hidden rounded-xl border bg-card">
              <div className="border-b bg-muted/50 px-4 py-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">Current Round</span>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-1 font-medium text-xs transition-all duration-300 ${phaseBadgeClass}`}
                  >
                    {phase}
                  </span>
                </div>
              </div>
              <div className="fade-in animate-in p-6 transition-all duration-300">
                <PhaseContent />
              </div>
            </div>
          </div>
        </ErrorBoundary>
      </TabsContent>

      <TabsContent className="mt-4" value="timeline">
        <ErrorBoundary>
          <MyTimeline />
        </ErrorBoundary>
      </TabsContent>
    </Tabs>
  )
}

function PhaseContent(): React.ReactNode {
  const { state } = useGame()
  const { phase } = state

  switch (phase) {
    case "placing":
      return <PlacingPhaseContent />
    case "betting":
      return <BettingPhaseContent />
    case "resolved":
      return <ResolvedPhaseContent />
    default:
      return (
        <div className="flex flex-col items-center justify-center py-12">
          <p className="text-muted-foreground">Waiting for round to start...</p>
        </div>
      )
  }
}

function ActiveGameView(): React.ReactNode {
  const { state, actions } = useGame()
  const { selectedPlayerForTimeline } = state
  const { handleModalClose } = actions

  return (
    <>
      <ErrorBoundary>
        {selectedPlayerForTimeline && (
          <PlayerTimelineModal
            onOpenChange={(open) => {
              if (!open) {
                handleModalClose()
              }
            }}
            open={selectedPlayerForTimeline !== null}
            player={selectedPlayerForTimeline}
          />
        )}
        <GamePlayersBar />
        <GameHeader />
      </ErrorBoundary>
      <GameTabs />
    </>
  )
}

function GamePlayersBar(): React.ReactNode {
  const { state, actions, meta } = useGame()
  const { currentRound } = state
  const { setSelectedPlayerForTimeline } = actions
  const { sessionId, lobbyId } = meta

  const handlePlayerClick = useCallback(
    (player: Doc<"players">) => {
      setSelectedPlayerForTimeline(player)
    },
    [setSelectedPlayerForTimeline],
  )

  return (
    <PlayersBar
      currentSessionId={sessionId}
      highlightPlayerId={currentRound?.turnPlayerId ?? null}
      lobbyId={lobbyId}
      onPlayerClick={handlePlayerClick}
    />
  )
}

function GameContent(): React.ReactNode {
  const { state, meta } = useGame()
  const { isGameFinished } = state
  const { code, lobbyId } = meta

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
  )
}

interface GameViewProps {
  code: string
  lobbyId: Id<"lobbies">
}

export function GameView({ lobbyId, code }: GameViewProps): React.ReactNode {
  const [sessionId] = useSessionId()
  const isMounted = useIsMounted()
  const mounted = isMounted()

  const lobby = useQuery(api.lobbies.get, mounted && code ? { code } : "skip")
  const players = useQuery(api.players.list, mounted && lobbyId ? { lobbyId } : "skip")
  const me = useSessionQuery(api.players.getMe, mounted && lobbyId ? { lobbyId } : "skip")
  const game = useQuery(api.games.getCurrent, mounted && lobbyId ? { lobbyId } : "skip")
  const currentRound = useSessionQuery(
    api.rounds.getCurrent,
    mounted && lobbyId ? { lobbyId } : "skip",
  )

  const turnPlayer = players?.find((p) => p._id === currentRound?.turnPlayerId)

  const turnPlayerTrackIds = useMemo((): Id<"tracks">[] => {
    if (!turnPlayer?.timeline) {
      return []
    }
    return turnPlayer.timeline.map((t) => t.trackId)
  }, [turnPlayer])

  const revealedTracks = useQuery(
    api.tracks.getPublicByIds,
    turnPlayerTrackIds.length > 0 ? { trackIds: turnPlayerTrackIds } : "skip",
  )

  if (!mounted) {
    return <LoadingSkeleton />
  }

  if (
    lobby === undefined ||
    players === undefined ||
    game === undefined ||
    currentRound === undefined
  ) {
    return <LoadingSkeleton />
  }

  if (!(lobby && currentRound)) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">No active game found</p>
        </div>
      </div>
    )
  }

  if (!game) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">No active game found</p>
        </div>
      </div>
    )
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
  )
}
