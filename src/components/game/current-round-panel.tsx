"use client"

import { useTranslations } from "next-intl"
import { YouTubePlayer } from "@/components/player/you-tube-player"
import type { Doc, Id } from "@/convex/_generated/dataModel"
import { cn } from "@/lib/utils"
import { BettingPhaseContent } from "./betting-phase-content"
import { PlacingPhaseContent } from "./placing-phase-content"
import { ResolvedPhaseContent } from "./resolved-phase-content"

export type RoundPhase = "placing" | "betting" | "resolved"

interface TimelineEntry {
  trackId: Id<"tracks">
  year: number
  earnedAtRoundNumber: number
  earnedBy: "placement" | "bet" | "initial"
}

interface CurrentRoundPanelProps {
  phase: RoundPhase
  isMyTurn: boolean
  lobbyId?: Id<"lobbies">
  me?: Doc<"players"> | null
  players?: Doc<"players">[] | null
  track?: {
    _id: Id<"tracks">
    title?: string
    artist?: string
    year?: number
    youtubeVideoId?: string
  } | null
  existingPreviewIndex?: number | null
  turnPlayerId?: Id<"players"> | null
  turnPlayerTimeline?: TimelineEntry[]
  turnPlayerTimelineSize?: number
  revealedTracks?: Array<{
    trackId: Id<"tracks">
    title: string
    artist: string
    year: number
    youtubeVideoId?: string
  }>
  roundStartedAt?: number
  turnSeconds?: number
  bettingWindowSeconds?: number
  resolution?: {
    validIndexMin: number
    validIndexMax: number
    turnPlayerWasCorrect: boolean
    awardedPlayerIds: Id<"players">[]
    coinDeltas: Array<{
      playerId: Id<"players">
      delta: number
    }>
    resolvedAt: number
  } | null
  turnPlayerPlacementIndex?: number | null
  showLiveBets?: boolean
}

export function CurrentRoundPanel({
  phase,
  isMyTurn,
  lobbyId,
  me,
  players,
  track,
  existingPreviewIndex,
  turnPlayerId,
  turnPlayerTimeline,
  turnPlayerTimelineSize,
  revealedTracks,
  roundStartedAt,
  turnSeconds,
  bettingWindowSeconds,
  resolution,
  turnPlayerPlacementIndex,
  showLiveBets,
}: CurrentRoundPanelProps): React.ReactNode {
  const t = useTranslations("roundPhase")
  let phaseBadgeClass = "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
  if (phase === "placing") {
    phaseBadgeClass = "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
  } else if (phase === "betting") {
    phaseBadgeClass = "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
  }

  const renderPhaseContent = (): React.ReactNode => {
    return (
      <>
        {track?.youtubeVideoId && (
          <div className="w-full max-w-xs">
            <YouTubePlayer youtubeVideoId={track.youtubeVideoId} />
          </div>
        )}
        {(() => {
          switch (phase) {
            case "placing":
              return (
                <PlacingPhaseContent
                  existingPreviewIndex={existingPreviewIndex ?? null}
                  isMyTurn={isMyTurn}
                  lobbyId={lobbyId ?? undefined}
                  me={me ?? null}
                  players={players ?? null}
                  revealedTracks={revealedTracks ?? []}
                  track={track ?? null}
                  turnPlayerId={turnPlayerId ?? null}
                  turnPlayerTimeline={turnPlayerTimeline ?? []}
                  turnPlayerTimelineSize={turnPlayerTimelineSize ?? 0}
                />
              )

            case "betting":
              return (
                <BettingPhaseContent
                  bettingWindowSeconds={bettingWindowSeconds}
                  lobbyId={lobbyId!}
                  me={me!}
                  players={players ?? null}
                  revealedTracks={revealedTracks ?? []}
                  roundStartedAt={roundStartedAt}
                  showLiveBets={showLiveBets ?? false}
                  track={track!}
                  turnPlayerId={turnPlayerId ?? null}
                  turnPlayerPlacementIndex={turnPlayerPlacementIndex ?? null}
                  turnPlayerTimeline={turnPlayerTimeline ?? []}
                  turnSeconds={turnSeconds}
                />
              )

            case "resolved":
              return (
                <ResolvedPhaseContent
                  lobbyId={lobbyId!}
                  me={me!}
                  players={players!}
                  resolution={resolution!}
                  track={track!}
                  turnPlayerId={turnPlayerId!}
                />
              )

            default:
              return (
                <div className="flex flex-col items-center justify-center py-12">
                  <p className="text-muted-foreground">Waiting for round to start...</p>
                </div>
              )
          }
        })()}
      </>
    )
  }

  return (
    <div className="w-full">
      <div className="overflow-hidden rounded-xl border bg-card">
        <div className="border-b bg-muted/50 px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="font-medium text-sm">{t("placingTitle")}</span>
            <span
              className={cn(
                "inline-flex items-center rounded-full px-2 py-1 font-medium text-xs transition-all duration-300",
                phaseBadgeClass,
              )}
            >
              {t(phase)}
            </span>
          </div>
        </div>
        <div className="fade-in animate-in p-6 transition-all duration-300">
          {renderPhaseContent()}
        </div>
      </div>
    </div>
  )
}
