"use client"

import { useSessionMutation } from "convex-helpers/react/sessions"
import { Check, Clock, Music, Star, Trophy, Users, X } from "lucide-react"
import { useTranslations } from "next-intl"
import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { api } from "@/convex/_generated/api"
import type { Doc, Id } from "@/convex/_generated/dataModel"
import { cn } from "@/lib/utils"

interface TimelineEntry {
  trackId: Id<"tracks">
  year: number
  earnedAtRoundNumber: number
  earnedBy: "placement" | "bet"
}

interface Player {
  _id: Id<"players">
  displayName: string
  timeline: TimelineEntry[]
  timelineSize: number
  coins: number
  isHost: boolean
  sessionId: string
}

interface TrackInfo {
  _id: Id<"tracks">
  title: string
  artist: string
  year: number
}

interface RoundResolution {
  validIndexMin: number
  validIndexMax: number
  turnPlayerWasCorrect: boolean
  awardedPlayerIds: Id<"players">[]
  coinDeltas: Array<{
    playerId: Id<"players">
    delta: number
  }>
  resolvedAt: number
}

interface BetWithPlayer {
  playerId: Id<"players">
  playerDisplayName: string
  proposedIndex: number
  declinedToBet: boolean
  status: "pending" | "won" | "lost"
}

interface RoundResultsProps {
  lobbyId: Id<"lobbies">
  track: TrackInfo
  resolution: RoundResolution
  turnPlayer: Doc<"players">
  bets: BetWithPlayer[]
  players: Doc<"players">[]
  me: Doc<"players"> | null
}

