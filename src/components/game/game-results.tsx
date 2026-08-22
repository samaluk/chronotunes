"use client";

import { useSessionMutation, useSessionQuery } from "convex-helpers/react/sessions";
import { useQuery } from "convex/react";
import { Music, Play, Repeat, Trophy } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { runTrackedMutation } from "@/lib/run-safely";
import { cn } from "@/lib/utils";

interface GameResultsProps {
  code: string;
  lobbyId: Id<"lobbies">;
}

interface ResultsPlayer {
  _id: Id<"players">;
  displayName: string;
  timeline: {
    earnedAtRoundNumber: number;
    earnedBy: string;
    trackId: Id<"tracks">;
    year: number;
  }[];
  timelineSize: number;
}

function ResultsLoading(): React.ReactNode {
  return (
    <div className="flex min-h-100 items-center justify-center">
      <div className="text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-primary border-b-2" />
        <p className="mt-4 text-muted-foreground">Loading game results...</p>
      </div>
    </div>
  );
}

function ResultsNotFound(): React.ReactNode {
  return (
    <div className="flex min-h-100 items-center justify-center">
      <div className="text-center">
        <p className="text-muted-foreground">No game results found</p>
      </div>
    </div>
  );
}

function formatDuration(startTime: number, endTime: number): string {
  const durationMs = endTime - startTime;
  const minutes = Math.floor(durationMs / 60_000);
  const seconds = Math.floor((durationMs % 60_000) / 1000);
  return `${minutes}m ${seconds}s`;
}

const RANK_BADGE_CLASSES = [
  "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
  "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300",
];

const getRankBadgeClass = (rank: number): string =>
  RANK_BADGE_CLASSES[rank] ?? "bg-muted text-muted-foreground";

function WinnerCard({
  meId,
  winner,
}: {
  meId: Id<"players"> | undefined;
  winner: ResultsPlayer;
}): React.ReactNode {
  return (
    <Card className="overflow-hidden border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30">
      <CardContent className="p-8">
        <div className="flex flex-col items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/50">
            <Trophy className="h-8 w-8 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="text-center">
            <p className="text-muted-foreground text-sm uppercase tracking-wider">Winner</p>
            <p className="font-bold text-2xl text-amber-700 dark:text-amber-300">
              {winner.displayName}
              {winner._id === meId && <span className="ml-2 text-sm">(You)</span>}
            </p>
            <p className="mt-1 text-amber-600 text-sm dark:text-amber-400">
              {winner.timelineSize} songs on timeline
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StandingRow({
  index,
  meId,
  player,
}: {
  index: number;
  meId: Id<"players"> | undefined;
  player: ResultsPlayer;
}): React.ReactNode {
  const isMe = player._id === meId;

  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-lg border p-4 transition-all",
        index === 0
          ? "border-amber-200 bg-gradient-to-r from-amber-50 to-yellow-50 dark:border-amber-800 dark:from-amber-950/20 dark:to-yellow-950/20"
          : "bg-muted/30",
        isMe && "ring-2 ring-primary/20",
      )}
      key={player._id}
    >
      <div className="flex items-center gap-4">
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-full font-bold",
            getRankBadgeClass(index),
          )}
        >
          {index + 1}
        </div>
        <div>
          <p className="font-medium">
            {player.displayName}
            {isMe && <span className="ml-2 text-primary text-xs">(You)</span>}
            {index === 0 && <Trophy className="ml-2 inline h-4 w-4 text-amber-500" />}
          </p>
          <p className="text-muted-foreground text-sm">{player.timeline.length} songs collected</p>
        </div>
      </div>
      <div className="text-right">
        <p className="font-bold text-lg">{player.timelineSize}</p>
        <p className="text-muted-foreground text-xs">songs</p>
      </div>
    </div>
  );
}

function StandingsList({
  meId,
  players,
}: {
  meId: Id<"players"> | undefined;
  players: ResultsPlayer[];
}): React.ReactNode {
  const sortedPlayers = [...players].toSorted((a, b) => b.timelineSize - a.timelineSize);

  return (
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
            <StandingRow index={index} key={player._id} meId={meId} player={player} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function SongHistoryRow({
  roundNumber,
  track,
}: {
  roundNumber: number;
  track: { artist?: string; title?: string; year?: number };
}): React.ReactNode {
  return (
    <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-3">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 font-medium text-primary text-sm">
          {roundNumber}
        </div>
        <div>
          <p className="font-medium">{track.title}</p>
          <p className="text-muted-foreground text-sm">{track.artist}</p>
        </div>
      </div>
      <div className="text-right">
        <p className="font-bold text-lg">{track.year}</p>
        <p className="text-muted-foreground text-xs">year</p>
      </div>
    </div>
  );
}

export function GameResults({ lobbyId }: GameResultsProps): React.ReactNode {
  const [isPlayingAgain, setIsPlayingAgain] = useState(false);

  const results = useQuery(api.games.getResults, lobbyId ? { lobbyId } : "skip");
  const me = useSessionQuery(api.players.getMe, lobbyId ? { lobbyId } : "skip");
  const playAgain = useSessionMutation(api.games.playAgain);

  const handlePlayAgain = async (): Promise<void> => {
    await runTrackedMutation({
      errorLabel: "Failed to play again:",
      mutation: () => playAgain({ lobbyId }),
      setLoading: setIsPlayingAgain,
    });
  };

  if (results === undefined) {
    return <ResultsLoading />;
  }

  if (!results) {
    return <ResultsNotFound />;
  }

  const { game, players, rounds } = results;
  const meId = me?._id;
  const winner = [...players].toSorted((a, b) => b.timelineSize - a.timelineSize)[0];
  const songHistory = rounds
    .filter((round) => round.track)
    .toSorted((a, b) => a.roundNumber - b.roundNumber);

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

      {winner && <WinnerCard meId={meId} winner={winner} />}

      <StandingsList meId={meId} players={players} />

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
              {songHistory.map((round) => (
                <SongHistoryRow
                  key={round.roundNumber}
                  roundNumber={round.roundNumber}
                  track={round.track ?? {}}
                />
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
  );
}
