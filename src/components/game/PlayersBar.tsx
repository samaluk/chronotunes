"use client";

import { useQuery } from "convex/react";
import type { GenericId } from "convex/values";
import { useSessionId } from "convex-helpers/react/sessions";
import { User } from "lucide-react";
import { SkeletonPlayersBar } from "@/components/ui/skeletons";
import { api } from "@/convex/_generated/api.js";

interface PlayerStats {
  _id: GenericId<"players">;
  displayName: string;
  coins: number;
  timelineSize: number;
  isHost: boolean;
  sessionId: string;
}

interface PlayersBarProps {
  lobbyId: GenericId<"lobbies">;
  currentSessionId?: string | null;
  highlightPlayerId?: GenericId<"players"> | null;
}

export function PlayersBar({
  lobbyId,
  currentSessionId: propSessionId,
  highlightPlayerId,
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

  const getPlayerById = (playerId: GenericId<"players">): PlayerStats | undefined => {
    return players.find((p) => p._id === playerId) as PlayerStats | undefined;
  };

  return (
    <div className="w-full">
      <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
        {players.map((player) => {
          const isCurrentUser = player.sessionId === currentSessionId;
          const isHighlighted = player._id === highlightPlayerId;
          const playerStats = getPlayerById(player._id);
          const timelineSize = playerStats?.timelineSize ?? 0;
          const coins = player.coins;

          return (
            <div
              key={player._id}
              className={`
                flex items-center gap-2 px-3 py-2 rounded-lg border bg-card min-w-[140px]
                transition-all duration-200
                ${isHighlighted ? "ring-2 ring-primary ring-offset-2 dark:ring-offset-background" : ""}
                ${isCurrentUser ? "border-primary/50" : ""}
              `}
            >
              <div className="relative">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full ${
                    isCurrentUser ? "bg-primary/20" : "bg-muted"
                  }`}
                >
                  <User
                    className={`h-4 w-4 ${isCurrentUser ? "text-primary" : "text-muted-foreground"}`}
                  />
                </div>
                {isCurrentUser && (
                  <span className="absolute -bottom-1 -right-1 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary"></span>
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <span
                    className={`text-sm font-medium truncate ${isCurrentUser ? "text-primary" : ""}`}
                    title={player.displayName}
                  >
                    {player.displayName}
                    {isCurrentUser && <span className="sr-only">(You)</span>}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span
                    className={`inline-flex items-center gap-1 ${timelineSize > 0 ? "text-foreground font-medium" : ""}`}
                  >
                    {timelineSize} <span className="text-[10px]">cards</span>
                  </span>
                  <span>•</span>
                  <span>{coins} coins</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