export function RoundResults({
  lobbyId,
  track,
  resolution,
  turnPlayer,
  bets,
  players,
  me,
}: RoundResultsProps): React.ReactNode {
  const t = useTranslations("results")
  const [isResolving, setIsResolving] = useState(false)
  const [showCorrectness, setShowCorrectness] = useState(false)

  const resolveAndNext = useSessionMutation(api.games.resolveAndNext)
  const isHost = players.find((p) => p._id === me?._id)?.isHost ?? false

  useEffect(() => {
    const timer = setTimeout(() => setShowCorrectness(true), 300)
    return () => clearTimeout(timer)
  }, [])

  const handleNextRound = async () => {
    setIsResolving(true)
    try {
      await resolveAndNext({ lobbyId })
    } catch (error) {
      console.error("Failed to advance to next round:", error)
    } finally {
      setIsResolving(false)
    }
  }

  const getPlayerById = (playerId: Id<"players">): Player | undefined => {
    return players.find((p) => p._id === playerId) as Player | undefined
  }

  const getBetForPlayer = (playerId: Id<"players">): BetWithPlayer | undefined => {
    return bets.find((b) => b.playerId === playerId)
  }

  const bettingBets = useMemo(() => bets.filter((bet) => !bet.declinedToBet), [bets])

  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  const turnPlayerBet = getBetForPlayer(turnPlayer._id)
  const _didTurnPlayerWinCard = resolution.turnPlayerWasCorrect || turnPlayerBet?.status === "won"

  return (
    <div className="space-y-6">
      <div className="space-y-4 text-center">
        <div
          className={cn(
            "mx-auto flex h-20 w-20 transform items-center justify-center rounded-full transition-all duration-500",
            showCorrectness
              ? resolution.turnPlayerWasCorrect
                ? "scale-100 bg-green-100 dark:bg-green-900/30"
                : "scale-100 bg-red-100 dark:bg-red-900/30"
              : "scale-90 bg-muted opacity-50",
          )}
        >
          {showCorrectness ? (
            resolution.turnPlayerWasCorrect ? (
              <Check className="h-10 w-10 animate-bounce text-green-600 dark:text-green-400" />
            ) : (
              <X className="h-10 w-10 animate-shake text-red-600 dark:text-red-400" />
            )
          ) : (
            <Clock className="h-8 w-8 animate-pulse text-muted-foreground" />
          )}
        </div>
        <div className="space-y-1">
          <p
            className={cn(
              "font-bold text-xl transition-all duration-300",
              showCorrectness
                ? resolution.turnPlayerWasCorrect
                  ? "text-green-600 dark:text-green-400"
                  : "text-red-600 dark:text-red-400"
                : "text-foreground",
            )}
          >
            {showCorrectness
              ? resolution.turnPlayerWasCorrect
                ? t("correct")
                : t("incorrect")
              : t("revealing")}
          </p>
          <p className="text-muted-foreground text-sm">
            {resolution.turnPlayerWasCorrect
              ? t("placementResult", { name: turnPlayer.displayName, result: "in the valid range" })
              : t("placementResult", {
                  name: turnPlayer.displayName,
                  result: "outside the valid range",
                })}
          </p>
        </div>
      </div>

      {showCorrectness && (
        <Card className="fade-in slide-in-from-bottom-2 animate-in p-4 text-center transition-all duration-300">
          <p className="text-muted-foreground text-xs uppercase tracking-wide">{t("theSongWas")}</p>
          <div className="flex items-center justify-between">
            <Label className="font-medium text-lg text-muted-foreground">Title</Label>
            <p className="font-bold text-2xl text-foreground">{track.title}</p>
          </div>
          <div className="flex items-center justify-between">
            <Label className="font-medium text-lg text-muted-foreground">Artist</Label>
            <p className="font-bold text-2xl text-foreground">{track.artist}</p>
          </div>
          <div className="flex items-center justify-between">
            <Label className="font-medium text-lg text-muted-foreground">Year</Label>
            <p className="font-bold text-2xl text-foreground">{track.year}</p>
          </div>
        </Card>
      )}

      {showCorrectness && (
        <div className="fade-in slide-in-from-bottom-4 animate-in space-y-3 transition-all duration-500">
          <div className="flex items-center gap-2 font-medium text-sm">
            <Trophy className="h-4 w-4" />
            <span>Card Awards</span>
          </div>
          <div className="grid gap-2">
            {resolution.awardedPlayerIds.map((playerId) => {
              const player = getPlayerById(playerId)
              if (!player) {
                return null
              }
              const isMe = player._id === me?._id
              return (
                <div
                  className={cn(
                    "flex items-center justify-between rounded-lg border p-3",
                    isMe ? "border-primary/20 bg-primary/5" : "bg-muted/30",
                  )}
                  key={playerId}
                >
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                      <Music className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">
                        {player.displayName}
                        {isMe && <span className="ml-1 text-primary text-xs">(You)</span>}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        Got the card via {playerId === turnPlayer._id ? "placement" : "betting"}
                      </p>
                    </div>
                  </div>
                  <Star className="h-4 w-4 text-green-600 dark:text-green-400" />
                </div>
              )
            })}
            {resolution.awardedPlayerIds.length === 0 && (
              <p className="py-2 text-center text-muted-foreground text-sm">
                No cards were awarded this round
              </p>
            )}
          </div>
        </div>
      )}

      {bettingBets.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 font-medium text-sm">
            <Users className="h-4 w-4" />
            <span>Betting Results</span>
          </div>
          <div className="grid gap-2">
            {bettingBets.map((bet) => {
              const player = getPlayerById(bet.playerId)
              if (!player) {
                return null
              }
              const isMe = player._id === me?._id
              return (
                <div
                  className={cn(
                    "flex items-center justify-between rounded-lg border p-3",
                    bet.status === "won"
                      ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/20"
                      : bet.status === "lost"
                        ? "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/20"
                        : "bg-muted/30",
                    isMe && "ring-2 ring-primary/20",
                  )}
                  key={bet.playerId}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-full",
                        bet.status === "won"
                          ? "bg-green-100 text-green-600 dark:bg-green-900/50 dark:text-green-400"
                          : bet.status === "lost"
                            ? "bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400"
                            : "bg-muted",
                      )}
                    >
                      {bet.status === "won" ? (
                        <Check className="h-4 w-4" />
                      ) : bet.status === "lost" ? (
                        <X className="h-4 w-4" />
                      ) : (
                        <Clock className="h-4 w-4" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">
                        {player.displayName}
                        {isMe && <span className="ml-1 text-primary text-xs">(You)</span>}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        Bet on position {bet.proposedIndex + 1}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p
                      className={cn(
                        "font-medium",
                        bet.status === "won"
                          ? "text-green-600 dark:text-green-400"
                          : bet.status === "lost"
                            ? "text-red-600 dark:text-red-400"
                            : "",
                      )}
                    >
                      {bet.status === "won" ? "Won" : bet.status === "lost" ? "Lost" : "Pending"}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="rounded-lg bg-muted/50 p-3 text-center text-muted-foreground text-sm">
        <div className="flex items-center justify-center gap-2">
          <Clock className="h-4 w-4" />
          <span>Resolved at {formatTime(resolution.resolvedAt)}</span>
        </div>
      </div>

      {isHost && (
        <Button className="w-full" disabled={isResolving} onClick={handleNextRound} size="lg">
          {isResolving ? (
            <>
              <Clock className="mr-2 h-4 w-4 animate-spin" />
              Advancing...
            </>
          ) : (
            <>
              <Trophy className="mr-2 h-4 w-4" />
              Start Next Round
            </>
          )}
        </Button>
      )}

      {!isHost && (
        <div className="rounded-lg bg-muted/50 p-4 text-center">
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4 animate-pulse" />
            <span>Waiting for host to start next round...</span>
          </div>
        </div>
      )}
    </div>
  )
}
