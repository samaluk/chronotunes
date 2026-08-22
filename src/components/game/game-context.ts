"use client";

import { createContext, useContext } from "react";

import type { Doc, Id } from "@/convex/_generated/dataModel";
import type {
  RoundGuess,
  RoundPlacement,
  RoundPlacementPreview,
  RoundResolution,
} from "@/lib/game-rounds";
import type { RevealedTrack, TrackInfo } from "./betting-types";

export type RoundPhase = "placing" | "betting" | "resolved";

export interface CurrentRound {
  _creationTime: number;
  _id: Id<"rounds">;
  gameId: Id<"games">;
  guess?: RoundGuess;
  phase: RoundPhase;
  placement?: RoundPlacement;
  placementPreview?: RoundPlacementPreview;
  resolution?: RoundResolution;
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

/** Round-derived values the provider computes from its raw props. */
export interface DerivedRoundState {
  isGameFinished: boolean;
  isMyTurn: boolean;
  phase: RoundPhase;
  track: TrackInfo | null;
  turnPlayer: Doc<"players"> | null;
}

/**
 * Pure derivation of round state so it can be unit-tested independently of
 * rendering.
 */
export function deriveRoundState(args: {
  currentRound: CurrentRound | null;
  game: Doc<"games"> | null;
  me: Doc<"players"> | null;
  players: Doc<"players">[];
}): DerivedRoundState {
  const { currentRound, game, me, players } = args;

  const turnPlayer = currentRound
    ? (players.find((player) => player._id === currentRound.turnPlayerId) ?? null)
    : null;

  const isMyTurn = Boolean(currentRound && me) && currentRound?.turnPlayerId === me?._id;

  const phase: RoundPhase = currentRound?.phase ?? "placing";

  const track: TrackInfo | null = currentRound?.track
    ? {
        _id: currentRound.track.trackId,
        artist: currentRound.track.artist,
        title: currentRound.track.title,
        year: currentRound.track.year,
        youtubeVideoId: currentRound.track.youtubeVideoId,
      }
    : null;

  return {
    isGameFinished: game?.status === "finished",
    isMyTurn,
    phase,
    track,
    turnPlayer,
  };
}
