"use client";

import { useSessionMutation } from "convex-helpers/react/sessions";
import { useQuery } from "convex/react";
import { Check, Clock, Music, Star, Trophy, Users, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { runTrackedMutation } from "@/lib/run-safely";
import { cn } from "@/lib/utils";

import { useGame } from "./game-context";

interface BetWithPlayer {
  declinedToBet: boolean;
  playerDisplayName: string;
  playerId: Id<"players">;
  proposedIndex: number;
  status: "pending" | "won" | "lost";
}

const getCorrectnessStyles = (showCorrectness: boolean, isCorrect: boolean) => {
  if (!showCorrectness) {
    return {
      container: "scale-90 bg-muted opacity-50",
      icon: <Clock className="h-8 w-8 animate-pulse text-muted-foreground" />,
      label: "revealing",
      text: "text-foreground",
    };
  }

  if (isCorrect) {
    return {
      container: "scale-100 bg-green-100 dark:bg-green-900/30",
      icon: <Check className="h-10 w-10 animate-bounce text-green-600 dark:text-green-400" />,
      label: "correct",
      text: "text-green-600 dark:text-green-400",
    };
  }

  return {
    container: "scale-100 bg-red-100 dark:bg-red-900/30",
    icon: <X className="h-10 w-10 animate-shake text-red-600 dark:text-red-400" />,
    label: "incorrect",
    text: "text-red-600 dark:text-red-400",
  };
};

const getBetStatusStyles = (status: BetWithPlayer["status"]) => {
  switch (status) {
    case "won": {
      return {
        badge: "bg-green-100 text-green-600 dark:bg-green-900/50 dark:text-green-400",
        container: "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/20",
        icon: <Check className="h-4 w-4" />,
        label: "Won",
        labelClass: "text-green-600 dark:text-green-400",
      };
    }
    case "lost": {
      return {
        badge: "bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400",
        container: "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/20",
        icon: <X className="h-4 w-4" />,
        label: "Lost",
        labelClass: "text-red-600 dark:text-red-400",
      };
    }
    default: {
      return {
        badge: "bg-muted",
        container: "bg-muted/30",
        icon: <Clock className="h-4 w-4" />,
        label: "Pending",
        labelClass: "",
      };
    }
  }
};

function SongReveal({
  correctnessStyles,
  placementResultText,
}: {
  correctnessStyles: ReturnType<typeof getCorrectnessStyles>;
  placementResultText: string;
}): React.ReactNode {
  return (
    <div className="space-y-4 text-center">
      <div
        className={cn(
          "mx-auto flex h-20 w-20 transform items-center justify-center rounded-full transition-all duration-500",
          correctnessStyles.container,
        )}
      >
        {correctnessStyles.icon}
      </div>
      <div className="space-y-1">
        <p className={cn("font-bold text-xl transition-all duration-300", correctnessStyles.text)}>
          {correctnessStyles.label}
        </p>
        <p className="text-muted-foreground text-sm">{placementResultText}</p>
      </div>
    </div>
  );
}

function SongCard({
  t,
  track,
}: {
  t: ReturnType<typeof useTranslations>;
  track: { artist?: string; title?: string; year?: number };
}): React.ReactNode {
  return (
    <Card className="fade-in slide-in-from-bottom-2 animate-in p-4 text-center">
      <p className="text-muted-foreground text-xs uppercase tracking-wide">{t("theSongWas")}</p>
      <div className="flex items-center justify-between">
        <span className="font-medium text-lg text-muted-foreground">Title</span>
        <p className="font-bold text-2xl text-foreground">{track.title}</p>
      </div>
      <div className="flex items-center justify-between">
        <span className="font-medium text-lg text-muted-foreground">Artist</span>
        <p className="font-bold text-2xl text-foreground">{track.artist}</p>
      </div>
      <div className="flex items-center justify-between">
        <span className="font-medium text-lg text-muted-foreground">Year</span>
        <p className="font-bold text-2xl text-foreground">{track.year}</p>
      </div>
    </Card>
  );
}

function AwardedPlayer({
  isMe,
  player,
  turnPlayerId,
}: {
  isMe: boolean;
  player: Doc<"players">;
  turnPlayerId: Id<"players">;
}): React.ReactNode {
  const viaLabel = player._id === turnPlayerId ? "placement" : "betting";

  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-lg border p-3",
        isMe ? "border-primary/20 bg-primary/5" : "bg-muted/30",
      )}
    >
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
          <Music className="h-4 w-4 text-primary" />
        </div>
        <div>
          <p className="font-medium">
            {player.displayName}
            {isMe && <span className="ml-1 text-primary text-xs">(You)</span>}
          </p>
          <p className="text-muted-foreground text-xs">Got the card via {viaLabel}</p>
        </div>
      </div>
      <Star className="h-4 w-4 text-green-600 dark:text-green-400" />
    </div>
  );
}

