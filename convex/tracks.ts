import { v } from "convex/values";
import { query } from "./_generated/server";

export const get = query({
  args: { trackIds: v.array(v.id("tracks")) },
  handler: async (ctx, args) => {
    const { trackIds } = args;

    const tracks = await Promise.all(trackIds.map((trackId) => ctx.db.get(trackId)));

    return tracks;
  },
});
