import type { Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";

interface TrackSelectionOptions {
  gameId: Id<"games">;
  maxYear: number;
  minYear: number;
}

interface SelectedTrack {
  artist: string;
  title: string;
  trackId: Id<"tracks">;
  year: number;
}

export async function selectTrackForRound(
  ctx: QueryCtx,
  options: TrackSelectionOptions
): Promise<SelectedTrack | null> {
  const { gameId, minYear, maxYear } = options;

  const allTracks = await ctx.db
    .query("tracks")
    .filter((q) =>
      q.and(q.gte(q.field("year"), minYear), q.lte(q.field("year"), maxYear))
    )
    .collect();

  if (allTracks.length === 0) {
    return null;
  }

  const usedTrackIds = await getUsedTrackIds(ctx, gameId);

  const availableTracks = allTracks.filter(
    (track) => !usedTrackIds.has(track._id)
  );

  if (availableTracks.length === 0) {
    return null;
  }

  const randomIndex = Math.floor(Math.random() * availableTracks.length);
  const selectedTrack = availableTracks[randomIndex]!;

  return {
    artist: selectedTrack.artist,
    title: selectedTrack.title,
    trackId: selectedTrack._id,
    year: selectedTrack.year,
  };
}

async function getUsedTrackIds(
  ctx: QueryCtx,
  gameId: Id<"games">
): Promise<Set<Id<"tracks">>> {
  const usedTrackIds = new Set<Id<"tracks">>();

  const rounds = await ctx.db
    .query("rounds")
    .filter((q) => q.eq(q.field("gameId"), gameId))
    .collect();

  for (const round of rounds) {
    usedTrackIds.add(round.trackId);
  }

  const game = await ctx.db.get(gameId);
  if (!game) {
    return usedTrackIds;
  }

  const players = await ctx.db
    .query("players")
    .filter((q) => q.eq(q.field("lobbyId"), game.lobbyId))
    .collect();

  for (const player of players) {
    for (const entry of player.timeline) {
      usedTrackIds.add(entry.trackId);
    }
  }

  return usedTrackIds;
}
