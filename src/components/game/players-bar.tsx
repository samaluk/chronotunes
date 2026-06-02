"use client";

import { useSessionId } from "convex-helpers/react/sessions";
import { useQuery } from "convex/react";
import { Coins, Crown, Music, Star, User, UserRound } from "lucide-react";
import { memo } from "react";

import { SkeletonPlayersBar } from "@/components/ui/skeletons";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";

interface PlayersBarProps {
  currentSessionId?: string | null;
  highlightPlayerId?: Id<"players"> | null;
  lobbyId: Id<"lobbies">;
  onPlayerClick?: (player: Doc<"players">) => void;
}

export const PlayersBar = memo(
  ({
    lobbyId,
    currentSessionId: propSessionId,
    highlightPlayerId,
    onPlayerClick,
  }: PlayersBarProps): React.ReactNode => {
    const [hookSessionId] = useSessionId();
    const currentSessionId = propSessionId ?? hookSessionId ?? null;
    const players = useQuery(api.players.list, { lobbyId });

    if (players === undefined) {
      return <SkeletonPlayersBar count={4} />;
    }

    if (players.length === 0) {
      return null;
    }

    const maxTimelineSize = Math.max(...players.map((p) => p.timelineSize));

    return (
      <div className="w-full">
        <div className="flex flex-wrap justify-center gap-3">
          {players.map((player) => {
            const isCurrentUser = player.sessionId === currentSessionId;
            const isTurnPlayer = player._id === highlightPlayerId;
            const { isHost } = player;
            const isLeader =
              player.timelineSize === maxTimelineSize && maxTimelineSize > 0;
            const { timelineSize } = player;
            const { coins } = player;

            return (
              <button
                className={cn(
                  "relative flex min-w-[160px] items-center gap-2.5 rounded-xl border bg-card px-4 py-2.5 text-left",
                  "transition-all duration-200 hover:shadow-md",
                  isTurnPlayer &&
                    "ring-2 ring-amber-500 ring-offset-2 dark:ring-offset-background",
                  onPlayerClick && "cursor-pointer hover:bg-muted/50"
                )}
                key={player._id}
                onClick={() => onPlayerClick?.(player)}
                type="button"
              >
                {isTurnPlayer && (
                  <div className="zoom-in absolute -top-2 left-1/2 -translate-x-1/2 animate-in rounded-full bg-amber-500 px-2 py-0.5 font-bold text-[10px] text-white shadow-sm">
                    TURN
                  </div>
                )}

                <div className="relative">
                  <div
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-full",
                      isCurrentUser ? "bg-primary/20" : "bg-muted"
                    )}
                  >
                    {isCurrentUser ? (
                      <UserRound className="h-5 w-5 text-primary" />
                    ) : (
                      <User className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  {isLeader && (
                    <div className="absolute -right-1 -bottom-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-white">
                      <Crown className="h-2.5 w-2.5" />
                    </div>
                  )}
                  {isHost && !isLeader && (
                    <div className="absolute -right-1 -bottom-1 flex h-4 w-4 items-center justify-center rounded-full bg-blue-500 text-white">
                      <Star className="h-2.5 w-2.5" />
                    </div>
                  )}
                  {isCurrentUser && !isHost && !isLeader && (
                    <div className="absolute -right-1 -bottom-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-white">
                      <User className="h-2.5 w-2.5" />
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={cn(
                        "truncate font-semibold text-sm",
                        isCurrentUser ? "text-primary" : "text-foreground"
                      )}
                      title={player.displayName}
                    >
                      {player.displayName}
                    </span>
                    {isCurrentUser && (
                      <span className="rounded bg-primary/10 px-1.5 py-0.5 font-medium text-[10px] text-primary">
                        You
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 text-muted-foreground text-xs">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1",
                        timelineSize > 0 && "font-medium text-foreground"
                      )}
                    >
                      <Music className="h-3 w-3" />
                      {timelineSize}
                    </span>
                    <span>•</span>
                    <span className="inline-flex items-center gap-1">
                      <Coins className="h-3 w-3 text-amber-500" />
                      {coins}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }
);
