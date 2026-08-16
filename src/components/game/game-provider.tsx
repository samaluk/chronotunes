"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

import type { Doc, Id } from "@/convex/_generated/dataModel";

export type RoundPhase = "placing" | "betting" | "resolved";

interface TimelineEntry {
  earnedAtRoundNumber: number;
  earnedBy: "placement" | "bet" | "initial";
  trackId: Id<"tracks">;
  year: number;
}

export interface CurrentRound {
  _creationTime: number;
  _id: Id<"rounds">;
  gameId: Id<"games">;
  guess?: {
    guessedTitle?: string;
    guessedArtist?: string;
    isCorrect: boolean;
    awardedCoin: boolean;
    submittedAt: number;
  };
  phase: RoundPhase;
  placement?: {
    proposedIndex: number;
    submittedAt: number;
  };
  placementPreview?: {
    proposedIndex: number;
    updatedAt: number;
  };
  resolution?: {
    validIndexMin: number;
    validIndexMax: number;
    turnPlayerWasCorrect: boolean;
    awardedPlayerIds: Id<"players">[];
    coinDeltas: {
      playerId: Id<"players">;
      delta: number;
    }[];
    resolvedAt: number;
  };
  roundNumber: number;
  startedAt: number;
  track: {
    trackId: Id<"tracks">;
    title?: string;
    artist?: string;
    year?: number;
    youtubeVideoId?: string;
  };
  turnPlayerId: Id<"players">;
}

export interface RevealedTrack {
  artist: string;
  title: string;
  trackId: Id<"tracks">;
  year: number;
  youtubeVideoId?: string;
}

export interface TrackInfo {
  _id: Id<"tracks">;
  artist?: string;
  title?: string;
  year?: number;
  youtubeVideoId?: string;
}

export interface GameState {
  bettingWindowSeconds: number | undefined;
  currentRound: CurrentRound | null;
  game: Doc<"games"> | null;
  isGameFinished: boolean;
  isMyTurn: boolean;
  lobby: Doc<"lobbies"> | null;
  me: Doc<"players"> | null;
  phase: RoundPhase;
  players: Doc<"players">[];
  revealedTracks: RevealedTrack[];
  selectedPlayerForTimeline: Doc<"players"> | null;
  showLiveBets: boolean;
  track: TrackInfo | null;
  turnPlayer: Doc<"players"> | null;
  turnSeconds: number | undefined;
}

export interface GameActions {
  handleModalClose: () => void;
  setSelectedPlayerForTimeline: (player: Doc<"players"> | null) => void;
}

export interface GameMeta {
  code: string;
  lobbyId: Id<"lobbies">;
  sessionId: string | null;
}

export interface GameContextValue {
  actions: GameActions;
  meta: GameMeta;
  state: GameState;
}

export const GameContext = createContext<GameContextValue | null>(null);

export function useGame(): GameContextValue {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error("useGame must be used within a GameProvider");
  }
  return context;
}

interface GameProviderProps {
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

  const turnPlayer = useMemo(() => {
    if (!currentRound) {
      return null;
    }
    return players.find((p) => p._id === currentRound.turnPlayerId) ?? null;
  }, [players, currentRound]);

  const isMyTurn = useMemo(() => {
    if (!(currentRound && me)) {
      return false;
    }
    return currentRound.turnPlayerId === me._id;
  }, [currentRound, me]);

  const phase = useMemo((): RoundPhase => currentRound?.phase ?? "placing", [currentRound]);

  const track = useMemo((): TrackInfo | null => {
    if (!currentRound?.track) {
      return null;
    }
    const t = currentRound.track;
    return {
      _id: t.trackId,
      artist: t.artist,
      title: t.title,
      year: t.year,
      youtubeVideoId: t.youtubeVideoId,
    };
  }, [currentRound]);

  const isGameFinished = useMemo(() => game?.status === "finished", [game]);

  const handleModalClose = useCallback(() => {
    setSelectedPlayerForTimeline(null);
  }, []);

  const state: GameState = useMemo(
    () => ({
      bettingWindowSeconds: lobby?.settings?.bettingWindowSeconds,
      currentRound,
      game,
      isGameFinished,
      isMyTurn,
      lobby,
      me,
      phase,
      players,
      revealedTracks,
      selectedPlayerForTimeline,
      showLiveBets: lobby?.settings?.showLiveBets ?? false,
      track,
      turnPlayer,
      turnSeconds: lobby?.settings?.turnSeconds,
    }),
    [
      lobby,
      players,
      me,
      game,
      currentRound,
      revealedTracks,
      turnPlayer,
      isMyTurn,
      phase,
      track,
      isGameFinished,
      selectedPlayerForTimeline,
    ],
  );

  const actions: GameActions = useMemo(
    () => ({
      handleModalClose,
      setSelectedPlayerForTimeline,
    }),
    [handleModalClose],
  );

  const meta: GameMeta = useMemo(
    () => ({
      code,
      lobbyId,
      sessionId,
    }),
    [sessionId, lobbyId, code],
  );

  const value: GameContextValue = useMemo(
    () => ({
      actions,
      meta,
      state,
    }),
    [state, actions, meta],
  );

  return <GameContext value={value}>{children}</GameContext>;
}
