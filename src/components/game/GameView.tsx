"use client"

import { useQuery } from "convex/react"
import { useSessionId, useSessionQuery } from "convex-helpers/react/sessions"
import { Disc, History } from "lucide-react"
import { useCallback, useMemo, useState } from "react"
import { useIsMounted } from "usehooks-ts"
import { ErrorBoundary } from "@/components/ui/error-boundary"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { api } from "@/convex/_generated/api"
import type { Doc, Id } from "@/convex/_generated/dataModel"
import { CurrentRoundPanel } from "./CurrentRoundPanel"
import { GameHeader } from "./GameHeader"
import { GameResults } from "./GameResults"
import { MyTimeline } from "./MyTimeline"
import { PlayersBar } from "./PlayersBar"
import { PlayerTimelineModal } from "./PlayerTimelineModal"

interface GameViewProps {
  lobbyId: Id<"lobbies">
  code: string
}

interface GameViewContentProps {
  lobbyId: Id<"lobbies">
  code: string
  lobby: Doc<"lobbies">
  players: Doc<"players">[]
  me: Doc<"players"> | null
  game: Doc<"games">
  currentRound: any
  revealedTracks: Array<{
    trackId: Id<"tracks">
    title: string
    artist: string
    year: number
    youtubeVideoId?: string
  }>
  sessionId: string | null
  selectedPlayerForTimeline: Doc<"players"> | null
  onPlayerClick: (player: Doc<"players">) => void
  onModalClose: (open: boolean) => void
}

interface ActiveGameViewProps {
  lobbyId: Id<"lobbies">
  lobby: Doc<"lobbies">
  players: Doc<"players">[]
  me: Doc<"players"> | null
  game: Doc<"games">
  currentRound: any
  revealedTracks: Array<{
    trackId: Id<"tracks">
    title: string
    artist: string
    year: number
    youtubeVideoId?: string
  }>
  sessionId: string | null
  selectedPlayerForTimeline: Doc<"players"> | null
  onPlayerClick: (player: Doc<"players">) => void
  onModalClose: (open: boolean) => void
}

function LoadingSkeleton(): React.ReactNode {
  return (
    <div className="w-full space-y-6">
      <div className="h-16 animate-pulse rounded-lg bg-muted" />
      <div className="h-12 animate-pulse rounded-lg bg-muted" />
      <div className="h-64 animate-pulse rounded-lg bg-muted" />
    </div>
  )
}

function GameTabs({
  lobbyId,
  lobby,
  players,
  me,
  currentRound,
  revealedTracks,
  isMyTurn,
  roundPhase,
  trackInfo,
  turnPlayer,
}: {
  lobbyId: Id<"lobbies">
  lobby: Doc<"lobbies">
  players: Doc<"players">[]
  me: Doc<"players"> | null
  currentRound: any
  revealedTracks: Array<{
    trackId: Id<"tracks">
    title: string
    artist: string
    year: number
    youtubeVideoId?: string
  }>
  isMyTurn: boolean
  roundPhase: "placing" | "betting" | "resolved"
  trackInfo: {
    _id: Id<"tracks">
    title?: string
    artist?: string
    year?: number
    youtubeVideoId?: string
  } | null
  turnPlayer: Doc<"players"> | undefined
}): React.ReactNode {
  const turnPlayerPlacementIndex =
    currentRound?.phase === "betting" ? (currentRound?.placement?.proposedIndex ?? null) : null

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
            turnPlayerPlacementIndex={turnPlayerPlacementIndex}
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
  )
}