function CardAwards({
  meId,
  playersById,
  resolution,
  turnPlayerId,
}: {
  meId: Id<"players"> | undefined;
  playersById: Map<Id<"players">, Doc<"players">>;
  resolution: NonNullable<
    NonNullable<ReturnType<typeof useGame>["state"]["currentRound"]>["resolution"]
  >;
  turnPlayerId: Id<"players">;
}): React.ReactNode {
  const awarded = resolution.awardedPlayerIds.flatMap((playerId) => {
    const player = playersById.get(playerId);
    if (!player) {
      return [];
    }
    return [
      <AwardedPlayer
        isMe={playerId === meId}
        key={playerId}
        player={player}
        turnPlayerId={turnPlayerId}
      />,
    ];
  });

  return (
    <div className="fade-in slide-in-from-bottom-4 animate-in space-y-3">
      <div className="flex items-center gap-2 font-medium text-sm">
        <Trophy className="h-4 w-4" />
        <span>Card Awards</span>
      </div>
      <div className="grid gap-2">
        {awarded}
        {awarded.length === 0 && (
          <p className="py-2 text-center text-muted-foreground text-sm">
            No cards were awarded this round
          </p>
        )}
      </div>
    </div>
  );
}

function BetRow({
  bet,
  isMe,
  player,
}: {
  bet: BetWithPlayer;
  isMe: boolean;
  player: Doc<"players">;
}): React.ReactNode {
  const statusStyles = getBetStatusStyles(bet.status);

  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-lg border p-3",
        statusStyles.container,
        isMe && "ring-2 ring-primary/20",
      )}
    >
      <div className="flex items-center gap-2">
        <div
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-full",
            statusStyles.badge,
          )}
        >
          {statusStyles.icon}
        </div>
        <div>
          <p className="font-medium">
            {player.displayName}
            {isMe && <span className="ml-1 text-primary text-xs">(You)</span>}
          </p>
          <p className="text-muted-foreground text-xs">Bet on position {bet.proposedIndex + 1}</p>
        </div>
      </div>
      <div className="text-right">
        <p className={cn("font-medium", statusStyles.labelClass)}>{statusStyles.label}</p>
      </div>
    </div>
  );
}

function BettingResults({
  bets,
  meId,
  playersById,
}: {
  bets: BetWithPlayer[];
  meId: Id<"players"> | undefined;
  playersById: Map<Id<"players">, Doc<"players">>;
}): React.ReactNode {
  const rows = bets.flatMap((bet) => {
    const player = playersById.get(bet.playerId);
    if (!player) {
      return [];
    }
    return [<BetRow bet={bet} isMe={bet.playerId === meId} key={bet.playerId} player={player} />];
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 font-medium text-sm">
        <Users className="h-4 w-4" />
        <span>Betting Results</span>
      </div>
      <div className="grid gap-2">{rows}</div>
    </div>
  );
}

function RoundRevealPlaceholder({ t }: { t: ReturnType<typeof useTranslations> }): React.ReactNode {
  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center justify-center space-y-4 py-12">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
          <Music className="h-8 w-8 text-green-600 dark:text-green-400" />
        </div>
        <div className="space-y-2 text-center">
          <p className="font-medium text-lg">{t("roundResults")}</p>
          <p className="text-muted-foreground text-sm">{t("songRevealed")}</p>
        </div>
      </div>
    </div>
  );
}

function getPlacementResultText(args: {
  isCorrect: boolean;
  name: string;
  t: ReturnType<typeof useTranslations>;
}): string {
  const result = args.isCorrect ? "in the valid range" : "outside the valid range";
  return args.t("placementResult", { name: args.name, result });
}

