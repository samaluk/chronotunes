import type { Id } from "@/convex/_generated/dataModel";

export interface TimelineEntry {
  earnedAtRoundNumber: number;
  earnedBy: "placement" | "bet" | "initial";
  trackId: Id<"tracks">;
  year: number;
}

export interface Player {
  _id: Id<"players">;
  coins: number;
  displayName: string;
  isHost: boolean;
  timeline: TimelineEntry[];
  timelineSize: number;
}

export interface TrackInfo {
  _id: Id<"tracks">;
  artist?: string;
  title?: string;
  year?: number;
  youtubeVideoId?: string;
}

export interface RevealedTrack {
  artist: string;
  title: string;
  trackId: Id<"tracks">;
  year: number;
  youtubeVideoId?: string;
}

export interface SlotBetInfo {
  lockedIn: boolean;
  playerDisplayName: string;
  playerId: Id<"players">;
}

export interface SlotInfo {
  above?: TimelineEntry;
  below?: TimelineEntry;
  bets: SlotBetInfo[];
  index: number;
}

export interface SlotState {
  isActive: boolean;
  isDisabled: boolean;
  isTurnPlayerSlot: boolean;
  label: string;
  shouldDim: boolean;
  showPreviewCoin: boolean;
  slotBetsForIndex: SlotBetInfo[];
}

export interface RoundBet {
  playerId: Id<"players">;
  playerDisplayName: string;
  lockedIn: boolean;
  declinedToBet: boolean;
  proposedIndex: number;
}
