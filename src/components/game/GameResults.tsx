"use client";

import { useMutation, useQuery } from "convex/react";
import type { GenericId } from "convex/values";
import { Music, Play, Repeat, Trophy } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/convex/_generated/api";
import { useSessionId } from "@/lib/hooks/use-session-id";
import { cn } from "@/lib/utils";

interface GameResultsProps {
  lobbyId: GenericId<"lobbies">;
  code: string;
}

export function GameResults({ lobbyId, code: _code }: GameResultsProps): React.ReactNode {
  const sessionId = useSessionId();
  const [isPlayingAgain, setIsPlayingAgain] = useState(false);

  const results = useQuery(api.games.getResults, lobbyId ? { lobbyId } : "skip");
  const me = useQuery(api.players.getMe, lobbyId && sessionId ? { lobbyId, sessionId } : "skip");
  const playAgain = useMutation(api.games.playAgain);

  const handlePlayAgain = async () => {
    if (!sessionId) return;
    setIsPlayingAgain(true);
    try {
      await playAgain({ lobbyId, sessionId });
    } catch (error) {
      console.error("Failed to play again:", error);
    } finally {
      setIsPlayingAgain(false);
    }
  };

  if (results === undefined) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading game results...</p>
        </div>
      </div>
    );
  }

  if (!results) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">No game results found</p>
        </div>
      </div>
    );
  }

  const { game, players, rounds } = results;
  const sortedPlayers = [...players].sort((a, b) => b.timelineSize - a.timelineSize);
  const winner = sortedPlayers[0];
  const isWinner = winner?._id === me?._id;

  const formatDuration = (startTime: number, endTime: number): string => {
    const durationMs = endTime - startTime;
    const minutes = Math.floor(durationMs / 60000);
    const seconds = Math.floor((durationMs % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  };

  const songHistory = rounds
    .filter((r) => r.track)
    .sort((a, b) => a.roundNumber - b.roundNumber)
    .map((round) => ({
      roundNumber: round.roundNumber,
      track: round.track!,
    }));

  return (
    <div className="w-full space-y-8">
      <div className="text-center space-y-4">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-yellow-100 to-amber-100 dark:from-yellow-900/30 dark:to-amber-900/30">
          <Trophy className="h-10 w-10 text-amber-600 dark:text-amber-400" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Game Over!</h1>
          <p className="text-muted-foreground mt-2">Congratulations to the winner</p>
        </div>
      </div>

      <Card className="overflow-hidden border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30">
        <CardContent className="p-8">
          <div className="flex flex-col items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/50">
              <Trophy className="h-8 w-8 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground uppercase tracking-wider">Winner</p>
              <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">
                {winner?.displayName}
                {isWinner && <span className="ml-2 text-sm">(You)</span>}
              </p>
              <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">
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
                key={player._id}
                className={cn(
                  "flex items-center justify-between p-4 rounded-lg border transition-all",
                  index === 0
                    ? "bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200 dark:from-amber-950/20 dark:to-yellow-950/20 dark:border-amber-800"
                    : "bg-muted/30",
                  player._id === me?._id && "ring-2 ring-primary/20",
                )}
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
                        <span className="ml-2 text-xs text-primary">(You)</span>
                      )}
                      {index === 0 && <Trophy className="inline ml-2 h-4 w-4 text-amber-500" />}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {player.timeline.length} songs collected
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-lg">{player.timelineSize}</p>
                  <p className="text-xs text-muted-foreground">songs</p>
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
                  key={item.roundNumber}
                  className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-medium text-sm">
                      {item.roundNumber}
                    </div>
                    <div>
                      <p className="font-medium">{item.track.title}</p>
                      <p className="text-sm text-muted-foreground">{item.track.artist}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg">{item.track.year}</p>
                    <p className="text-xs text-muted-foreground">year</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">No songs played</p>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-6 rounded-xl bg-muted/50">
        <div className="text-sm text-muted-foreground">
          <p>Game lasted {game.endedAt ? formatDuration(game.startedAt, game.endedAt) : "N/A"}</p>
          <p>{game.currentRoundNumber} rounds played</p>
        </div>
        <Button onClick={handlePlayAgain} disabled={isPlayingAgain} size="lg">
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
  );
}
