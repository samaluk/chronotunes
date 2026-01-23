"use client";

import { useQuery } from "convex/react";
import type { GenericId } from "convex/values";
import { useSessionId } from "convex-helpers/react/sessions";
import { Coins, Crown, Music, Star, User, UserRound } from "lucide-react";
import { SkeletonPlayersBar } from "@/components/ui/skeletons";
import { api } from "@/convex/_generated/api.js";
import type { Doc } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";

interface PlayersBarProps {
  lobbyId: GenericId<"lobbies">;
  currentSessionId?: string | null;
  highlightPlayerId?: GenericId<"players"> | null;
  onPlayerClick?: (player: Doc<"players">) => void;
}

export function PlayersBar({
  lobbyId,
  currentSessionId: propSessionId,
  highlightPlayerId,
  onPlayerClick,
}: PlayersBarProps): React.ReactNode {
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
          const isHost = player.isHost;
          const isLeader = player.timelineSize === maxTimelineSize && maxTimelineSize > 0;
          const timelineSize = player.timelineSize;
          const coins = player.coins;

          return (
            <button
              key={player._id}
              type="button"
              onClick={() => onPlayerClick?.(player)}
              className={cn(
                "relative flex items-center gap-2.5 px-4 py-2.5 rounded-xl border bg-card min-w-[160px] text-left",
                "transition-all duration-200 hover:shadow-md",
                isTurnPlayer && "ring-2 ring-amber-500 ring-offset-2 dark:ring-offset-background",
                onPlayerClick && "cursor-pointer hover:bg-muted/50",
              )}
            >
              {isTurnPlayer && (
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm animate-in zoom-in">
                  TURN
                </div>
              )}

              <div className="relative">
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full",
                    isCurrentUser ? "bg-primary/20" : "bg-muted",
                  )}
                >
                  {isCurrentUser ? (
                    <UserRound className="h-5 w-5 text-primary" />
                  ) : (
                    <User className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                {isLeader && (
                  <div className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-white">
                    <Crown className="h-2.5 w-2.5" />
                  </div>
                )}
                {isHost && !isLeader && (
                  <div className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-blue-500 text-white">
                    <Star className="h-2.5 w-2.5" />
                  </div>
                )}
                {isCurrentUser && !isHost && !isLeader && (
                  <div className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-white">
                    <User className="h-2.5 w-2.5" />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span
                    className={cn(
                      "text-sm font-semibold truncate",
                      isCurrentUser ? "text-primary" : "text-foreground",
                    )}
                    title={player.displayName}
                  >
                    {player.displayName}
                  </span>
                  {isCurrentUser && (
                    <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-medium">
                      You
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1",
                      timelineSize > 0 && "text-foreground font-medium",
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
