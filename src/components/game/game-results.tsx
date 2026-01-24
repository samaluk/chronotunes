"use client"

import { useQuery } from "convex/react"
import { useSessionMutation, useSessionQuery } from "convex-helpers/react/sessions"
import { Music, Play, Repeat, Trophy } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { cn } from "@/lib/utils"

interface GameResultsProps {
  lobbyId: Id<"lobbies">
  code: string
}

export function GameResults({ lobbyId, code: _code }: GameResultsProps): React.ReactNode {
  const [isPlayingAgain, setIsPlayingAgain] = useState(false)

  const results = useQuery(api.games.getResults, lobbyId ? { lobbyId } : "skip")
  const me = useSessionQuery(api.players.getMe, lobbyId ? { lobbyId } : "skip")
  const playAgain = useSessionMutation(api.games.playAgain)

  const handlePlayAgain = async () => {
    setIsPlayingAgain(true)
    try {
      await playAgain({ lobbyId })
    } catch (error) {
      console.error("Failed to play again:", error)
    } finally {
      setIsPlayingAgain(false)
    }
  }

  if (results === undefined) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-primary border-b-2" />
          <p className="mt-4 text-muted-foreground">Loading game results...</p>
        </div>
      </div>
    )
  }

  if (!results) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">No game results found</p>
        </div>
      </div>
    )
  }

  const { game, players, rounds } = results
  const sortedPlayers = [...players].sort((a, b) => b.timelineSize - a.timelineSize)
  const winner = sortedPlayers[0]
  const isWinner = winner?._id === me?._id

  const formatDuration = (startTime: number, endTime: number): string => {
    const durationMs = endTime - startTime
    const minutes = Math.floor(durationMs / 60_000)
    const seconds = Math.floor((durationMs % 60_000) / 1000)
    return `${minutes}m ${seconds}s`
  }

  const songHistory = rounds
    .filter((r) => r.track)
    .sort((a, b) => a.roundNumber - b.roundNumber)
    .map((round) => ({
      roundNumber: round.roundNumber,
      track: round.track!,
    }))

  return (
    <div className="w-full space-y-8">
      <div className="space-y-4 text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-yellow-100 to-amber-100 dark:from-yellow-900/30 dark:to-amber-900/30">
          <Trophy className="h-10 w-10 text-amber-600 dark:text-amber-400" />
        </div>
        <div>
          <h1 className="font-bold text-3xl">Game Over!</h1>
          <p className="mt-2 text-muted-foreground">Congratulations to the winner</p>
        </div>
      </div>

      <Card className="overflow-hidden border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30">
        <CardContent className="p-8">
          <div className="flex flex-col items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/50">
              <Trophy className="h-8 w-8 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="text-center">
              <p className="text-muted-foreground text-sm uppercase tracking-wider">Winner</p>
              <p className="font-bold text-2xl text-amber-700 dark:text-amber-300">
                {winner?.displayName}
                {isWinner && <span className="ml-2 text-sm">(You)</span>}
              </p>
              <p className="mt-1 text-amber-600 text-sm dark:text-amber-400">
                {winner?.timelineSize} songs on timeline
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Final Standings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {sortedPlayers.map((player, index) => (
              <div
                className={cn(
                  "flex items-center justify-between rounded-lg border p-4 transition-all",
                  index === 0
                    ? "border-amber-200 bg-gradient-to-r from-amber-50 to-yellow-50 dark:border-amber-800 dark:from-amber-950/20 dark:to-yellow-950/20"
                    : "bg-muted/30",
                  player._id === me?._id && "ring-2 ring-primary/20",
                )}
                key={player._id}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-full font-bold",
                      index === 0
                        ? "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300"
                        : index === 1
                          ? "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                          : index === 2
                            ? "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300"
                            : "bg-muted text-muted-foreground",
                    )}
                  >
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium">
                      {player.displayName}
                      {player._id === me?._id && (
                        <span className="ml-2 text-primary text-xs">(You)</span>
                      )}
                      {index === 0 && <Trophy className="ml-2 inline h-4 w-4 text-amber-500" />}
                    </p>
                    <p className="text-muted-foreground text-sm">
                      {player.timeline.length} songs collected
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-lg">{player.timelineSize}</p>
                  <p className="text-muted-foreground text-xs">songs</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Music className="h-5 w-5" />
            Song History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {songHistory.length > 0 ? (
            <div className="space-y-3">
              {songHistory.map((item) => (
                <div
                  className="flex items-center justify-between rounded-lg border bg-muted/30 p-3"
                  key={item.roundNumber}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 font-medium text-primary text-sm">
                      {item.roundNumber}
                    </div>
                    <div>
                      <p className="font-medium">{item.track.title}</p>
                      <p className="text-muted-foreground text-sm">{item.track.artist}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg">{item.track.year}</p>
                    <p className="text-muted-foreground text-xs">year</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-8 text-center text-muted-foreground">No songs played</p>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-col items-center justify-between gap-4 rounded-xl bg-muted/50 p-6 sm:flex-row">
        <div className="text-muted-foreground text-sm">
          <p>Game lasted {game.endedAt ? formatDuration(game.startedAt, game.endedAt) : "N/A"}</p>
          <p>{game.currentRoundNumber} rounds played</p>
        </div>
        <Button disabled={isPlayingAgain} onClick={handlePlayAgain} size="lg">
          {isPlayingAgain ? (
            <>
              <Repeat className="mr-2 h-4 w-4 animate-spin" />
              Starting new game...
            </>
          ) : (
            <>
              <Play className="mr-2 h-4 w-4" />
              Play Again
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