function ActiveGameView({
  lobbyId,
  lobby,
  players,
  me,
  game,
  currentRound,
  revealedTracks,
  sessionId,
  selectedPlayerForTimeline,
  onPlayerClick,
  onModalClose,
}: ActiveGameViewProps): React.ReactNode {
  const turnPlayer = players.find((player) => player._id === currentRound.turnPlayerId)
  const isMyTurn = currentRound.turnPlayerId === me?._id
  const roundPhase = (currentRound.phase ?? "placing") as "placing" | "betting" | "resolved"
  const turnPlayerSummary = turnPlayer
    ? {
        _id: turnPlayer._id,
        displayName: turnPlayer.displayName,
      }
    : null

  const trackInfo = useMemo((): {
    _id: Id<"tracks">
    title?: string
    artist?: string
    year?: number
    youtubeVideoId?: string
  } | null => {
    if (!currentRound?.track) {
      return null
    }
    const track = currentRound.track
    const youtubeVideoId = (track.youtubeVideoId as string | undefined) ?? undefined
    return {
      _id: track.trackId as Id<"tracks">,
      youtubeVideoId,
      ...("title" in track
        ? {
            title: track.title,
            artist: track.artist,
            year: track.year,
          }
        : {}),
    }
  }, [currentRound?.track])

  return (
    <>
      <ErrorBoundary>
        {selectedPlayerForTimeline && (
          <PlayerTimelineModal
            onOpenChange={onModalClose}
            open={selectedPlayerForTimeline !== null}
            player={selectedPlayerForTimeline}
          />
        )}

        <PlayersBar
          currentSessionId={sessionId}
          highlightPlayerId={currentRound?.turnPlayerId ?? null}
          lobbyId={lobbyId}
          onPlayerClick={onPlayerClick}
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
          turnPlayer={turnPlayerSummary}
        />
      </ErrorBoundary>

      <GameTabs
        currentRound={currentRound}
        isMyTurn={isMyTurn}
        lobby={lobby}
        lobbyId={lobbyId}
        me={me}
        players={players}
        revealedTracks={revealedTracks}
        roundPhase={roundPhase}
        trackInfo={trackInfo}
        turnPlayer={turnPlayer}
      />
    </>
  )
}

function GameViewContent({
  lobbyId,
  code,
  lobby,
  players,
  me,
  game,
  currentRound,
  revealedTracks,
  sessionId,
  selectedPlayerForTimeline,
  onPlayerClick,
  onModalClose,
}: GameViewContentProps): React.ReactNode {
  const isGameFinished = game.status === "finished"

  return (
    <div className="w-full space-y-4">
      {isGameFinished ? (
        <ErrorBoundary>
          <GameResults code={code} lobbyId={lobbyId} />
        </ErrorBoundary>
      ) : (
        <ActiveGameView
          currentRound={currentRound}
          game={game}
          lobby={lobby}
          lobbyId={lobbyId}
          me={me}
          onModalClose={onModalClose}
          onPlayerClick={onPlayerClick}
          players={players}
          revealedTracks={revealedTracks}
          selectedPlayerForTimeline={selectedPlayerForTimeline}
          sessionId={sessionId}
        />
      )}
    </div>
  )
}

export function GameView({ lobbyId, code }: GameViewProps): React.ReactNode {
  const [sessionId] = useSessionId()
  const isMounted = useIsMounted()
  const mounted = isMounted()
  const [selectedPlayerForTimeline, setSelectedPlayerForTimeline] = useState<Doc<"players"> | null>(
    null,
  )

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

  const handlePlayerClick = useCallback((player: Doc<"players">) => {
    setSelectedPlayerForTimeline(player)
  }, [])

  const handleModalClose = useCallback((open: boolean) => {
    if (!open) {
      setSelectedPlayerForTimeline(null)
    }
  }, [])

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
    <GameViewContent
      code={code}
      currentRound={currentRound}
      game={game}
      lobby={lobby}
      lobbyId={lobbyId}
      me={me ?? null}
      onModalClose={handleModalClose}
      onPlayerClick={handlePlayerClick}
      players={players}
      revealedTracks={revealedTracks ?? []}
      selectedPlayerForTimeline={selectedPlayerForTimeline}
      sessionId={sessionId ?? null}
    />
  )
}
