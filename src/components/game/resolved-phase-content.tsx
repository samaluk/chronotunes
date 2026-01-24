"use client"

import { useQuery } from "convex/react"
import { Music } from "lucide-react"
import { useTranslations } from "next-intl"
import { useEffect, useState } from "react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { api } from "@/convex/_generated/api"
import type { Doc, Id } from "@/convex/_generated/dataModel"
import { RoundResults } from "./round-results"

interface ResolvedPhaseContentProps {
  lobbyId: Id<"lobbies">
  track: {
    _id: Id<"tracks">
    title?: string
    artist?: string
    year?: number
    youtubeVideoId?: string
  } | null
  resolution: {
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
  players: Doc<"players">[] | null
  turnPlayerId: Id<"players"> | null
  me: Doc<"players"> | null
}

export function ResolvedPhaseContent({
  lobbyId,
  track,
  resolution,
  players,
  turnPlayerId,
  me,
}: ResolvedPhaseContentProps): React.ReactNode {
  const tResults = useTranslations("results")
  const [showResultsModal, setShowResultsModal] = useState(false)
  const roundBets = useQuery(api.bets.listForRound, lobbyId ? { lobbyId } : "skip")

  useEffect(() => {
    setShowResultsModal(true)
  }, [])

  if (!(lobbyId && track && resolution && players && turnPlayerId)) {
    return (
      <div className="flex flex-col items-center justify-center space-y-4 py-12">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
          <Music className="h-8 w-8 text-green-600 dark:text-green-400" />
        </div>
        <div className="space-y-2 text-center">
          <p className="font-medium text-lg">{tResults("roundResults")}</p>
          <p className="text-muted-foreground text-sm">{tResults("songRevealed")}</p>
        </div>
        {track?.title && track?.artist && track?.year && (
          <div className="mt-4 w-full max-w-md rounded-lg border bg-card p-4 text-center">
            <p className="text-muted-foreground text-sm">{tResults("songWas")}</p>
            <p className="mt-1 font-bold text-xl">
              {track.title} - {track.artist} ({track.year})
            </p>
          </div>
        )}
      </div>
    )
  }

  const turnPlayer = players.find((player) => player._id === turnPlayerId) ?? null
  if (!turnPlayer) {
    return null
  }

  const resultsContent = (
    <RoundResults
      bets={roundBets ?? []}
      lobbyId={lobbyId}
      me={me ?? null}
      players={players}
      resolution={resolution}
      track={
        track as {
          _id: typeof track._id
          title: string
          artist: string
          year: number
        }
      }
      turnPlayer={turnPlayer}
    />
  )

  return (
    <>
      <Dialog onOpenChange={setShowResultsModal} open={showResultsModal}>
        <DialogContent className="max-w-3xl">{resultsContent}</DialogContent>
      </Dialog>
      {!showResultsModal && resultsContent}
    </>
  )
}
