"use client";

import { useMutation } from "convex/react";
import type { GenericId } from "convex/values";
import { Play, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api.js";

interface StartGameButtonProps {
  lobbyId: GenericId<"lobbies">;
  isHost: boolean;
  playerCount: number;
}

export function StartGameButton({
  lobbyId,
  isHost,
  playerCount,
}: StartGameButtonProps): React.ReactNode {
  const router = useRouter();
  const startGame = useMutation(api.games.start);

  const handleStartGame = async (): Promise<void> => {
    try {
      const _result = await startGame({ lobbyId });
      toast.success("Game started!");
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to start game";
      toast.error(message);
    }
  };

  if (!isHost) {
    return (
      <div className="p-4 rounded-lg bg-muted text-center">
        <p className="text-muted-foreground">Waiting for host to start the game...</p>
      </div>
    );
  }

  const canStart = playerCount >= 2;

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleStartGame}
        disabled={!canStart}
        className="w-full inline-flex items-center justify-center gap-2 h-12 px-6 rounded-full bg-primary text-primary-foreground font-medium text-lg transition-colors hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Play className="h-5 w-5" />
        Start Game
      </button>
      {!canStart && (
        <p className="text-sm text-muted-foreground text-center flex items-center justify-center gap-1">
          <Users className="h-4 w-4" />
          Need at least 2 players to start
        </p>
      )}
      {canStart && (
        <p className="text-sm text-muted-foreground text-center">
          {playerCount} {playerCount === 1 ? "player" : "players"} ready
        </p>
      )}
    </div>
  );
}
