import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import type { SelectedTrack } from "./track_selection";
import { selectTrackForRound } from "./track_selection";

export interface NextRoundResult {
  nextRoundId: Id<"rounds">;
  nextTurnPlayerId: Id<"players">;
  selectedTrack: SelectedTrack;
}

export async function createNextRound(
  ctx: MutationCtx,
  game: Doc<"games">,
  lobby: Doc<"lobbies">,
): Promise<NextRoundResult | { gameEnded: true; noTracksAvailable: true }> {
  // oxlint-disable-next-line typescript/no-non-null-assertion
  const currentTurnIndex = game.turnOrder.indexOf(game.turnPlayerId!);

  if (currentTurnIndex === -1) {
    throw new ConvexError("Turn player not found in turn order");
  }

  const nextTurnIndex = (currentTurnIndex + 1) % game.turnOrder.length;
  // oxlint-disable-next-line typescript/no-non-null-assertion, typescript/no-unnecessary-type-assertion
  const nextTurnPlayerId = game.turnOrder[nextTurnIndex]!;
  const nextRoundNumber = game.currentRoundNumber + 1;

  const selectedTrack = await selectTrackForRound(ctx, {
    gameId: game._id,
    maxYear: lobby.settings.maxYear,
    minYear: lobby.settings.minYear,
  });

  if (!selectedTrack) {
    await ctx.db.patch(game._id, {
      endedAt: Date.now(),
      status: "finished",
    });

    await ctx.db.patch(lobby._id, { status: "finished" });

    return { gameEnded: true, noTracksAvailable: true };
  }

  const nextRoundId = await ctx.db.insert("rounds", {
    gameId: game._id,
    phase: "placing",
    roundNumber: nextRoundNumber,
    startedAt: Date.now(),
    trackId: selectedTrack.trackId,
    turnPlayerId: nextTurnPlayerId,
  });

  await ctx.db.patch(game._id, {
    currentRoundId: nextRoundId,
    currentRoundNumber: nextRoundNumber,
    turnPlayerId: nextTurnPlayerId,
  });

  return { nextRoundId, nextTurnPlayerId, selectedTrack };
}

export function shuffleArray<T>(array: readonly T[]): T[] {
  const shuffled = [...array];

  for (let i = shuffled.length - 1; i >= 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    // oxlint-disable-next-line typescript/no-non-null-assertion, typescript/no-unnecessary-type-assertion
    const temp = shuffled[i]!;
    // oxlint-disable-next-line typescript/no-non-null-assertion
    shuffled[i] = shuffled[j]!;
    shuffled[j] = temp;
  }

  return shuffled;
}

import { ConvexError } from "convex/values";
