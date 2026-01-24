"use client"

import { useSessionMutation } from "convex-helpers/react/sessions"
import { ArrowDown, ArrowUp, Check, Loader2 } from "lucide-react"
import { useTranslations } from "next-intl"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { api } from "@/convex/_generated/api"
import type { Doc, Id } from "@/convex/_generated/dataModel"
import { sortTimelineByYear } from "@/lib/timeline"
import { TimelineCard } from "./TimelineCard"

interface TrackInfo {
  _id: Id<"tracks">
  title?: string
  artist?: string
  year?: number
  youtubeVideoId?: string
}

interface RevealedTrack {
  trackId: Id<"tracks">
  title: string
  artist: string
  year: number
  youtubeVideoId?: string
}

interface TimelinePlacerProps {
  lobbyId: Id<"lobbies">
  player: Doc<"players">
  currentTrack: TrackInfo | null
  existingPreviewIndex: number | null
  revealedTracks: RevealedTrack[]
}

export function TimelinePlacer({
  lobbyId,
  player,
  currentTrack,
  existingPreviewIndex,
  revealedTracks,
}: TimelinePlacerProps): React.ReactNode {
  const t = useTranslations("placing")

  const [selectedIndex, setSelectedIndex] = useState<number>(existingPreviewIndex ?? 0)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const _setPlacementPreview = useSessionMutation(api.rounds.setPlacementPreview)
  const submitPlacement = useSessionMutation(api.rounds.submitPlacement)

  const sortedTimeline = sortTimelineByYear(player.timeline)
  const revealedTrackMap = useMemo(
    () => new Map(revealedTracks.map((track) => [track.trackId, track])),
    [revealedTracks],
  )
  const maxPosition = sortedTimeline.length
  const isAtTop = selectedIndex <= 0
  const isAtBottom = selectedIndex >= maxPosition

  const moveSelection = useCallback(
    (direction: "up" | "down") => {
      setSelectedIndex((prev) => {
        if (direction === "up") {
          return Math.max(0, prev - 1)
        }
        return Math.min(maxPosition, prev + 1)
      })
    },
    [maxPosition],
  )

  const handleSubmit = useCallback(async () => {
    setIsSubmitting(true)
    try {
      await submitPlacement({
        lobbyId,
      })
    } catch (error) {
      console.error("Failed to submit placement:", error)
    } finally {
      setIsSubmitting(false)
    }
  }, [lobbyId, submitPlacement])

  const handleSubmitRef = useRef(handleSubmit)
  handleSubmitRef.current = handleSubmit

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp") {
        e.preventDefault()
        moveSelection("up")
      } else if (e.key === "ArrowDown") {
        e.preventDefault()
        moveSelection("down")
      } else if (e.key === "Enter") {
        e.preventDefault()
        handleSubmitRef.current()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [moveSelection])

  useEffect(() => {
    const updatePreview = async () => {
      await _setPlacementPreview({
        lobbyId,
        proposedIndex: selectedIndex,
      })
    }

    updatePreview().catch((error) => {
      console.error("Failed to update placement preview:", error)
    })
  }, [lobbyId, selectedIndex, _setPlacementPreview])

  if (!currentTrack) {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <div className="h-8 w-8 animate-spin rounded-full border-primary border-b-2" />
        <p className="mt-4 text-muted-foreground">{t("loadingTrack")}</p>
      </div>
    )
  }

  const getPositionLabel = (index: number): string => {
    if (index === 0 && maxPosition === 0) {
      return t("emptyTimeline")
    }
    if (index === 0) {
      const firstYear = sortedTimeline[0]?.year
      return t("beforeYear", { year: firstYear })
    }
    if (index === maxPosition) {
      const lastYear = sortedTimeline[maxPosition - 1]?.year
      return t("afterYear", { year: lastYear })
    }
    const yearBefore = sortedTimeline[index - 1]?.year
    const yearAfter = sortedTimeline[index]?.year
    return t("betweenYears", { year1: yearBefore, year2: yearAfter })
  }

  return (
    <div className="w-full space-y-4 pb-24 sm:pb-0">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-muted-foreground text-sm">{t("placeTheSong")}</h3>
      </div>

      <div className="space-y-2">
        {sortedTimeline.map((entry, idx) => (
          <div key={`${entry.trackId}-${entry.earnedAtRoundNumber}-${idx}`}>
            {idx === selectedIndex && (
              <TimelineCard
                icon="help"
                isNew={true}
                isPreview={true}
                subtitle="Guess the year!"
                title="New Song"
                year={currentTrack.year}
              />
            )}
            {revealedTrackMap.has(entry.trackId) ? (
              <TimelineCard
                artist={revealedTrackMap.get(entry.trackId)!.artist}
                icon="music"
                title={revealedTrackMap.get(entry.trackId)!.title}
                year={revealedTrackMap.get(entry.trackId)!.year}
              />
            ) : (
              <TimelineCard
                icon="music"
                iconColor="primary"
                subtitle="From round"
                title="Known Track"
                year={entry.year}
              />
            )}
          </div>
        ))}
        {maxPosition === selectedIndex && (
          <TimelineCard
            icon="help"
            isNew={true}
            isPreview={true}
            subtitle="Guess the year!"
            title="New Song"
            year={currentTrack.year}
          />
        )}
      </div>

      <div className="flex items-center justify-between border-t pt-4">
        <p className="font-medium text-foreground text-sm">{getPositionLabel(selectedIndex)}</p>
        <div className="text-right">
          <p className="hidden text-muted-foreground text-xs sm:block">{t("useArrowsToMove")}</p>
          <p className="hidden text-muted-foreground text-xs sm:block">
            {t("pressEnterToConfirm")}
          </p>
          <p className="text-muted-foreground text-xs sm:hidden">{t("tapButtonsToMove")}</p>
          <p className="text-muted-foreground text-xs sm:hidden">{t("tapConfirmToPlace")}</p>
        </div>
      </div>

      <Button className="w-full" disabled={isSubmitting} onClick={handleSubmit} size="lg">
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {t("submitting")}
          </>
        ) : (
          <>
            <Check className="mr-2 h-4 w-4" />
            {t("confirmPlacement")}
          </>
        )}
      </Button>
      <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 px-4 py-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] backdrop-blur sm:hidden">
        <div className="mx-auto flex w-full max-w-lg items-center gap-3">
          <Button
            aria-label={t("moveUp")}
            disabled={isAtTop}
            onClick={() => moveSelection("up")}
            size="icon-lg"
            type="button"
            variant="outline"
          >
            <ArrowUp className="h-5 w-5" />
          </Button>
          <Button
            aria-label={t("moveDown")}
            disabled={isAtBottom}
            onClick={() => moveSelection("down")}
            size="icon-lg"
            type="button"
            variant="outline"
          >
            <ArrowDown className="h-5 w-5" />
          </Button>
          <Button
            className="flex-1"
            disabled={isSubmitting}
            onClick={handleSubmit}
            size="lg"
            type="button"
          >
            <Check className="mr-2 h-4 w-4" />
            {t("confirmPlacement")}
          </Button>
        </div>
      </div>
    </div>
  )
}
