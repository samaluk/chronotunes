import type { convexTest } from "convex-test";
import type { WithoutSystemFields } from "convex/server";

import type { Doc, Id, TableNames } from "../../_generated/dataModel";

export type TestContext = ReturnType<typeof convexTest>;

export interface FactoryResult<T extends TableNames> {
  id: Id<T>;
  record: WithoutSystemFields<Doc<T>>;
}

export interface CreateManyOptions {
  startIndex?: number;
}

export type GameStatus = "active" | "paused" | "finished";
export type LobbyStatus = "lobby" | "in_game" | "finished";
export type BetStatus = "pending" | "won" | "lost";

export interface TimelineEntry {
  earnedAtRoundNumber: number;
  earnedBy: "placement" | "bet";
  trackId: Id<"tracks">;
  year: number;
}

export interface PlayerOverrides {
  coins?: number;
  displayName?: string;
  isHost?: boolean;
  sessionId?: string;
  timeline?: TimelineEntry[];
  timelineSize?: number;
}

export interface LobbyOverrides {
  code?: string;
  hostSessionId?: string;
  players?: PlayerOverrides[];
  settings?: {
    targetTimelineSize?: number;
    startingCoins?: number;
    turnSeconds?: number;
    bettingWindowSeconds?: number;
    allowGuessTitleArtist?: boolean;
    showLiveBets?: boolean;
    allowBetRetraction?: boolean;
    minYear?: number;
    maxYear?: number;
  };
  status?: LobbyStatus;
}

export interface GameOverrides {
  currentRoundNumber?: number;
  status?: GameStatus;
  turnOrder?: Id<"players">[];
  turnPlayerId?: Id<"players">;
}

export interface BetOverrides {
  lockedIn?: boolean;
  proposedIndex?: number;
  status?: BetStatus;
}

export function withIndex(str: string, index: number): string {
  return str.replace("{n}", String(index));
}

export function uuid(): string {
  return `session-${crypto.randomUUID().slice(0, 8)}`;
}
