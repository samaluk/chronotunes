"use client"

import { useQuery } from "convex/react"
import { useSessionMutation } from "convex-helpers/react/sessions"
import { AlertTriangle, Check, Coins, Loader2, Lock, X } from "lucide-react"
import { useTranslations } from "next-intl"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { getRevealedTrackMap, sortTimelineByYear } from "@/lib/timeline"
import { BetZone } from "./BetZone"
import { BetCoin } from "./bet-coin"
import { TimelineCard } from "./TimelineCard"

interface TimelineEntry {
  trackId: Id<"tracks">
  year: number
  earnedAtRoundNumber: number
  earnedBy: "placement" | "bet" | "initial"
}

interface Player {
  _id: Id<"players">
  displayName: string
  timeline: TimelineEntry[]
  timelineSize: number
  coins: number
  isHost: boolean
}

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

interface BettingPanelProps {
  lobbyId: Id<"lobbies">
  me: Player | null
  track: TrackInfo | null
  turnPlayerTimeline: TimelineEntry[]
  revealedTracks: RevealedTrack[]
  players?: Player[]
  turnPlayerId?: Id<"players"> | null
  roundStartedAt?: number
  turnSeconds?: number
  bettingWindowSeconds?: number
  turnPlayerPlacementIndex?: number | null
  phase?: string
  showLiveBets?: boolean
}

interface SlotBetInfo {
  playerId: Id<"players">
  playerDisplayName: string
  lockedIn: boolean
}

interface SlotInfo {
  index: number
  above?: TimelineEntry
  below?: TimelineEntry
  bets: SlotBetInfo[]
}

