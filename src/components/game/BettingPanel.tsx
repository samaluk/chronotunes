"use client";

import { useMutation, useQuery } from "convex/react";
import type { GenericId } from "convex/values";
import { Check, Coins, GripVertical, Loader2, X } from "lucide-react";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import { useSessionId } from "@/lib/hooks/use-session-id";
import { cn } from "@/lib/utils";

interface TimelineEntry {
  trackId: GenericId<"tracks">;
  year: number;
  earnedAtRoundNumber: number;
  earnedBy: "placement" | "bet";
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
  title: string;
  artist: string;
  year: number;
}

interface BettingSlotProps {
  index: number;
  isSelected: boolean;
  isLockedIn: boolean;
  canBet: boolean;
  hasCoins: boolean;
  onSelect: (index: number) => void;
  onConfirm: () => void;
  onCancel: () => void;
  turnPlayerTimelineSize: number;
}

function BettingSlot({
  index,
  isSelected,
  isLockedIn,
  canBet,
  hasCoins,
  onSelect,
  onConfirm,
  onCancel,
  turnPlayerTimelineSize,
}: BettingSlotProps): React.ReactNode {
  const positionLabel = ((): string => {
    if (index === 0) return "First position";
    if (index === turnPlayerTimelineSize) return "Last position";
    return `Position ${index + 1}`;
  })();

  return (
    <div
      className={cn(
        "relative flex items-center gap-3 p-3 rounded-lg border transition-all",
        isSelected
          ? isLockedIn
            ? "bg-green-50 border-green-500 dark:bg-green-950/30 dark:border-green-500"
            : "bg-amber-50 border-amber-400 dark:bg-amber-950/30 dark:border-amber-500"
          : "bg-card hover:bg-muted/50",
        !canBet && "opacity-50",
      )}
    >
      <div
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors",
          isSelected
            ? isLockedIn
              ? "bg-green-100 text-green-600 dark:bg-green-900/50 dark:text-green-400"
              : "bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-400"
            : "bg-muted",
        )}
      >
        {isLockedIn ? (
          <Check className="h-5 w-5" />
        ) : isSelected ? (
          <GripVertical className="h-5 w-5 animate-pulse" />
        ) : (
          <span className="text-sm font-semibold">{index + 1}</span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-medium text-foreground">{positionLabel}</p>
        {isSelected && !isLockedIn && (
          <p className="text-xs text-amber-600 dark:text-amber-400">
            Preview mode - confirm or cancel
          </p>
        )}
        {isLockedIn && <p className="text-xs text-green-600 dark:text-green-400">Bet locked in</p>}
      </div>

      <div className="flex items-center gap-2">
        {isSelected && !isLockedIn && (
          <>
            <Button type="button" size="sm" variant="ghost" onClick={onCancel} disabled={!hasCoins}>
              <X className="h-4 w-4" />
            </Button>
            <Button type="button" size="sm" onClick={onConfirm} disabled={!hasCoins}>
              <Check className="h-4 w-4 mr-1" />
              Confirm
            </Button>
          </>
        )}
        {!isSelected && canBet && hasCoins && (
          <Button type="button" size="sm" variant="outline" onClick={() => onSelect(index)}>
            <Coins className="h-4 w-4 mr-1" />
            Bet 1
          </Button>
        )}
      </div>
    </div>
  );
}

interface BettingPanelProps {
  lobbyId: GenericId<"lobbies">;
  me: Player | null;
  track: TrackInfo | null;
  turnPlayerTimeline: TimelineEntry[];
  turnPlayerTimelineSize: number;
}

