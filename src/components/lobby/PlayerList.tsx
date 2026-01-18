"use client";

import { useQuery } from "convex/react";
import type { GenericId } from "convex/values";
import { Crown, User } from "lucide-react";
import { api } from "@/convex/_generated/api.js";

interface PlayerListProps {
  lobbyId: GenericId<"lobbies">;
  currentSessionId: string | null;
}

interface Player {
  _id: GenericId<"players">;
  _creationTime: number;
  displayName: string;
  isHost: boolean;
  coins: number;
  sessionId: string;
  lobbyId: GenericId<"lobbies">;
}

export function PlayerList({ lobbyId, currentSessionId }: PlayerListProps): React.ReactNode {
  const players = useQuery(api.players.list, { lobbyId });

  if (players === undefined) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (players.length === 0) {
    return <div className="text-center py-8 text-muted-foreground">No players in lobby yet</div>;
  }

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold">Players ({players.length})</h3>
      <div className="grid gap-2">
        {players.map((player: Player) => {
          const isCurrentUser = player.sessionId === currentSessionId;
          return (
            <div
              key={player._id}
              className="flex items-center gap-3 p-3 rounded-lg bg-card border transition-colors"
            >
              <div className="relative">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate">
                    {player.displayName}
                    {isCurrentUser && (
                      <span className="ml-2 text-xs text-muted-foreground">(You)</span>
                    )}
                  </span>
                  {player.isHost && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-xs font-medium">
                      <Crown className="h-3 w-3" />
                      Host
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>{player.coins} coins</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