function ResolvedAtFooter({ formattedTime }: { formattedTime: string }): React.ReactNode {
  return (
    <div className="rounded-lg bg-muted/50 p-3 text-center text-muted-foreground text-sm">
      <div className="flex items-center justify-center gap-2">
        <Clock className="h-4 w-4" />
        <span>Resolved at {formattedTime}</span>
      </div>
    </div>
  );
}

function HostNextRoundButton({
  isResolving,
  onNext,
}: {
  isResolving: boolean;
  onNext: () => void;
}): React.ReactNode {
  return (
    <Button className="w-full" disabled={isResolving} onClick={onNext} size="lg">
      {isResolving ? (
        <>
          <Clock className="mr-2 h-4 w-4 animate-spin" />
          Advancing...
        </>
      ) : (
        <>
          <Trophy className="mr-2 h-4 w-4" />
          Start Next Round
        </>
      )}
    </Button>
  );
}

function WaitingForHost(): React.ReactNode {
  return (
    <div className="rounded-lg bg-muted/50 p-4 text-center">
      <div className="flex items-center justify-center gap-2 text-muted-foreground">
        <Clock className="h-4 w-4 animate-pulse" />
        <span>Waiting for host to start next round...</span>
      </div>
    </div>
  );
}

export function RoundResults(): React.ReactNode {
  const t = useTranslations("results");
  const { state, meta } = useGame();
  const [isResolving, setIsResolving] = useState(false);
  const [showCorrectness, setShowCorrectness] = useState(false);

  const { track, players, me, currentRound, turnPlayer } = state;
  const { lobbyId } = meta;

  const resolution = currentRound?.resolution;

  const resolveAndNext = useSessionMutation(api.games.resolveAndNext);
  const roundBets = useQuery(api.bets.listForRound, lobbyId ? { lobbyId } : "skip");

  const isHost = players.find((player) => player._id === me?._id)?.isHost ?? false;

  useEffect(() => {
    const timer = setTimeout(() => setShowCorrectness(true), 300);
    return () => clearTimeout(timer);
  }, []);

  const handleNextRound = async (): Promise<void> => {
    await runTrackedMutation({
      errorLabel: "Failed to advance to next round:",
      mutation: () => resolveAndNext({ lobbyId }),
      setLoading: setIsResolving,
    });
  };

  const playersById = new Map(players.map((player) => [player._id, player]));

  const bettingBets: BetWithPlayer[] = roundBets
    ? roundBets.filter((bet) => !bet.declinedToBet)
    : [];

  // Safe to format in the user's locale: this tree renders exclusively from
  // client-side Convex query results, so it is never server-rendered.
  const formatTime = (timestamp: number): string => {
    // react-doctor-disable-next-line react-doctor/no-locale-format-in-render
    return new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const isTurnPlayerCorrect = resolution?.turnPlayerWasCorrect ?? false;
  const correctnessStyles = getCorrectnessStyles(showCorrectness, isTurnPlayerCorrect);
  const placementResultText = getPlacementResultText({
    isCorrect: isTurnPlayerCorrect,
    name: turnPlayer?.displayName ?? "Player",
    t,
  });

  if (!(resolution && track && turnPlayer)) {
    return <RoundRevealPlaceholder t={t} />;
  }

  return (
    <div className="space-y-6">
      <SongReveal correctnessStyles={correctnessStyles} placementResultText={placementResultText} />

      {showCorrectness && <SongCard t={t} track={track} />}

      {showCorrectness && (
        <CardAwards
          meId={me?._id}
          playersById={playersById}
          resolution={resolution}
          turnPlayerId={turnPlayer._id}
        />
      )}

      {bettingBets.length > 0 && (
        <BettingResults bets={bettingBets} meId={me?._id} playersById={playersById} />
      )}

      <ResolvedAtFooter formattedTime={formatTime(resolution.resolvedAt)} />

      {isHost && (
        <HostNextRoundButton
          isResolving={isResolving}
          onNext={() => {
            void handleNextRound();
          }}
        />
      )}

      {!isHost && <WaitingForHost />}
    </div>
  );
}
