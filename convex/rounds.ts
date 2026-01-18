import { ConvexError, v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";

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

export const setPlacementPreview = mutation({
  args: { lobbyId: v.id("lobbies"), sessionId: v.string(), proposedIndex: v.number() },
  handler: async (ctx, args) => {
    const { lobbyId, sessionId, proposedIndex } = args;

    const lobby = await ctx.db.get(lobbyId);

    if (!lobby) {
      throw new ConvexError("Lobby not found");
    }

    if (!lobby.activeGameId) {
      throw new ConvexError("No active game in this lobby");
    }

    const game = await ctx.db.get(lobby.activeGameId);

    if (!game) {
      throw new ConvexError("Game not found");
    }

    if (!game.currentRoundId) {
      throw new ConvexError("No current round in this game");
    }

    const round = await ctx.db.get(game.currentRoundId);

    if (!round) {
      throw new ConvexError("Round not found");
    }

    if (round.phase !== "placing") {
      throw new ConvexError("Can only preview placement during placing phase");
    }

    const player = await ctx.db
      .query("players")
      .filter((q) =>
        q.and(q.eq(q.field("lobbyId"), lobbyId), q.eq(q.field("sessionId"), sessionId)),
      )
      .first();

    if (!player) {
      throw new ConvexError("Player not found in this lobby");
    }

    if (round.turnPlayerId !== player._id) {
      throw new ConvexError("Only the turn player can preview placement");
    }

    if (proposedIndex < 0) {
      throw new ConvexError("Proposed index cannot be negative");
    }

    await ctx.db.patch(round._id, {
      placementPreview: {
        proposedIndex,
        updatedAt: Date.now(),
      },
    });
  },
});
