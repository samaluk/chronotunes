import type { SessionId } from "convex-helpers/server/sessions";
import { SessionIdArg, vSessionId } from "convex-helpers/server/sessions";
import type { MutationCtx, QueryCtx } from "../_generated/server";

export type { SessionId };

export { vSessionId, SessionIdArg };

export async function getSessionId(
  _ctx: QueryCtx | MutationCtx,
  args: { sessionId?: SessionId },
): Promise<SessionId | null> {
  if (args.sessionId && typeof args.sessionId === "string") {
    return args.sessionId as SessionId;
  }

  return null;
}

export async function requireSessionId(
  ctx: QueryCtx | MutationCtx,
  args: { sessionId: SessionId },
): Promise<SessionId> {
  const sessionId = await getSessionId(ctx, args);

  if (!sessionId) {
    throw new Error("Session ID is required but was not provided");
  }

  return sessionId;
}
