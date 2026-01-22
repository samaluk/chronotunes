"use client";

import type { GenericId } from "convex/values";
import { useSessionMutation } from "convex-helpers/react/sessions";
import { Check, Clock, Music, Star, Trophy, Users, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";

interface TimelineEntry {
  trackId: GenericId<"tracks">;
  year: number;
  earnedAtRoundNumber: number;
  earnedBy: "placement" | "bet";
}

interface Player {
  _id: GenericId<"players">;
  displayName: string;
  timeline: TimelineEntry[];
  timelineSize: number;
  coins: number;
  isHost: boolean;
  sessionId: string;
}

interface TrackInfo {
  _id: GenericId<"tracks">;
  title: string;
  artist: string;
  year: number;
}

interface RoundResolution {
  validIndexMin: number;
  validIndexMax: number;
  turnPlayerWasCorrect: boolean;
  awardedPlayerIds: GenericId<"players">[];
  coinDeltas: Array<{
    playerId: GenericId<"players">;
    delta: number;
  }>;
  resolvedAt: number;
}

interface BetWithPlayer {
  playerId: GenericId<"players">;
  playerDisplayName: string;
  proposedIndex: number;
  status: "pending" | "won" | "lost";
}

interface RoundResultsProps {
  lobbyId: Id<"lobbies">;
  track: TrackInfo;
  resolution: RoundResolution;
  turnPlayer: Doc<"players">;
  bets: BetWithPlayer[];
  players: Doc<"players">[];
  me: Doc<"players"> | null;
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
  const [isResolving, setIsResolving] = useState(false);

  const resolveAndNext = useSessionMutation(api.games.resolveAndNext);
  const isHost = me?._id === turnPlayer._id || players.find((p) => p._id === me?._id)?.isHost;

  const handleNextRound = async () => {
    setIsResolving(true);
    try {
      await resolveAndNext({ lobbyId });
    } catch (error) {
      console.error("Failed to advance to next round:", error);
    } finally {
      setIsResolving(false);
    }
  };

  const getPlayerById = (playerId: GenericId<"players">): Player | undefined => {
    return players.find((p) => p._id === playerId) as Player | undefined;
  };

  const getBetForPlayer = (playerId: GenericId<"players">): BetWithPlayer | undefined => {
    return bets.find((b) => b.playerId === playerId);
  };

  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const turnPlayerBet = getBetForPlayer(turnPlayer._id);
  const _didTurnPlayerWinCard = resolution.turnPlayerWasCorrect || turnPlayerBet?.status === "won";

  return (
    <div className="space-y-6">
      <div className="text-center space-y-4">
        <div
          className={cn(
            "mx-auto flex h-16 w-16 items-center justify-center rounded-full",
            resolution.turnPlayerWasCorrect
              ? "bg-green-100 dark:bg-green-900/30"
              : "bg-red-100 dark:bg-red-900/30",
          )}
        >
          {resolution.turnPlayerWasCorrect ? (
            <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
          ) : (
            <X className="h-8 w-8 text-red-600 dark:text-red-400" />
          )}
        </div>
        <div>
          <p className="text-lg font-medium">
            {resolution.turnPlayerWasCorrect ? "Placement Correct!" : "Placement Incorrect"}
          </p>
          <p className="text-sm text-muted-foreground">
            {turnPlayer.displayName} placed the song{" "}
            {resolution.turnPlayerWasCorrect ? "in the valid range" : "outside the valid range"}
          </p>
        </div>
      </div>

      <div className="rounded-lg bg-card border p-4 text-center">
        <p className="text-sm text-muted-foreground">The song was</p>
        <p className="text-xl font-bold mt-1">
          {track.title} - {track.artist}
        </p>
        <p className="text-lg text-primary font-medium">{track.year}</p>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Trophy className="h-4 w-4" />
          <span>Card Awards</span>
        </div>
        <div className="grid gap-2">
          {resolution.awardedPlayerIds.map((playerId) => {
            const player = getPlayerById(playerId);
            if (!player) return null;
            const isMe = player._id === me?._id;
            return (
              <div
                key={playerId}
                className={cn(
                  "flex items-center justify-between p-3 rounded-lg border",
                  isMe ? "bg-primary/5 border-primary/20" : "bg-muted/30",
                )}
              >
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                    <Music className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">
                      {player.displayName}
                      {isMe && <span className="ml-1 text-xs text-primary">(You)</span>}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Got the card via {playerId === turnPlayer._id ? "placement" : "betting"}
                    </p>
                  </div>
                </div>
                <Star className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
            );
          })}
          {resolution.awardedPlayerIds.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-2">
              No cards were awarded this round
            </p>
          )}
        </div>
      </div>

      {bets.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Users className="h-4 w-4" />
            <span>Betting Results</span>
          </div>
          <div className="grid gap-2">
            {bets.map((bet) => {
              const player = getPlayerById(bet.playerId);
              if (!player) return null;
              const isMe = player._id === me?._id;
              return (
                <div
                  key={bet.playerId}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-lg border",
                    bet.status === "won"
                      ? "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800"
                      : bet.status === "lost"
                        ? "bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800"
                        : "bg-muted/30",
                    isMe && "ring-2 ring-primary/20",
                  )}
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
                        {isMe && <span className="ml-1 text-xs text-primary">(You)</span>}
                      </p>
                      <p className="text-xs text-muted-foreground">
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
              );
            })}
          </div>
        </div>
      )}

      <div className="rounded-lg bg-muted/50 p-3 text-center text-sm text-muted-foreground">
        <div className="flex items-center justify-center gap-2">
          <Clock className="h-4 w-4" />
          <span>Resolved at {formatTime(resolution.resolvedAt)}</span>
        </div>
      </div>

      {isHost && (
        <Button onClick={handleNextRound} disabled={isResolving} className="w-full" size="lg">
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
  );
}
