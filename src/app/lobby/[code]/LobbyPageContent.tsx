"use client";

import { useMutation, useQuery } from "convex/react";
import { Copy, LogOut, Music, Share2, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { GameView } from "@/components/game/GameView";
import { PlayerList } from "@/components/lobby/PlayerList";
import { SettingsPanel } from "@/components/lobby/SettingsPanel";
import { StartGameButton } from "@/components/lobby/StartGameButton";
import { api } from "@/convex/_generated/api.js";
import { useSessionId } from "@/lib/hooks/use-session-id";

interface LobbyPageContentProps {
  code: string;
}

export default function LobbyPageContent({ code }: LobbyPageContentProps): React.ReactNode {
  const router = useRouter();
  const sessionId = useSessionId();
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
  const leaveLobby = useMutation(api.lobbies.leave);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && lobby === null && code) {
      toast.error("Lobby not found");
      router.push("/");
    }
  }, [mounted, lobby, code, router]);

  const handleCopyCode = (): void => {
    navigator.clipboard.writeText(code);
    toast.success("Lobby code copied to clipboard");
  };

  const handleShare = async (): Promise<void> => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "ChronoTunes Game",
          text: `Join my ChronoTunes game with code: ${code}`,
          url: window.location.href,
        });
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          handleCopyCode();
        }
      }
    } else {
      handleCopyCode();
    }
  };

  const handleLeaveLobby = async (): Promise<void> => {
    if (!sessionId) return;
    try {
      await leaveLobby({ code, sessionId });
      toast.success("Left lobby");
      router.push("/");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to leave lobby";
      toast.error(message);
    }
  };

  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!code) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-destructive">Invalid lobby code</p>
        </div>
      </div>
    );
  }

  if (lobby === undefined || players === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading lobby...</p>
        </div>
      </div>
    );
  }

  if (lobby === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-destructive">Lobby not found</p>
          <button
            type="button"
            onClick={() => router.push("/")}
            className="mt-4 inline-flex items-center justify-center h-10 px-4 rounded-md bg-primary text-primary-foreground font-medium transition-colors hover:bg-primary/90"
          >
            Return Home
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
                <h1 className="text-xl font-bold">ChronoTunes</h1>
                <p className="text-sm text-muted-foreground">Music Timeline Game</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleShare}
                className="inline-flex items-center justify-center h-9 px-3 rounded-md border border-input bg-background font-medium transition-colors hover:bg-accent"
              >
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </button>
              <button
                type="button"
                onClick={handleLeaveLobby}
                className="inline-flex items-center justify-center h-9 px-3 rounded-md border border-input bg-background font-medium text-destructive transition-colors hover:bg-accent hover:text-destructive"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Leave
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 rounded-xl bg-primary/5 border">
            <div>
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                Lobby Code
              </p>
              <div className="flex items-center gap-3 mt-1">
                <code className="text-4xl font-mono font-bold tracking-widest">{code}</code>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyCode}
                className="inline-flex items-center justify-center h-10 px-4 rounded-md bg-secondary font-medium transition-colors hover:bg-secondary/80"
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy Code
              </button>
            </div>
          </div>

          {isInGame ? (
            <GameView lobbyId={lobby._id} code={code} />
          ) : (
            <div className="grid gap-8 md:grid-cols-2">
              <div className="space-y-6">
                <PlayerList lobbyId={lobby._id} currentSessionId={sessionId} />
                <StartGameButton lobbyId={lobby._id} isHost={isHost} playerCount={players.length} />
              </div>
              <div className="space-y-6">
                <SettingsPanel
                  lobbyId={lobby._id}
                  isHost={isHost}
                  currentSettings={lobby.settings}
                />
              </div>
            </div>
          )}

          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>
              {players.length} {players.length === 1 ? "player" : "players"} in lobby
            </span>
          </div>
        </div>
      </main>
    </div>
  );
}
