"use client";

import { useTranslations } from "next-intl";
import { Users } from "lucide-react";
import type { ReactNode } from "react";

import { GameView } from "@/components/game/game-view";
import { PlayerList } from "@/components/lobby/player-list";
import { SettingsPanel } from "@/components/lobby/settings-panel";
import { StartGameButton } from "@/components/lobby/start-game-button";
import type { LobbySettings } from "@/components/settings/lobby-settings";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import type { Doc } from "@/convex/_generated/dataModel";

export interface LobbyRoomProps {
  code: string;
  isInGame: boolean;
  isHost: boolean;
  lobbyId: Doc<"lobbies">["_id"];
  playerCount: number;
  settings: LobbySettings;
}

export function LobbyRoom({
  code,
  isInGame,
  isHost,
  lobbyId,
  playerCount,
  settings,
}: LobbyRoomProps): ReactNode {
  const t = useTranslations("lobby");

  return (
    <main className="container mx-auto flex-1 px-4 py-8">
      <div className="mx-auto max-w-4xl space-y-8">
        {isInGame ? (
          <ErrorBoundary>
            <GameView code={code} lobbyId={lobbyId} />
          </ErrorBoundary>
        ) : (
          <div className="grid gap-8 md:grid-cols-2">
            <div className="space-y-6">
              <ErrorBoundary>
                <PlayerList lobbyId={lobbyId} />
              </ErrorBoundary>
              <StartGameButton isHost={isHost} lobbyId={lobbyId} playerCount={playerCount} />
            </div>
            <div className="space-y-6">
              <SettingsPanel code={code} currentSettings={settings} isHost={isHost} />
            </div>
          </div>
        )}

        <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm">
          <Users className="h-4 w-4" />
          <span>{t("playersInLobby", { count: playerCount })}</span>
        </div>
      </div>
    </main>
  );
}
