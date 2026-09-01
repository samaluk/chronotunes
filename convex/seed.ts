import { internalMutation } from "./_generated/server";
import { DEMO_CATALOG } from "./lib/demo_catalog";

export const seed = internalMutation({
  args: {},
  handler: async (ctx) => {
    const existingTracks = await ctx.db.query("tracks").collect();
    if (existingTracks.length > 0) {
      await Promise.all(existingTracks.map((track) => ctx.db.delete(track._id)));
    }

    const lobbyId = await ctx.db.insert("lobbies", {
      code: "TEST01",
      hostSessionId: "host-session",
      settings: {
        allowBetRetraction: true,
        allowGuessTitleArtist: true,
        bettingWindowSeconds: 15,
        maxYear: 2025,
        minYear: 1950,
        showLiveBets: true,
        startingCoins: 3,
        targetTimelineSize: 10,
        turnSeconds: 30,
      },
      status: "lobby",
    });

    const [hostPlayerId, trackIds] = await Promise.all([
      ctx.db.insert("players", {
        coins: 3,
        createdAt: Date.now(),
        displayName: "Host Player",
        isHost: true,
        lobbyId,
        sessionId: "host-session",
        timeline: [],
        timelineSize: 0,
      }),
      Promise.all(
        DEMO_CATALOG.map((track) =>
          ctx.db.insert("tracks", {
            artist: track.artist,
            createdAt: Date.now(),
            externalIds: { youtubeVideoId: track.youtubeVideoId },
            links: {},
            source: "seed",
            title: track.title,
            year: track.year,
          }),
        ),
      ),
    ]);

    return {
      hostPlayerId,
      lobbyCode: "TEST01",
      lobbyId,
      message: "Database seeded successfully",
      trackCount: trackIds.length,
      tracks: DEMO_CATALOG.map((track, index) => ({ ...track, id: trackIds[index] })),
    };
  },
});
