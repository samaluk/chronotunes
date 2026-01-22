import { ConvexError, v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { mutationWithSession, queryWithSession } from "./lib/sessions";

export const getCurrent = queryWithSession({
  args: { lobbyId: v.id("lobbies") },
  handler: async (ctx, args) => {
    const { lobbyId } = args;

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

    const canSeeTrack = round.phase === "resolved";

    let trackInfo:
      | { trackId: Id<"tracks">; youtubeVideoId?: string }
      | {
          trackId: Id<"tracks">;
          title: string;
          artist: string;
          year: number;
          youtubeVideoId?: string;
        }
      | null = null;

    const track = await ctx.db.get(round.trackId);
    if (track) {
      if (canSeeTrack) {
        trackInfo = {
          trackId: track._id,
          title: track.title,
          artist: track.artist,
          year: track.year,
          youtubeVideoId: track.externalIds.youtubeVideoId ?? undefined,
        };
      } else {
        trackInfo = {
          trackId: track._id,
          youtubeVideoId: track.externalIds.youtubeVideoId ?? undefined,
        };
      }
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
    };
  },
});

export const setPlacementPreview = mutationWithSession({
  args: { lobbyId: v.id("lobbies"), proposedIndex: v.number() },
  handler: async (ctx, args) => {
    const { lobbyId, proposedIndex } = args;
    const { sessionId } = ctx;

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
      .withIndex("by_lobby_and_session", (q) => q.eq("lobbyId", lobbyId).eq("sessionId", sessionId))
      .unique();

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

export const submitPlacement = mutationWithSession({
  args: { lobbyId: v.id("lobbies") },
  handler: async (ctx, args) => {
    const { lobbyId } = args;
    const { sessionId } = ctx;

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

    if (round.placement) {
      throw new ConvexError("Placement has already been submitted");
    }

    const player = await ctx.db
      .query("players")
      .withIndex("by_lobby_and_session", (q) => q.eq("lobbyId", lobbyId).eq("sessionId", sessionId))
      .unique();

    if (!player) {
      throw new ConvexError("Player not found in this lobby");
    }

    if (round.phase !== "placing") {
      throw new ConvexError("Can only submit placement during placing phase");
    }

    if (round.turnPlayerId !== player._id) {
      throw new ConvexError("Only the turn player can submit placement");
    }

    if (!round.placementPreview) {
      throw new ConvexError("Please preview your placement first");
    }

    await ctx.db.patch(round._id, {
      placement: {
        proposedIndex: round.placementPreview.proposedIndex,
        submittedAt: Date.now(),
      },
      phase: "betting",
    });
  },
});
