"use client";

import { useQuery } from "convex/react";
import type { GenericId } from "convex/values";
import { useSessionMutation } from "convex-helpers/react/sessions";
import { Check, Coins, Loader2, Lock, Music, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
import { TimelineCard } from "@/components/game/TimelineCard";
import { YouTubePlayer } from "@/components/player/YouTubePlayer";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import { getRevealedTrackMap, sortTimelineByYear } from "@/lib/timeline";
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
  isHost: boolean;
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
  players?: Player[];
  turnPlayerId?: GenericId<"players"> | null;
  roundStartedAt?: number;
  turnSeconds?: number;
  bettingWindowSeconds?: number;
  turnPlayerPlacementIndex?: number | null;
  phase?: string;
  showLiveBets?: boolean;
}

interface SlotBetInfo {
  playerId: GenericId<"players">;
  playerDisplayName: string;
  lockedIn: boolean;
}

interface SlotInfo {
  index: number;
  yearMin: number;
  yearMax: number | null;
  above?: TimelineEntry;
  below?: TimelineEntry;
  bets: SlotBetInfo[];
}

export function BettingPanel({
  lobbyId,
  me,
  track,
  turnPlayerTimeline,
  revealedTracks,
  players,
  turnPlayerId,
}: BettingPanelProps): React.ReactNode {
  const t = useTranslations("betting");
  const tCommon = useTranslations("common");
  const tTimer = useTranslations("timer");

  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isLockingIn, setIsLockingIn] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isResolving, setIsResolving] = useState(false);

  const previewBet = useSessionMutation(api.bets.preview);
  const lockInBet = useSessionMutation(api.bets.lockIn);
  const cancelBet = useSessionMutation(api.bets.cancel);
  const resolveRound = useSessionMutation(api.games.resolveRound);

  const existingBets = useQuery(api.bets.listForRound, lobbyId ? { lobbyId } : "skip");
  const safeBets = existingBets ?? [];
  const myBet = safeBets.find((bet) => bet.playerId === me?._id) ?? null;
  const hasLockedBet = myBet?.lockedIn ?? false;

  const sortedTimeline = sortTimelineByYear(turnPlayerTimeline);
  const revealedTrackMap = getRevealedTrackMap(revealedTracks);

  const isHost = players?.find((p) => p._id === me?._id)?.isHost ?? false;

  const slotBets = useMemo(() => {
    const map = new Map<number, SlotBetInfo[]>();
    for (const bet of safeBets) {
      const existing = map.get(bet.proposedIndex) ?? [];
      existing.push({
        playerId: bet.playerId,
        playerDisplayName: bet.playerDisplayName,
        lockedIn: bet.lockedIn,
      });
      map.set(bet.proposedIndex, existing);
    }
    return map;
  }, [safeBets]);

  const canResolveRound = useMemo(() => {
    if (!isHost || !players || !turnPlayerId) return false;

    const nonTurnPlayers = players.filter((p) => p._id !== turnPlayerId);
    if (nonTurnPlayers.length === 0) return false;

    const lockedBets = safeBets.filter((bet) => bet.lockedIn);
    const declinedBets = safeBets.filter((bet) => bet.declinedToBet);

    return nonTurnPlayers.every(
      (player) =>
        lockedBets.some((bet) => bet.playerId === player._id) ||
        declinedBets.some((bet) => bet.playerId === player._id),
    );
  }, [isHost, players, turnPlayerId, safeBets]);

  const handleResolveRound = useCallback(async () => {
    if (!lobbyId) return;

    setIsResolving(true);
    try {
      await resolveRound({ lobbyId });
    } catch (error) {
      console.error("Failed to resolve round:", error);
    } finally {
      setIsResolving(false);
    }
  }, [resolveRound, lobbyId]);

  const slots = useMemo<SlotInfo[]>(() => {
    const result: SlotInfo[] = [];
    for (let index = 0; index <= sortedTimeline.length; index += 1) {
      const aboveYear = sortedTimeline[index - 1]?.year ?? null;
      const belowYear = sortedTimeline[index]?.year ?? null;

      let yearMin: number;
      let yearMax: number | null;

      if (aboveYear === null) {
        yearMax = belowYear! - 10;
        yearMin = yearMax - 10;
      } else if (belowYear === null) {
        yearMin = aboveYear + 10;
        yearMax = null;
      } else {
        yearMin = Math.round(aboveYear);
        yearMax = Math.round(belowYear);
      }

      result.push({
        index,
        yearMin,
        yearMax,
        above: sortedTimeline[index - 1],
        below: sortedTimeline[index],
        bets: slotBets.get(index) ?? [],
      });
    }
    return result;
  }, [sortedTimeline, slotBets]);

  const canBet = me !== null && me.coins >= 1 && !hasLockedBet;

  useEffect(() => {
    if (myBet && !hasLockedBet) {
      setSelectedIndex(myBet.proposedIndex);
    }
    if (!myBet) {
      setSelectedIndex(null);
    }
  }, [myBet?.proposedIndex, myBet, hasLockedBet]);

  const handleSelect = useCallback(
    async (index: number) => {
      if (!canBet || !me) return;

      const slotBetsForIndex = slotBets.get(index) ?? [];
      const otherLockedBet = slotBetsForIndex.find((b) => b.playerId !== me._id && b.lockedIn);
      if (otherLockedBet) {
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

  useEffect(() => {
    if (!canBet) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedIndex === null) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        const newIndex = Math.min(selectedIndex + 1, slots.length - 1);
        handleSelect(newIndex);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        const newIndex = Math.max(selectedIndex - 1, 0);
        handleSelect(newIndex);
      } else if (e.key === "Enter" && selectedIndex !== null && !hasLockedBet) {
        e.preventDefault();
        handleConfirm();
      } else if (e.key === "Escape") {
        e.preventDefault();
        handleCancel();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [canBet, selectedIndex, slots, hasLockedBet, handleSelect, handleConfirm, handleCancel]);

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

  const selectedSlot = slots.find((slot) => slot.index === selectedIndex) ?? null;

  if (!track) {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        <p className="mt-4 text-muted-foreground">{tCommon("loading")}</p>
      </div>
    );
  }

  const trackTitle = track.title?.trim() ? track.title : undefined;
  const trackArtist = track.artist?.trim() ? track.artist : undefined;

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
          const slotBetsForIndex = slot.bets;
          const mySlotBet = slotBetsForIndex.find((b) => b.playerId === me?._id);
          const otherBets = slotBetsForIndex.filter((b) => b.playerId !== me?._id);
          const isSelected = selectedIndex === slot.index;
          const hasLockedBetByOther = otherBets.some((b) => b.lockedIn);
          const canSelectSlot = canBet && !hasLockedBetByOther;
          const isMyPreview = isSelected && mySlotBet && !mySlotBet.lockedIn;

          return (
            <div
              key={`slot-${slot.index}`}
              className={cn(
                "w-full rounded-lg border p-4 transition-all",
                isSelected ? "border-primary bg-primary/10" : "border-border bg-card",
                !canSelectSlot && "opacity-60",
              )}
            >
              <div className="flex items-start justify-between gap-4 mb-3">
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
                    <p className="text-sm font-semibold text-foreground">
                      {slot.yearMin} - {slot.yearMax === null ? "∞" : slot.yearMax}
                    </p>
                    <div className="space-y-1 text-xs text-muted-foreground">
                      {slot.above && (
                        <div className="flex items-center gap-2">
                          <span className="truncate">{formatTrackLine(slot.above)}</span>
                        </div>
                      )}
                      {slot.below && (
                        <div className="flex items-center gap-2">
                          <span className="truncate">{formatTrackLine(slot.below)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {slotBetsForIndex.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {slotBetsForIndex.map((bet) => (
                      <div
                        key={bet.playerId}
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium",
                          bet.lockedIn
                            ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                            : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
                        )}
                      >
                        {bet.lockedIn && <Lock className="h-3 w-3" />}
                        <span>{bet.playerDisplayName}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {isMyPreview && (
                  <div className="flex-1 min-w-[200px] animate-slideIn">
                    <TimelineCard
                      title={trackTitle}
                      artist={trackArtist}
                      yearMin={slot.yearMin}
                      yearMax={slot.yearMax}
                      playerName={me?.displayName}
                      isBetPreview
                      isPreview={false}
                      coinCost={1}
                    />
                  </div>
                )}
                {otherBets.map((bet) => (
                  <div
                    key={bet.playerId}
                    className={cn("flex-1 min-w-[200px]", !bet.lockedIn && "animate-slideIn")}
                  >
                    <TimelineCard
                      title={trackTitle}
                      artist={trackArtist}
                      yearMin={slot.yearMin}
                      yearMax={slot.yearMax}
                      playerName={bet.playerDisplayName}
                      isBetPreview={!bet.lockedIn}
                      isPreview={bet.lockedIn}
                    />
                  </div>
                ))}
              </div>

              {canSelectSlot && !isSelected && (
                <button
                  type="button"
                  onClick={() => handleSelect(slot.index)}
                  className="mt-3 w-full text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  {t("tapToPreview")}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {selectedSlot && !hasLockedBet && (
        <div className="flex flex-col gap-3 rounded-lg border bg-muted/30 p-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-foreground">
                {selectedSlot.yearMin} -{" "}
                {selectedSlot.yearMax === null ? "∞" : selectedSlot.yearMax}
              </p>
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

      {canResolveRound && (
        <div className="flex items-center justify-center gap-2 rounded-lg border border-primary bg-primary/10 p-4">
          <Button type="button" size="lg" onClick={handleResolveRound} disabled={isResolving}>
            {isResolving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {tTimer("resolvingRound")}
              </>
            ) : (
              tTimer("resolveRound")
            )}
          </Button>
          <p className="text-xs text-muted-foreground">{tTimer("waitingForBets")}</p>
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
