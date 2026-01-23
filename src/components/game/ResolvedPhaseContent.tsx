"use client";

import { useQuery } from "convex/react";
import { Music } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { RoundResults } from "./RoundResults";

interface ResolvedPhaseContentProps {
  lobbyId: Id<"lobbies">;
  track: {
    _id: Id<"tracks">;
    title?: string;
    artist?: string;
    year?: number;
    youtubeVideoId?: string;
  } | null;
  resolution: {
    validIndexMin: number;
    validIndexMax: number;
    turnPlayerWasCorrect: boolean;
    awardedPlayerIds: Id<"players">[];
    coinDeltas: Array<{
      playerId: Id<"players">;
      delta: number;
    }>;
    resolvedAt: number;
  } | null;
  players: Doc<"players">[] | null;
  turnPlayerId: Id<"players"> | null;
  me: Doc<"players"> | null;
}

export function ResolvedPhaseContent({
  lobbyId,
  track,
  resolution,
  players,
  turnPlayerId,
  me,
}: ResolvedPhaseContentProps): React.ReactNode {
  const tResults = useTranslations("results");
  const [showResultsModal, setShowResultsModal] = useState(false);
  const roundBets = useQuery(api.bets.listForRound, lobbyId ? { lobbyId } : "skip");

  useEffect(() => {
    setShowResultsModal(true);
  }, []);

  if (!lobbyId || !track || !resolution || !players || !turnPlayerId) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
          <Music className="h-8 w-8 text-green-600 dark:text-green-400" />
        </div>
        <div className="text-center space-y-2">
          <p className="text-lg font-medium">{tResults("roundResults")}</p>
          <p className="text-sm text-muted-foreground">{tResults("songRevealed")}</p>
        </div>
        {track?.title && track?.artist && track?.year && (
          <div className="mt-4 p-4 rounded-lg bg-card border max-w-md w-full text-center">
            <p className="text-sm text-muted-foreground">{tResults("songWas")}</p>
            <p className="text-xl font-bold mt-1">
              {track.title} - {track.artist} ({track.year})
            </p>
          </div>
        )}
      </div>
    );
  }

  const turnPlayer = players.find((player) => player._id === turnPlayerId) ?? null;
  if (!turnPlayer) return null;

  const resultsContent = (
    <RoundResults
      lobbyId={lobbyId}
      track={
        track as {
          _id: typeof track._id;
          title: string;
          artist: string;
          year: number;
        }
      }
      resolution={resolution}
      turnPlayer={turnPlayer}
      bets={roundBets ?? []}
      players={players}
      me={me ?? null}
    />
  );

  return (
    <>
      <Dialog open={showResultsModal} onOpenChange={setShowResultsModal}>
        <DialogContent className="max-w-3xl">{resultsContent}</DialogContent>
      </Dialog>
      {!showResultsModal && resultsContent}
    </>
  );
}
