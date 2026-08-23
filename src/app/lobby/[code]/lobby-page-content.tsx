"use client";

import { useSessionId, useSessionMutation } from "convex-helpers/react/sessions";
import { useQuery } from "convex/react";
import { Copy, LogOut, Music, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { GameView } from "@/components/game/game-view";
import { PlayerList } from "@/components/lobby/player-list";
import { SettingsPanel } from "@/components/lobby/settings-panel";
import { StartGameButton } from "@/components/lobby/start-game-button";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { LocaleSwitcher } from "@/components/ui/locale-switcher";
import { SkeletonLobbyCode, SkeletonPlayerList } from "@/components/ui/skeletons";
import { api } from "@/convex/_generated/api";

export interface LobbyPageContentProps {
  code: string;
}

export function LobbyPageContent({ code }: LobbyPageContentProps): React.ReactNode {
  const t = useTranslations("lobby");
  const tCommon = useTranslations("common");

  const router = useRouter();
  const [sessionId] = useSessionId();

  const lobby = useQuery(api.lobbies.get, code ? { code } : "skip");
  const players = useQuery(api.players.list, lobby?._id ? { lobbyId: lobby._id } : "skip");
  const me = useQuery(
    api.players.getMe,
    lobby?._id && sessionId ? { lobbyId: lobby._id, sessionId } : "skip",
  );
  const leaveLobby = useSessionMutation(api.lobbies.leave);

  const handleCopyCode = (): void => {
    void navigator.clipboard.writeText(code);
    toast.success(tCommon("copied"), { description: t("copiedToClipboard") });
  };

  const handleLeaveLobby = async (): Promise<void> => {
    if (!sessionId) {
      return;
    }
    try {
      await leaveLobby({ code });
      toast.success(t("leftLobby"));
      router.push("/");
    } catch (error) {
      const message = error instanceof Error ? error.message : t("failedToLeave");
      toast.error(message);
    }
  };

  if (!code) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-destructive">{t("invalidLobbyCode")}</p>
        </div>
      </div>
    );
  }

  if (lobby === undefined || players === undefined) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <header className="border-b bg-card">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Music className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h1 className="font-bold text-xl">{t("title")}</h1>
                  <p className="text-muted-foreground text-sm">{t("subtitle")}</p>
                </div>
              </div>
            </div>
          </div>
        </header>
        <main className="container mx-auto flex-1 px-4 py-8">
          <div className="mx-auto max-w-4xl space-y-8">
            <SkeletonLobbyCode />
            <SkeletonPlayerList count={4} />
          </div>
        </main>
      </div>
    );
  }

  if (lobby === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-destructive">{t("lobbyNotFound")}</p>
          <button
            className="mt-4 inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            onClick={() => router.push("/")}
            type="button"
          >
            {t("returnHome")}
          </button>
        </div>
      </div>
    );
  }

  const isHost = me?.isHost ?? false;
  const isInGame = lobby.status === "in_game";

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Music className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="font-bold text-xl">{t("title")}</h1>
                <p className="text-muted-foreground text-sm">{t("subtitle")}</p>
              </div>
            </div>
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
              <button
                aria-label={t("leave")}
                className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-3 font-medium text-destructive transition-colors hover:bg-accent hover:text-destructive"
                onClick={() => void handleLeaveLobby()}
                type="button"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto flex-1 px-4 py-8">
        <div className="mx-auto max-w-4xl space-y-8">
          {isInGame ? (
            <ErrorBoundary>
              <GameView code={code} lobbyId={lobby._id} />
            </ErrorBoundary>
          ) : (
            <div className="grid gap-8 md:grid-cols-2">
              <div className="space-y-6">
                <ErrorBoundary>
                  <PlayerList lobbyId={lobby._id} />
                </ErrorBoundary>
                <StartGameButton isHost={isHost} lobbyId={lobby._id} playerCount={players.length} />
              </div>
              <div className="space-y-6">
                <SettingsPanel code={code} currentSettings={lobby.settings} isHost={isHost} />
              </div>
            </div>
          )}

          <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm">
            <Users className="h-4 w-4" />
            <span>{t("playersInLobby", { count: players.length })}</span>
          </div>
        </div>
      </main>
    </div>
  );
}