export function BettingPanel({
  lobbyId,
  me,
  track,
  turnPlayerTimeline,
  turnPlayerTimelineSize,
}: BettingPanelProps): React.ReactNode {
  const sessionId = useSessionId();
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isLockingIn, setIsLockingIn] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  const previewBet = useMutation(api.bets.preview);
  const lockInBet = useMutation(api.bets.lockIn);
  const cancelBet = useMutation(api.bets.cancel);

  const existingBets = useQuery(api.bets.listForRound, lobbyId ? { lobbyId } : "skip");

  const myBet = existingBets?.find((bet) => bet.playerId === me?._id);
  const hasLockedBet = myBet?.lockedIn ?? false;

  const canBet = me !== null && me.coins >= 1 && !hasLockedBet;
  const sortedTimeline = [...turnPlayerTimeline].sort((a, b) => a.year - b.year);

  const handleSelect = useCallback(
    async (index: number) => {
      if (!sessionId || !canBet) return;

      setSelectedIndex(index);
      setIsPreviewing(true);

      try {
        await previewBet({
          lobbyId,
          sessionId,
          proposedIndex: index,
        });
      } catch (error) {
        console.error("Failed to preview bet:", error);
        setSelectedIndex(null);
        setIsPreviewing(false);
      }
    },
    [lobbyId, sessionId, canBet, previewBet],
  );

  const handleConfirm = useCallback(async () => {
    if (!sessionId || selectedIndex === null) return;

    setIsLockingIn(true);

    try {
      await lockInBet({
        lobbyId,
        sessionId,
      });
      setSelectedIndex(null);
    } catch (error) {
      console.error("Failed to lock in bet:", error);
    } finally {
      setIsLockingIn(false);
    }
  }, [lobbyId, sessionId, selectedIndex, lockInBet]);

  const handleCancel = useCallback(async () => {
    if (!sessionId) return;

    setIsCancelling(true);

    try {
      await cancelBet({
        lobbyId,
        sessionId,
      });
      setSelectedIndex(null);
    } catch (error) {
      console.error("Failed to cancel bet:", error);
    } finally {
      setIsCancelling(false);
    }
  }, [lobbyId, sessionId, cancelBet]);

  if (!track) {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        <p className="mt-4 text-muted-foreground">Loading track...</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-muted-foreground">Place Your Bet</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Guess where the song belongs on the timeline
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Coins className="h-4 w-4 text-amber-500" />
          <span className="text-sm font-medium">
            {me?.coins ?? 0} {me?.coins === 1 ? "coin" : "coins"}
          </span>
        </div>
      </div>

      {existingBets && existingBets.length > 0 && (
        <div className="p-3 rounded-lg bg-muted/50 border">
          <p className="text-xs font-medium text-muted-foreground mb-2">Other players betting</p>
          <div className="flex flex-wrap gap-2">
            {existingBets.map((bet) => (
              <div
                key={bet.playerId}
                className={cn(
                  "inline-flex items-center gap-1 px-2 py-1 rounded text-xs",
                  bet.lockedIn
                    ? "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300"
                    : "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
                )}
              >
                <span>{bet.playerDisplayName}</span>
                <span className="text-muted-foreground">→</span>
                <span className="font-medium">#{bet.proposedIndex + 1}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2">
        {sortedTimeline.length === 0 ? (
          <>
            <BettingSlot
              index={0}
              isSelected={selectedIndex === 0}
              isLockedIn={hasLockedBet}
              canBet={canBet}
              hasCoins={(me?.coins ?? 0) >= 1}
              onSelect={handleSelect}
              onConfirm={handleConfirm}
              onCancel={handleCancel}
              turnPlayerTimelineSize={turnPlayerTimelineSize}
            />
            <div className="pl-11">
              <div className="relative">
                <div className="absolute -left-4 top-1/2 -translate-y-1/2 w-px h-full bg-border" />
                <div
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border transition-all",
                    "bg-primary/10 border-primary border-dashed",
                  )}
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary">
                    <span className="text-sm font-semibold">?</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground">New Song</p>
                    <p className="text-sm text-muted-foreground truncate">{track.title}</p>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            {sortedTimeline.map((entry, idx) => {
              const isBeforeSelected = selectedIndex !== null && idx === selectedIndex;
              const isAfterSelected = selectedIndex !== null && idx === selectedIndex + 1;

              return (
                <div key={`${entry.trackId}-${entry.earnedAtRoundNumber}`}>
                  {isBeforeSelected && (
                    <BettingSlot
                      index={idx}
                      isSelected={true}
                      isLockedIn={hasLockedBet}
                      canBet={canBet}
                      hasCoins={(me?.coins ?? 0) >= 1}
                      onSelect={handleSelect}
                      onConfirm={handleConfirm}
                      onCancel={handleCancel}
                      turnPlayerTimelineSize={turnPlayerTimelineSize}
                    />
                  )}
                  <div className={cn(isAfterSelected && "pl-4")}>
                    <div
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-lg border transition-all",
                        "bg-card",
                      )}
                    >
                      <div
                        className={cn(
                          "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                          "bg-muted",
                        )}
                      >
                        <span className="text-sm font-semibold text-muted-foreground">
                          {entry.year}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground">Known Track</p>
                        <p className="text-sm text-muted-foreground truncate">
                          From round {entry.earnedAtRoundNumber}
                        </p>
                      </div>
                    </div>
                  </div>
                  {isAfterSelected && (
                    <BettingSlot
                      index={idx + 1}
                      isSelected={true}
                      isLockedIn={hasLockedBet}
                      canBet={canBet}
                      hasCoins={(me?.coins ?? 0) >= 1}
                      onSelect={handleSelect}
                      onConfirm={handleConfirm}
                      onCancel={handleCancel}
                      turnPlayerTimelineSize={turnPlayerTimelineSize}
                    />
                  )}
                </div>
              );
            })}

            {selectedIndex === sortedTimeline.length && (
              <BettingSlot
                index={sortedTimeline.length}
                isSelected={true}
                isLockedIn={hasLockedBet}
                canBet={canBet}
                hasCoins={(me?.coins ?? 0) >= 1}
                onSelect={handleSelect}
                onConfirm={handleConfirm}
                onCancel={handleCancel}
                turnPlayerTimelineSize={turnPlayerTimelineSize}
              />
            )}

            {selectedIndex === null && (
              <>
                <BettingSlot
                  index={0}
                  isSelected={false}
                  isLockedIn={hasLockedBet}
                  canBet={canBet}
                  hasCoins={(me?.coins ?? 0) >= 1}
                  onSelect={handleSelect}
                  onConfirm={handleConfirm}
                  onCancel={handleCancel}
                  turnPlayerTimelineSize={turnPlayerTimelineSize}
                />
                <div className="pl-4">
                  <div
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg border transition-all",
                      "bg-card",
                    )}
                  >
                    <div
                      className={cn(
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                        "bg-muted",
                      )}
                    >
                      <span className="text-sm font-semibold text-muted-foreground">
                        {sortedTimeline[0].year}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground">Known Track</p>
                      <p className="text-sm text-muted-foreground truncate">
                        From round {sortedTimeline[0].earnedAtRoundNumber}
                      </p>
                    </div>
                  </div>
                </div>
                {sortedTimeline.slice(1).map((entry, idx) => (
                  <div key={`${entry.trackId}-${entry.earnedAtRoundNumber}`}>
                    <BettingSlot
                      index={idx + 1}
                      isSelected={false}
                      isLockedIn={hasLockedBet}
                      canBet={canBet}
                      hasCoins={(me?.coins ?? 0) >= 1}
                      onSelect={handleSelect}
                      onConfirm={handleConfirm}
                      onCancel={handleCancel}
                      turnPlayerTimelineSize={turnPlayerTimelineSize}
                    />
                    <div className="pl-4">
                      <div
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-lg border transition-all",
                          "bg-card",
                        )}
                      >
                        <div
                          className={cn(
                            "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                            "bg-muted",
                          )}
                        >
                          <span className="text-sm font-semibold text-muted-foreground">
                            {entry.year}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground">Known Track</p>
                          <p className="text-sm text-muted-foreground truncate">
                            From round {entry.earnedAtRoundNumber}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                <BettingSlot
                  index={sortedTimeline.length}
                  isSelected={false}
                  isLockedIn={hasLockedBet}
                  canBet={canBet}
                  hasCoins={(me?.coins ?? 0) >= 1}
                  onSelect={handleSelect}
                  onConfirm={handleConfirm}
                  onCancel={handleCancel}
                  turnPlayerTimelineSize={turnPlayerTimelineSize}
                />
              </>
            )}

            <div className="pl-4 mt-2">
              <div className="relative">
                <div className="absolute -left-4 top-1/2 -translate-y-1/2 w-px h-full bg-border" />
                <div
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border transition-all",
                    selectedIndex !== null
                      ? "bg-primary/10 border-primary border-dashed"
                      : "bg-muted/50 border-border",
                  )}
                >
                  <div
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                      selectedIndex !== null ? "bg-primary/20 text-primary" : "bg-muted",
                    )}
                  >
                    <span
                      className={cn(
                        "text-sm font-semibold",
                        selectedIndex !== null ? "" : "text-muted-foreground",
                      )}
                    >
                      ?
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground">New Song</p>
                    <p className="text-sm text-muted-foreground truncate">{track.title}</p>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {!canBet && !hasLockedBet && me && me.coins < 1 && (
        <div className="flex items-center justify-center gap-2 p-3 rounded-lg bg-muted/50 border text-muted-foreground">
          <Coins className="h-4 w-4" />
          <span className="text-sm">Not enough coins to place a bet</span>
        </div>
      )}

      {hasLockedBet && (
        <div className="flex items-center justify-center gap-2 p-3 rounded-lg bg-green-50 border border-green-200 dark:bg-green-950/30 dark:border-green-800">
          <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
          <span className="text-sm font-medium text-green-700 dark:text-green-300">
            Your bet is locked in!
          </span>
        </div>
      )}

      {(isPreviewing || isLockingIn || isCancelling) && (
        <div className="flex items-center justify-center gap-2 p-2 rounded-lg bg-muted/50">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm text-muted-foreground">
            {isPreviewing
              ? "Placing bet..."
              : isLockingIn
                ? "Locking in bet..."
                : "Cancelling bet..."}
          </span>
        </div>
      )}
    </div>
  );
}
