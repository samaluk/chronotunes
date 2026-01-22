"use client";

import { useQuery } from "convex/react";
import type { GenericId } from "convex/values";
import { useSessionMutation } from "convex-helpers/react/sessions";
import { ArrowDown, ArrowUp, Check, Coins, Loader2, Lock, Music, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
import { YouTubePlayer } from "@/components/player/YouTubePlayer";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import { cn } from "@/lib/utils";

interface TimelineEntry {
  trackId: GenericId<"tracks">;
  year: number;
  earnedAtRoundNumber: number;
  earnedBy: "placement" | "bet" | "initial";
}

interface Player {
  _id: GenericId<"players">;
  displayName: string;
  timeline: TimelineEntry[];
  timelineSize: number;
  coins: number;
}

interface TrackInfo {
  _id: GenericId<"tracks">;
  title?: string;
  artist?: string;
  year?: number;
  youtubeVideoId?: string;
}

interface RevealedTrack {
  trackId: GenericId<"tracks">;
  title: string;
  artist: string;
  year: number;
  youtubeVideoId?: string;
}

interface BettingPanelProps {
  lobbyId: GenericId<"lobbies">;
  me: Player | null;
  track: TrackInfo | null;
  turnPlayerTimeline: TimelineEntry[];
  revealedTracks: RevealedTrack[];
}

interface SlotInfo {
  index: number;
  label: string;
  above?: TimelineEntry;
  below?: TimelineEntry;
  bet?: {
    playerId: GenericId<"players">;
    playerDisplayName: string;
    lockedIn: boolean;
  };
}

export function BettingPanel({
  lobbyId,
  me,
  track,
  turnPlayerTimeline,
  revealedTracks,
}: BettingPanelProps): React.ReactNode {
  const t = useTranslations("betting");
  const tCommon = useTranslations("common");

  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isLockingIn, setIsLockingIn] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  const previewBet = useSessionMutation(api.bets.preview);
  const lockInBet = useSessionMutation(api.bets.lockIn);
  const cancelBet = useSessionMutation(api.bets.cancel);

  const existingBets = useQuery(api.bets.listForRound, lobbyId ? { lobbyId } : "skip");
  const safeBets = existingBets ?? [];
  const myBet = safeBets.find((bet) => bet.playerId === me?._id) ?? null;
  const hasLockedBet = myBet?.lockedIn ?? false;

  useEffect(() => {
    if (myBet && !hasLockedBet) {
      setSelectedIndex(myBet.proposedIndex);
    }
    if (!myBet) {
      setSelectedIndex(null);
    }
  }, [myBet?.proposedIndex, myBet, hasLockedBet]);

  const canBet = me !== null && me.coins >= 1 && !hasLockedBet;
  const sortedTimeline = useMemo(
    () => [...turnPlayerTimeline].sort((a, b) => a.year - b.year),
    [turnPlayerTimeline],
  );
  const revealedTrackMap = useMemo(
    () => new Map(revealedTracks.map((item) => [item.trackId, item])),
    [revealedTracks],
  );
  const slotBets = useMemo(
    () => new Map(safeBets.map((bet) => [bet.proposedIndex, bet])),
    [safeBets],
  );

  const slots = useMemo<SlotInfo[]>(() => {
    const result: SlotInfo[] = [];
    for (let index = 0; index <= sortedTimeline.length; index += 1) {
      const label =
        index === 0
          ? t("firstPositionBet")
          : index === sortedTimeline.length
            ? t("lastPositionBet")
            : t("positionBet", { number: index + 1 });
      result.push({
        index,
        label,
        above: sortedTimeline[index - 1],
        below: sortedTimeline[index],
        bet: slotBets.get(index),
      });
    }
    return result;
  }, [sortedTimeline, slotBets, t]);

  const formatTrackLine = useCallback(
    (entry: TimelineEntry): string => {
      const track = revealedTrackMap.get(entry.trackId);
      if (track) {
        return `${track.year} · ${track.title} — ${track.artist}`;
      }
      return `${entry.year}`;
    },
    [revealedTrackMap],
  );

  const handleSelect = useCallback(
    async (index: number) => {
      if (!canBet || !me) return;

      const existingBet = slotBets.get(index);
      if (existingBet && existingBet.playerId !== me._id) {
        return;
      }

      setSelectedIndex(index);
      setIsPreviewing(true);

      try {
        await previewBet({
          lobbyId,
          proposedIndex: index,
        });
      } catch (error) {
        console.error(t("failedToPreview"), error);
        setSelectedIndex(null);
        setIsPreviewing(false);
      }
    },
    [canBet, me, slotBets, previewBet, lobbyId, t],
  );

  const handleConfirm = useCallback(async () => {
    if (selectedIndex === null) return;

    setIsLockingIn(true);

    try {
      await lockInBet({ lobbyId });
      setSelectedIndex(null);
    } catch (error) {
      console.error(t("failedToLockIn"), error);
    } finally {
      setIsLockingIn(false);
    }
  }, [selectedIndex, lockInBet, lobbyId, t]);

  const handleCancel = useCallback(async () => {
    setIsCancelling(true);

    try {
      await cancelBet({ lobbyId });
      setSelectedIndex(null);
    } catch (error) {
      console.error(t("failedToCancel"), error);
    } finally {
      setIsCancelling(false);
    }
  }, [cancelBet, lobbyId, t]);

  const selectedSlot = slots.find((slot) => slot.index === selectedIndex) ?? null;

  if (!track) {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        <p className="mt-4 text-muted-foreground">{tCommon("loading")}</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      {track.youtubeVideoId && (
        <div className="p-3 rounded-lg bg-muted/30 border">
          <div className="flex items-center gap-2 mb-2">
            <Music className="h-4 w-4 text-primary" />
            <span className="text-xs font-medium text-muted-foreground">{t("nowPlaying")}</span>
          </div>
          <YouTubePlayer youtubeVideoId={track.youtubeVideoId} className="w-full" />
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-muted-foreground">{t("placeYourBet")}</h3>
          <p className="text-xs text-muted-foreground mt-1">{t("placeBetDescription")}</p>
        </div>
        <div className="flex items-center gap-2">
          <Coins className="h-4 w-4 text-amber-500" />
          <span className="text-sm font-medium">{t("betCoins", { count: me?.coins ?? 0 })}</span>
        </div>
      </div>

      <div className="space-y-3">
        {slots.map((slot) => {
          const betOwner = slot.bet;
          const isTakenByOther = betOwner && betOwner.playerId !== me?._id;
          const isSelected = selectedIndex === slot.index;
          const canSelectSlot = canBet && !isTakenByOther;

          return (
            <button
              key={`slot-${slot.index}`}
              type="button"
              onClick={() => handleSelect(slot.index)}
              disabled={!canSelectSlot}
              className={cn(
                "w-full text-left rounded-lg border p-4 transition-all",
                isSelected
                  ? "border-primary bg-primary/10"
                  : "border-border bg-card hover:bg-muted/40",
                !canSelectSlot && "opacity-60 cursor-not-allowed",
              )}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border",
                      isSelected
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-muted text-foreground border-border",
                    )}
                  >
                    <span className="text-sm font-semibold">{slot.index + 1}</span>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-foreground">{slot.label}</p>
                    <div className="space-y-1 text-xs text-muted-foreground">
                      {slot.above && (
                        <div className="flex items-center gap-2">
                          <ArrowUp className="h-3 w-3" />
                          <span className="truncate">{formatTrackLine(slot.above)}</span>
                        </div>
                      )}
                      {slot.below && (
                        <div className="flex items-center gap-2">
                          <ArrowDown className="h-3 w-3" />
                          <span className="truncate">{formatTrackLine(slot.below)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {betOwner && (
                  <div
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium",
                      betOwner.lockedIn
                        ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                        : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
                    )}
                  >
                    <Lock className="h-3 w-3" />
                    <span>{betOwner.playerDisplayName}</span>
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {selectedSlot && !hasLockedBet && (
        <div className="flex flex-col gap-3 rounded-lg border bg-muted/30 p-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-foreground">{selectedSlot.label}</p>
              <p className="text-xs text-muted-foreground">{t("previewMode")}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" size="sm" variant="ghost" onClick={handleCancel}>
                <X className="mr-1 h-4 w-4" />
                {tCommon("cancel")}
              </Button>
              <Button type="button" size="sm" onClick={handleConfirm}>
                <Check className="mr-1 h-4 w-4" />
                {t("confirm")}
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-lg border border-dashed bg-muted/30 p-4">
        <p className="text-sm font-medium text-foreground">{tCommon("newSong")}</p>
        <p className="text-xs text-muted-foreground">???</p>
      </div>

      {!canBet && !hasLockedBet && me && me.coins < 1 && (
        <div className="flex items-center justify-center gap-2 rounded-lg border bg-muted/50 p-3 text-muted-foreground">
          <Coins className="h-4 w-4" />
          <span className="text-sm">{t("notEnoughCoins")}</span>
        </div>
      )}

      {hasLockedBet && (
        <div className="flex items-center justify-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-950/30">
          <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
          <span className="text-sm font-medium text-green-700 dark:text-green-300">
            {t("yourBetLocked")}
          </span>
        </div>
      )}

      {(isPreviewing || isLockingIn || isCancelling) && (
        <div className="flex items-center justify-center gap-2 rounded-lg bg-muted/50 p-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm text-muted-foreground">
            {isPreviewing ? t("placingBet") : isLockingIn ? t("lockingInBet") : t("cancellingBet")}
          </span>
        </div>
      )}
    </div>
  );
}
