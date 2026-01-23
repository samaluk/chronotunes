"use client";

import { useQuery } from "convex/react";
import { useSessionId, useSessionMutation } from "convex-helpers/react/sessions";
import { Copy, LogOut, Music, Share2, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { GameView } from "@/components/game/GameView";
import { PlayerList } from "@/components/lobby/PlayerList";
import { SettingsPanel } from "@/components/lobby/SettingsPanel";
import { StartGameButton } from "@/components/lobby/StartGameButton";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { LocaleSwitcher } from "@/components/ui/locale-switcher";
import { SkeletonLobbyCode, SkeletonPage, SkeletonPlayerList } from "@/components/ui/skeletons";
import { api } from "@/convex/_generated/api.js";

interface LobbyPageContentProps {
  code: string;
}

export function LobbyPageContent({ code }: LobbyPageContentProps): React.ReactNode {
  const t = useTranslations("lobby");
  const tCommon = useTranslations("common");

  const router = useRouter();
  const [sessionId] = useSessionId();
  const [mounted, setMounted] = useState(false);

  const lobby = useQuery(api.lobbies.get, mounted && code ? { code } : "skip");
  const players = useQuery(
    api.players.list,
    mounted && lobby?._id ? { lobbyId: lobby._id } : "skip",
  );
  const me = useQuery(
    api.players.getMe,
    mounted && lobby?._id && sessionId ? { lobbyId: lobby._id, sessionId } : "skip",
  );
  const leaveLobby = useSessionMutation(api.lobbies.leave);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && lobby === null && code) {
      toast.error(t("lobbyNotFound"));
      router.push("/");
    }
  }, [mounted, lobby, code, router, t]);

  const handleCopyCode = (): void => {
    navigator.clipboard.writeText(code);
    toast.success(tCommon("copied"), { description: t("copiedToClipboard") });
  };

  const handleLeaveLobby = async (): Promise<void> => {
    if (!sessionId) return;
    try {
      await leaveLobby({ code });
      toast.success(t("leftLobby"));
      router.push("/");
    } catch (error) {
      const message = error instanceof Error ? error.message : t("failedToLeave");
      toast.error(message);
    }
  };

  if (!mounted) {
    return <SkeletonPage />;
  }

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
                  <h1 className="text-xl font-bold">{t("title")}</h1>
                  <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
                </div>
              </div>
            </div>
          </div>
        </header>
        <main className="flex-1 container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto space-y-8">
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
            type="button"
            onClick={() => router.push("/")}
            className="mt-4 inline-flex items-center justify-center h-10 px-4 rounded-md bg-primary text-primary-foreground font-medium transition-colors hover:bg-primary/90"
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
                <h1 className="text-xl font-bold">{t("title")}</h1>
                <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted/50">
                <code className="text-lg font-mono font-bold tracking-widest">{code}</code>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-background transition-colors"
                  title={t("copyCode")}
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
              <LocaleSwitcher />
              <button
                type="button"
                onClick={handleLeaveLobby}
                className="inline-flex items-center justify-center h-9 px-3 rounded-md border border-input bg-background font-medium text-destructive transition-colors hover:bg-accent hover:text-destructive"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {isInGame ? (
            <ErrorBoundary>
              <GameView lobbyId={lobby._id} code={code} />
            </ErrorBoundary>
          ) : (
            <div className="grid gap-8 md:grid-cols-2">
              <div className="space-y-6">
                <ErrorBoundary>
                  <PlayerList lobbyId={lobby._id} />
                </ErrorBoundary>
                <StartGameButton lobbyId={lobby._id} isHost={isHost} playerCount={players.length} />
              </div>
              <div className="space-y-6">
                <SettingsPanel code={code} isHost={isHost} currentSettings={lobby.settings} />
              </div>
            </div>
          )}

          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>{t("playersInLobby", { count: players.length })}</span>
          </div>
        </div>
      </main>
    </div>
  );
}
