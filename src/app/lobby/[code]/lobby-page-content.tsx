"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

import { Copy } from "lucide-react";

import { CenteredMessage } from "@/components/lobby/centered-message";
import { LeaveButton } from "@/components/lobby/leave-button";
import { LobbyHeader } from "@/components/lobby/lobby-header";
import { LobbyLoadingScreen } from "@/components/lobby/lobby-loading-screen";
import { LobbyNotFoundScreen } from "@/components/lobby/lobby-not-found-screen";
import { LobbyRoom } from "@/components/lobby/lobby-room";
import { useLobbyRoom } from "@/components/lobby/use-lobby-room";
import { LocaleSwitcher } from "@/components/ui/locale-switcher";

export interface LobbyPageContentProps {
  code: string;
}

export function LobbyPageContent({ code }: LobbyPageContentProps): ReactNode {
  const t = useTranslations("lobby");
  const router = useRouter();

  const { handleCopyCode, handleLeaveLobby, lobby, me, players } = useLobbyRoom(code);

  if (!code) {
    return (
      <CenteredMessage>
        <p className="text-destructive">{t("invalidLobbyCode")}</p>
      </CenteredMessage>
    );
  }

  if (lobby === undefined || players === undefined) {
    return <LobbyLoadingScreen />;
  }

  if (lobby === null || players === null) {
    return <LobbyNotFoundScreen onReturnHome={() => router.push("/")} />;
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <LobbyHeader subtitle={t("subtitle")} title={t("title")} />
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-1.5">
                <code className="font-bold font-mono text-lg tracking-widest">{code}</code>
                <button
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors hover:bg-background"
                  onClick={handleCopyCode}
                  title={t("copyCode")}
                  type="button"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
              <LocaleSwitcher />
              <LeaveButton label={t("leave")} onLeave={() => void handleLeaveLobby()} />
            </div>
          </div>
        </div>
      </header>

      <LobbyRoom
        code={code}
        isInGame={lobby.status === "in_game"}
        isHost={me?.isHost ?? false}
        lobbyId={lobby._id}
        playerCount={players.length}
        settings={lobby.settings}
      />
    </div>
  );
}
