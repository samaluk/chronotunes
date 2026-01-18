import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { query } from "./_generated/server";

export const getCurrent = query({
  args: { lobbyId: v.id("lobbies"), sessionId: v.string() },
  handler: async (ctx, args) => {
    const { lobbyId, sessionId } = args;

    const lobby = await ctx.db.get(lobbyId);

    if (!lobby || !lobby.activeGameId) {
      return null;
    }

    const game = await ctx.db.get(lobby.activeGameId);

    if (!game || !game.currentRoundId) {
      return null;
    }

    const round = await ctx.db.get(game.currentRoundId);

    if (!round) {
      return null;
    }

    const isHost = lobby.hostSessionId === sessionId;
    const canSeeTrack = round.phase === "resolved" || isHost;

    let trackInfo:
      | { trackId: Id<"tracks"> }
      | {
          trackId: Id<"tracks">;
          title: string;
          artist: string;
          year: number;
          youtubeVideoId: string;
        }
      | null = null;

    if (canSeeTrack) {
      const track = await ctx.db.get(round.trackId);
      if (track) {
        trackInfo = {
          trackId: track._id,
          title: track.title,
          artist: track.artist,
          year: track.year,
          youtubeVideoId: track.externalIds.youtubeVideoId ?? "",
        };
      }
    } else {
      trackInfo = { trackId: round.trackId };
    }

    return {
      _id: round._id,
      _creationTime: round._creationTime,
      gameId: round.gameId,
      roundNumber: round.roundNumber,
      turnPlayerId: round.turnPlayerId,
      phase: round.phase,
      startedAt: round.startedAt,
      placementPreview: round.placementPreview,
      placement: round.placement,
      guess: round.guess,
      resolution: round.resolution,
      track: trackInfo,
      isHost,
    };
  },
});
