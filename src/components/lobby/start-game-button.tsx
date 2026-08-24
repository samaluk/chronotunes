"use client";

import { useSessionMutation } from "convex-helpers/react/sessions";
import { Play, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

export interface StartGameButtonProps {
  isHost: boolean;
  lobbyId: Id<"lobbies">;
  playerCount: number;
}

export function StartGameButton({
  lobbyId,
  isHost,
  playerCount,
}: StartGameButtonProps): React.ReactNode {
  const t = useTranslations("startGame");

  const router = useRouter();
  const startGame = useSessionMutation(api.games.start);

  const handleStartGame = async (): Promise<void> => {
    try {
      await startGame({ lobbyId });
      toast.success(t("gameStarted"));
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : t("failedToStart");
      toast.error(message);
    }
  };

  if (!isHost) {
    return (
      <div className="rounded-lg bg-muted p-4 text-center">
        <p className="text-muted-foreground">{t("waitingForHost")}</p>
      </div>
    );
  }

  const canStart = playerCount >= 2;

  return (
    <div className="space-y-2">
      <button
        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary px-6 font-medium text-lg text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={!canStart}
        onClick={handleStartGame}
        type="button"
      >
        <Play className="h-5 w-5" />
        {t("startGame")}
      </button>
      {!canStart && (
        <p className="flex items-center justify-center gap-1 text-center text-muted-foreground text-sm">
          <Users className="h-4 w-4" />
          {t("needMorePlayers")}
        </p>
      )}
      {canStart && (
        <p className="text-center text-muted-foreground text-sm">
          {t("playersReady", { count: playerCount })}
        </p>
      )}
    </div>
  );
}
