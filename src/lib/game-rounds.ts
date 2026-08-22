import type { Id } from "@/convex/_generated/dataModel";

/**
 * Canonical sub-shapes of a resolved/current round document, shared between
 * the game context contract and any consumer that needs to describe partial
 * round data.
 */

export interface RoundGuess {
  awardedCoin: boolean;
  guessedArtist?: string;
  guessedTitle?: string;
  isCorrect: boolean;
  submittedAt: number;
}

export interface RoundPlacement {
  proposedIndex: number;
  submittedAt: number;
}

export interface RoundPlacementPreview {
  proposedIndex: number;
  updatedAt: number;
}

export interface CoinDelta {
  delta: number;
  playerId: Id<"players">;
}

export interface RoundResolution {
  awardedPlayerIds: Id<"players">[];
  coinDeltas: CoinDelta[];
  resolvedAt: number;
  turnPlayerWasCorrect: boolean;
  validIndexMax: number;
  validIndexMin: number;
}
