"use client";

import { useState } from "react";

import type { Doc, Id } from "@/convex/_generated/dataModel";
import type { RevealedTrack } from "./betting-types";
import type { CurrentRound, GameActions, GameMeta, GameState } from "./game-context";
import { deriveRoundState, GameContext } from "./game-context";

export interface GameProviderProps {
  children: React.ReactNode;
  code: string;
  currentRound: CurrentRound | null;
  game: Doc<"games"> | null;
  lobby: Doc<"lobbies"> | null;
  lobbyId: Id<"lobbies">;
  me: Doc<"players"> | null;
  players: Doc<"players">[];
  revealedTracks: RevealedTrack[];
  sessionId: string | null;
}

export function GameProvider({
  children,
  lobbyId,
  code,
  lobby,
  players,
  me,
  game,
  currentRound,
  revealedTracks,
  sessionId,
}: Readonly<GameProviderProps>): React.ReactNode {
  const [selectedPlayerForTimeline, setSelectedPlayerForTimeline] = useState<Doc<"players"> | null>(
    null,
  );

  const derived = deriveRoundState({ currentRound, game, me, players });

  const handleModalClose = (): void => {
    setSelectedPlayerForTimeline(null);
  };

  const state: GameState = {
    bettingWindowSeconds: lobby?.settings?.bettingWindowSeconds,
    currentRound,
    game,
    isGameFinished: derived.isGameFinished,
    isMyTurn: derived.isMyTurn,
    lobby,
    me,
    phase: derived.phase,
    players,
    revealedTracks,
    selectedPlayerForTimeline,
    showLiveBets: lobby?.settings?.showLiveBets ?? false,
    track: derived.track,
    turnPlayer: derived.turnPlayer,
    turnSeconds: lobby?.settings?.turnSeconds,
  };

  const actions: GameActions = {
    handleModalClose,
    setSelectedPlayerForTimeline,
  };

  const meta: GameMeta = { code, lobbyId, sessionId };

  const value = { actions, meta, state };

  return <GameContext value={value}>{children}</GameContext>;
}
