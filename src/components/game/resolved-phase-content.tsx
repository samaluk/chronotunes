"use client";

import { Music } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { Dialog, DialogContent } from "@/components/ui/dialog";

import { useGame } from "./game-provider";
import { RoundResults } from "./round-results";

export function ResolvedPhaseContent(): React.ReactNode {
  const tResults = useTranslations("results");
  const [showResultsModal, setShowResultsModal] = useState(false);
  const { state } = useGame();
  const { lobby, players, currentRound, track, turnPlayer } = state;

  useEffect(() => {
    setShowResultsModal(true);
  }, []);

  if (!(lobby && track && currentRound?.resolution && players && turnPlayer)) {
    return (
      <div className="flex flex-col items-center justify-center space-y-4 py-12">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
          <Music className="h-8 w-8 text-green-600 dark:text-green-400" />
        </div>
        <div className="space-y-2 text-center">
          <p className="font-medium text-lg">{tResults("roundResults")}</p>
          <p className="text-muted-foreground text-sm">{tResults("songRevealed")}</p>
        </div>
        {track?.title && track?.artist && track?.year && (
          <div className="mt-4 w-full max-w-md rounded-lg border bg-card p-4 text-center">
            <p className="text-muted-foreground text-sm">{tResults("songWas")}</p>
            <p className="mt-1 font-bold text-xl">
              {track.title} - {track.artist} ({track.year})
            </p>
          </div>
        )}
      </div>
    );
  }

  const resultsContent = <RoundResults />;

  return (
    <>
      <Dialog onOpenChange={setShowResultsModal} open={showResultsModal}>
        <DialogContent className="max-w-3xl">{resultsContent}</DialogContent>
      </Dialog>
      {!showResultsModal && resultsContent}
    </>
  );
}
