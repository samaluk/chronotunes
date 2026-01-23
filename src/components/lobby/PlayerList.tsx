"use client";

import { useQuery } from "convex/react";
import type { GenericId } from "convex/values";
import { useSessionId } from "convex-helpers/react/sessions";
import { Crown, User } from "lucide-react";
import { useTranslations } from "next-intl";
import { SkeletonPlayerList } from "@/components/ui/skeletons";
import { api } from "@/convex/_generated/api";

interface PlayerListProps {
  lobbyId: GenericId<"lobbies">;
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

export function PlayerList({ lobbyId }: PlayerListProps): React.ReactNode {
  const t = useTranslations("players");
  const tCommon = useTranslations("common");
  const [currentSessionId] = useSessionId();

  const players = useQuery(api.players.list, { lobbyId });

  if (players === undefined) {
    return <SkeletonPlayerList count={4} />;
  }

  if (players.length === 0) {
    return <div className="text-center py-8 text-muted-foreground">{t("noPlayers")}</div>;
  }

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold">
        {t("title")} ({players.length})
      </h3>
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
                      <span className="ml-2 text-xs text-muted-foreground">{tCommon("you")}</span>
                    )}
                  </span>
                  {player.isHost && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-xs font-medium">
                      <Crown className="h-3 w-3" />
                      {t("host")}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>{t("coins", { count: player.coins })}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