// biome-ignore lint: stateful UI orchestration
export function BettingPanel({
  lobbyId,
  me,
  track,
  turnPlayerTimeline,
  revealedTracks,
  players,
  turnPlayerId,
  turnPlayerPlacementIndex,
}: BettingPanelProps): React.ReactNode {
  const t = useTranslations("betting")
  const tCommon = useTranslations("common")
  const tTimer = useTranslations("timer")

  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [isPreviewing, setIsPreviewing] = useState(false)
  const [isLockingIn, setIsLockingIn] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)
  const [isDeclining, setIsDeclining] = useState(false)
  const [isResolving, setIsResolving] = useState(false)
  const [showPreviewDiscarded, setShowPreviewDiscarded] = useState(false)
  const [shakeSlotIndex, setShakeSlotIndex] = useState<number | null>(null)

  const shakeTimeoutRef = useRef<number | null>(null)

  const previewBet = useSessionMutation(api.bets.preview)
  const lockInBet = useSessionMutation(api.bets.lockIn)
  const cancelBet = useSessionMutation(api.bets.cancel)
  const declineBet = useSessionMutation(api.rounds.declineBet)
  const resolveRound = useSessionMutation(api.games.resolveRound)

  const existingBets = useQuery(api.bets.listForRound, lobbyId ? { lobbyId } : "skip")
  const safeBets = existingBets ?? []
  const myBet = safeBets.find((bet) => bet.playerId === me?._id) ?? null
  const hasLockedBet = myBet?.lockedIn ?? false
  const hasDeclinedBet = myBet?.declinedToBet ?? false
  const isTurnPlayer = Boolean(turnPlayerId && me?._id === turnPlayerId)
  const turnPlayerSlotIndex = turnPlayerPlacementIndex ?? null

  const sortedTimeline = sortTimelineByYear(turnPlayerTimeline)
  const revealedTrackMap = getRevealedTrackMap(revealedTracks)

  const isHost = players?.find((p) => p._id === me?._id)?.isHost ?? false
  const turnPlayerName = players?.find((player) => player._id === turnPlayerId)?.displayName ?? null

  const canBet = Boolean(me && me.coins >= 1 && !hasLockedBet && !hasDeclinedBet && !isTurnPlayer)
  const canDecline = Boolean(me && !hasLockedBet && !hasDeclinedBet && !isTurnPlayer)
  const myPlayerId = me?._id ?? null

  const triggerForbiddenSlotFeedback = useCallback(
    (index: number) => {
      setShakeSlotIndex(index)
      if (shakeTimeoutRef.current !== null) {
        window.clearTimeout(shakeTimeoutRef.current)
      }
      shakeTimeoutRef.current = window.setTimeout(() => {
        setShakeSlotIndex(null)
        shakeTimeoutRef.current = null
      }, 500)
      toast.error(t("turnPlayerSlotBlocked"), {
        id: "turn-player-slot-blocked",
      })
    },
    [t],
  )

  const getSlotLabel = useCallback(
    (isTurnPlayerSlot: boolean, lockedBet?: SlotBetInfo) => {
      if (isTurnPlayerSlot) {
        if (turnPlayerName) {
          return t("turnPlayerPickWithName", { name: turnPlayerName })
        }
        return t("turnPlayerPlacement")
      }

      if (lockedBet) {
        return t("playersSlot", { name: lockedBet.playerDisplayName })
      }

      return t("openSlot")
    },
    [t, turnPlayerName],
  )

  const getSlotState = useCallback(
    (slot: SlotInfo) => {
      const slotBetsForIndex = slot.bets
      const lockedBet = slotBetsForIndex.find((bet) => bet.lockedIn)
      const isTurnPlayerSlot = turnPlayerSlotIndex !== null && slot.index === turnPlayerSlotIndex
      const isSelected = selectedIndex === slot.index
      const isActive = isSelected && !isTurnPlayerSlot
      const hasLockedBetByOther = slotBetsForIndex.some(
        (bet) => bet.lockedIn && bet.playerId !== myPlayerId,
      )
      const canSelectSlot = canBet && !hasLockedBetByOther && !isTurnPlayerSlot
      const label = getSlotLabel(isTurnPlayerSlot, lockedBet)
      const hasMyBet = slotBetsForIndex.some((bet) => bet.playerId === myPlayerId)
      const showPreviewCoin =
        isActive && !hasLockedBet && !hasDeclinedBet && Boolean(me) && !hasMyBet
      const isDisabled = !(canSelectSlot || isActive)
      const shouldDim = isDisabled && !isTurnPlayerSlot

      return {
        slotBetsForIndex,
        isTurnPlayerSlot,
        isActive,
        label,
        showPreviewCoin,
        isDisabled,
        shouldDim,
      }
    },
    [
      turnPlayerSlotIndex,
      selectedIndex,
      myPlayerId,
      canBet,
      getSlotLabel,
      hasLockedBet,
      hasDeclinedBet,
      me,
    ],
  )

  const slotBets = useMemo(() => {
    const map = new Map<number, SlotBetInfo[]>()
    for (const bet of safeBets) {
      if (bet.declinedToBet) {
        continue
      }
      const existing = map.get(bet.proposedIndex) ?? []
      existing.push({
        playerId: bet.playerId,
        playerDisplayName: bet.playerDisplayName,
        lockedIn: bet.lockedIn,
      })
      map.set(bet.proposedIndex, existing)
    }
    return map
  }, [safeBets])

  const slots = useMemo<SlotInfo[]>(() => {
    const result: SlotInfo[] = []
    for (let index = 0; index <= sortedTimeline.length; index += 1) {
      result.push({
        index,
        above: sortedTimeline[index - 1],
        below: sortedTimeline[index],
        bets: slotBets.get(index) ?? [],
      })
    }
    return result
  }, [sortedTimeline, slotBets])

  const getNextIndexForDirection = useCallback(
    (currentIndex: number, direction: "up" | "down") => {
      const step = direction === "down" ? 1 : -1
      const candidateIndex = currentIndex + step

      if (candidateIndex < 0 || candidateIndex >= slots.length) {
        return null
      }

      if (turnPlayerSlotIndex === null || candidateIndex !== turnPlayerSlotIndex) {
        return candidateIndex
      }

      const skippedIndex = candidateIndex + step
      if (skippedIndex < 0 || skippedIndex >= slots.length) {
        triggerForbiddenSlotFeedback(candidateIndex)
        return null
      }

      return skippedIndex
    },
    [slots.length, triggerForbiddenSlotFeedback, turnPlayerSlotIndex],
  )

  const canResolveRound = useMemo(() => {
    if (!(isHost && players && turnPlayerId)) {
      return false
    }

    const nonTurnPlayers = players.filter((p) => p._id !== turnPlayerId)
    if (nonTurnPlayers.length === 0) {
      return false
    }

    const lockedBets = safeBets.filter((bet) => bet.lockedIn)
    const declinedBets = safeBets.filter((bet) => bet.declinedToBet)

    return nonTurnPlayers.every(
      (player) =>
        lockedBets.some((bet) => bet.playerId === player._id) ||
        declinedBets.some((bet) => bet.playerId === player._id),
    )
  }, [isHost, players, turnPlayerId, safeBets])

  const handleResolveRound = useCallback(async () => {
    if (!lobbyId) {
      return
    }

    setIsResolving(true)
    try {
      await resolveRound({ lobbyId })
    } catch (error) {
      console.error("Failed to resolve round:", error)
    } finally {
      setIsResolving(false)
    }
  }, [resolveRound, lobbyId])

  useEffect(() => {
    if (myBet && !hasLockedBet && !hasDeclinedBet) {
      setSelectedIndex(myBet.proposedIndex)
      return
    }

    setSelectedIndex(null)
  }, [myBet?.proposedIndex, myBet, hasLockedBet, hasDeclinedBet])

  useEffect(() => {
    if (selectedIndex === null || !me) {
      return
    }

    const slotBetsForIndex = slotBets.get(selectedIndex) ?? []
    const otherLockedBet = slotBetsForIndex.find((bet) => bet.playerId !== me._id && bet.lockedIn)

    if (otherLockedBet) {
      setSelectedIndex(null)
      setShowPreviewDiscarded(true)
    }
  }, [selectedIndex, slotBets, me])

  useEffect(() => {
    if (!showPreviewDiscarded) {
      return
    }

    const timeoutId = setTimeout(() => {
      setShowPreviewDiscarded(false)
    }, 2500)

    return () => clearTimeout(timeoutId)
  }, [showPreviewDiscarded])

  useEffect(() => {
    return () => {
      if (shakeTimeoutRef.current !== null) {
        window.clearTimeout(shakeTimeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (selectedIndex === null || turnPlayerSlotIndex === null) {
      return
    }

    if (selectedIndex === turnPlayerSlotIndex) {
      setSelectedIndex(null)
    }
  }, [selectedIndex, turnPlayerSlotIndex])

  const handlePreview = useCallback(
    async (index: number) => {
      if (!(canBet && me)) {
        return
      }

      if (turnPlayerSlotIndex !== null && index === turnPlayerSlotIndex) {
        triggerForbiddenSlotFeedback(index)
        return
      }

      const slotBetsForIndex = slotBets.get(index) ?? []
      const otherLockedBet = slotBetsForIndex.find((bet) => bet.playerId !== me._id && bet.lockedIn)
      if (otherLockedBet) {
        return
      }

      setSelectedIndex(index)
      setIsPreviewing(true)

      try {
        await previewBet({
          lobbyId,
          proposedIndex: index,
        })
      } catch (error) {
        console.error(t("failedToPreview"), error)
        setSelectedIndex(null)
      } finally {
        setIsPreviewing(false)
      }
    },
    [
      canBet,
      me,
      slotBets,
      previewBet,
      lobbyId,
      t,
      triggerForbiddenSlotFeedback,
      turnPlayerSlotIndex,
    ],
  )

  const handleConfirm = useCallback(async () => {
    if (!(lobbyId && myBet) || hasLockedBet || hasDeclinedBet) {
      return
    }

    setIsLockingIn(true)

    try {
      await lockInBet({ lobbyId })
      setSelectedIndex(null)
    } catch (error) {
      console.error(t("failedToLockIn"), error)
    } finally {
      setIsLockingIn(false)
    }
  }, [lobbyId, myBet, hasLockedBet, hasDeclinedBet, lockInBet, t])

  const handleCancel = useCallback(async () => {
    if (!(lobbyId && myBet) || myBet.lockedIn || myBet.declinedToBet) {
      return
    }

    setIsCancelling(true)

    try {
      await cancelBet({ lobbyId })
      setSelectedIndex(null)
    } catch (error) {
      console.error(t("failedToCancel"), error)
    } finally {
      setIsCancelling(false)
    }
  }, [lobbyId, myBet, cancelBet, t])

  const handleDecline = useCallback(async () => {
    if (!(lobbyId && canDecline)) {
      return
    }

    setIsDeclining(true)

    try {
      await declineBet({ lobbyId })
      setSelectedIndex(null)
    } catch (error) {
      console.error(t("failedToDecline"), error)
    } finally {
      setIsDeclining(false)
    }
  }, [lobbyId, canDecline, declineBet, t])

  const handleSlotClick = useCallback(
    async (index: number) => {
      if (isPreviewing || isLockingIn) {
        return
      }

      if (turnPlayerSlotIndex !== null && index === turnPlayerSlotIndex) {
        triggerForbiddenSlotFeedback(index)
        return
      }

      if (selectedIndex === index && myBet && !hasLockedBet && !hasDeclinedBet) {
        await handleConfirm()
        return
      }

      await handlePreview(index)
    },
    [
      selectedIndex,
      myBet,
      hasLockedBet,
      hasDeclinedBet,
      isPreviewing,
      isLockingIn,
      handleConfirm,
      handlePreview,
      turnPlayerSlotIndex,
      triggerForbiddenSlotFeedback,
    ],
  )

  const handleArrowMove = useCallback(
    async (direction: "up" | "down") => {
      if (selectedIndex === null) {
        return
      }

      const nextIndex = getNextIndexForDirection(selectedIndex, direction)
      if (nextIndex === null) {
        return
      }

      await handlePreview(nextIndex)
    },
    [selectedIndex, getNextIndexForDirection, handlePreview],
  )

  const handleKeyDown = useCallback(
    async (event: KeyboardEvent) => {
      if (!canBet || selectedIndex === null) {
        return
      }

      switch (event.key) {
        case "ArrowDown":
          event.preventDefault()
          await handleArrowMove("down")
          return
        case "ArrowUp":
          event.preventDefault()
          await handleArrowMove("up")
          return
        case "Enter":
          if (hasLockedBet) {
            return
          }
          event.preventDefault()
          await handleConfirm()
          return
        case "Escape":
          event.preventDefault()
          await handleCancel()
          return
        default:
          return
      }
    },
    [canBet, selectedIndex, hasLockedBet, handleArrowMove, handleConfirm, handleCancel],
  )

  useEffect(() => {
    if (!canBet) {
      return
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [canBet, handleKeyDown])

  const renderTimelineEntry = useCallback(
    (entry: TimelineEntry): React.ReactNode => {
      const trackInfo = revealedTrackMap.get(entry.trackId)

      if (trackInfo) {
        return (
          <TimelineCard artist={trackInfo.artist} title={trackInfo.title} year={trackInfo.year} />
        )
      }

      return <TimelineCard title={tCommon("knownTrack")} year={entry.year} />
    },
    [revealedTrackMap, tCommon],
  )

  let activityLabel: string | null = null
  if (isLockingIn) {
    activityLabel = t("lockingInBet")
  } else if (isCancelling) {
    activityLabel = t("cancellingBet")
  } else if (isDeclining) {
    activityLabel = t("decliningBet")
  }

  if (!track) {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <div className="h-8 w-8 animate-spin rounded-full border-primary border-b-2" />
        <p className="mt-4 text-muted-foreground">{tCommon("loading")}</p>
      </div>
    )
  }

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium text-muted-foreground text-sm">{t("placeYourBet")}</h3>
          <p className="mt-1 text-muted-foreground text-xs">{t("placeBetDescription")}</p>
        </div>
        <div className="flex items-center gap-2">
          <Coins className="h-4 w-4 text-amber-500" />
          <span className="font-medium text-sm">{t("betCoins", { count: me?.coins ?? 0 })}</span>
        </div>
      </div>

      <div className="space-y-4">
        {(() => {
          const elements: React.ReactNode[] = []

          const renderBetZone = (slot: SlotInfo): React.ReactNode => {
            const slotState = getSlotState(slot)
            const isOpenSlot =
              slotState.slotBetsForIndex.length === 0 && !slotState.isTurnPlayerSlot
            const hasLockedBet = slotState.slotBetsForIndex.some((bet) => bet.lockedIn)
            const slotCoins = (
              <>
                {slotState.slotBetsForIndex.map((bet) => (
                  <BetCoin
                    isPreview={bet.playerId === me?._id && !bet.lockedIn}
                    key={bet.playerId}
                    playerName={bet.playerDisplayName}
                    state={(() => {
                      if (bet.lockedIn) {
                        return "locked"
                      }
                      if (hasLockedBet) {
                        return "blocked"
                      }
                      return "pending"
                    })()}
                  />
                ))}
                {slotState.showPreviewCoin && me && (
                  <BetCoin isPreview playerName={me.displayName} state="pending" />
                )}
                {slotState.isTurnPlayerSlot && (
                  <span className="inline-flex h-7 items-center gap-1.5 rounded-full border border-amber-300 bg-amber-100 px-2 font-medium text-amber-800 text-xs dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-200">
                    {tCommon("newSong")}
                  </span>
                )}
              </>
            )

            return (
              <BetZone
                coins={slotCoins}
                index={slot.index}
                isActive={slotState.isActive}
                isDisabled={slotState.isDisabled}
                isOpenSlot={isOpenSlot}
                isShaking={shakeSlotIndex === slot.index}
                isTurnPlayerSlot={slotState.isTurnPlayerSlot}
                key={`slot-${slot.index}`}
                label={slotState.label}
                onClick={handleSlotClick}
                shouldDim={slotState.shouldDim}
              />
            )
          }

          const firstSlot = slots[0]
          if (firstSlot) {
            elements.push(renderBetZone(firstSlot))
          }

          sortedTimeline.forEach((entry, index) => {
            elements.push(
              <div key={`timeline-entry-${entry.trackId}-${entry.earnedAtRoundNumber}-${index}`}>
                {renderTimelineEntry(entry)}
              </div>,
            )

            const nextSlot = slots[index + 1]
            if (nextSlot) {
              elements.push(renderBetZone(nextSlot))
            }
          })

          return elements
        })()}
      </div>

      {selectedIndex !== null && !hasLockedBet && !hasDeclinedBet && (
        <div className="rounded-lg border bg-muted/30 p-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-medium text-foreground text-sm">{t("pressEnterToConfirm")}</p>
              <p className="text-muted-foreground text-xs">{t("useArrowsToMove")}</p>
            </div>
            <Button onClick={handleCancel} size="sm" type="button" variant="ghost">
              <X className="mr-1 h-4 w-4" />
              {tCommon("cancel")}
            </Button>
          </div>
        </div>
      )}

      {canDecline && (
        <div className="flex justify-end">
          <Button
            disabled={isDeclining}
            onClick={handleDecline}
            size="sm"
            type="button"
            variant="outline"
          >
            <AlertTriangle className="mr-2 h-4 w-4" />
            {t("declineBet")}
          </Button>
        </div>
      )}

      {showPreviewDiscarded && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-2 text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
          <AlertTriangle className="h-4 w-4" />
          <span className="font-medium text-sm">{t("previewDiscarded")}</span>
        </div>
      )}

      {isTurnPlayer && (
        <div className="flex items-center justify-center gap-2 rounded-lg border bg-muted/50 p-3 text-muted-foreground">
          <Lock className="h-4 w-4" />
          <span className="text-sm">{t("turnPlayerCannotBet")}</span>
        </div>
      )}

      {!(canBet || hasLockedBet || hasDeclinedBet) && me && me.coins < 1 && (
        <div className="flex items-center justify-center gap-2 rounded-lg border bg-muted/50 p-3 text-muted-foreground">
          <Coins className="h-4 w-4" />
          <span className="text-sm">{t("notEnoughCoins")}</span>
        </div>
      )}

      {hasDeclinedBet && (
        <div className="flex items-center justify-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
          <AlertTriangle className="h-4 w-4" />
          <span className="font-medium text-sm">{t("declinedToBet")}</span>
        </div>
      )}

      {hasLockedBet && (
        <div className="flex items-center justify-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-950/30">
          <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
          <span className="font-medium text-green-700 text-sm dark:text-green-300">
            {t("yourBetLocked")}
          </span>
        </div>
      )}

      {canResolveRound && (
        <div className="flex items-center justify-center gap-2 rounded-lg border border-primary bg-primary/10 p-4">
          <Button disabled={isResolving} onClick={handleResolveRound} size="lg" type="button">
            {isResolving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {tTimer("resolvingRound")}
              </>
            ) : (
              tTimer("resolveRound")
            )}
          </Button>
          <p className="text-muted-foreground text-xs">{tTimer("waitingForBets")}</p>
        </div>
      )}

      {activityLabel && (
        <div className="flex items-center justify-center gap-2 rounded-lg bg-muted/50 p-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-muted-foreground text-sm">{activityLabel}</span>
        </div>
      )}
    </div>
  )
}
