"use client"

import { Music } from "lucide-react"
import { useTranslations } from "next-intl"
import type { Id } from "@/convex/_generated/dataModel"
import { BettingPanel } from "./betting-panel"

interface BettingPhaseContentProps {
  lobbyId: Id<"lobbies">
  me: {
    _id: Id<"players">
    displayName: string
    timeline: Array<{
      trackId: Id<"tracks">
      year: number
      earnedAtRoundNumber: number
      earnedBy: "placement" | "bet" | "initial"
    }>
    timelineSize: number
    coins: number
    isHost: boolean
  } | null
  track: {
    _id: Id<"tracks">
    title?: string
    artist?: string
    year?: number
    youtubeVideoId?: string
  } | null
  turnPlayerTimeline: Array<{
    trackId: Id<"tracks">
    year: number
    earnedAtRoundNumber: number
    earnedBy: "placement" | "bet" | "initial"
  }>
  revealedTracks: Array<{
    trackId: Id<"tracks">
    title: string
    artist: string
    year: number
    youtubeVideoId?: string
  }>
  players: Array<{
    _id: Id<"players">
    displayName: string
    timeline: Array<{
      trackId: Id<"tracks">
      year: number
      earnedAtRoundNumber: number
      earnedBy: "placement" | "bet" | "initial"
    }>
    timelineSize: number
    coins: number
    isHost: boolean
  }> | null
  turnPlayerId: Id<"players"> | null
  roundStartedAt: number | undefined
  turnSeconds: number | undefined
  bettingWindowSeconds: number | undefined
  turnPlayerPlacementIndex: number | null
  showLiveBets: boolean
}

export function BettingPhaseContent({
  lobbyId,
  me,
  track,
  turnPlayerTimeline,
  revealedTracks,
  players,
  turnPlayerId,
  roundStartedAt,
  turnSeconds,
  bettingWindowSeconds,
  turnPlayerPlacementIndex,
  showLiveBets,
}: BettingPhaseContentProps): React.ReactNode {
  const tBetting = useTranslations("betting")

  if (lobbyId && me && track && players) {
    return (
      <BettingPanel
        bettingWindowSeconds={bettingWindowSeconds}
        lobbyId={lobbyId}
        me={me}
        phase="betting"
        players={players}
        revealedTracks={revealedTracks}
        roundStartedAt={roundStartedAt}
        showLiveBets={showLiveBets}
        track={track}
        turnPlayerId={turnPlayerId ?? null}
        turnPlayerPlacementIndex={turnPlayerPlacementIndex}
        turnPlayerTimeline={turnPlayerTimeline}
        turnSeconds={turnSeconds}
      />
    )
  }

  return (
    <div className="flex flex-col items-center justify-center space-y-4 py-12">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
        <Music className="h-8 w-8 text-amber-600 dark:text-amber-400" />
      </div>
      <div className="space-y-2 text-center">
        <p className="font-medium text-lg">{tBetting("placeYourBet")}</p>
        <p className="text-muted-foreground text-sm">{tBetting("placeBetDescription")}</p>
      </div>
    </div>
  )
}
