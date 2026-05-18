# Convex backend

## Function organization

- Mutations and queries live in `convex/*.ts`.
- Pure logic lives in `convex/lib/*.ts`.
- Use `convex-helpers` sessionWrapper for auth.

```typescript
import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const create = mutation({
  args: { displayName: v.string() },
  handler: async (ctx, args) => {
    // Implementation
  },
});
```

## Error handling

- Throw `ConvexError` with user-friendly messages in Convex functions.
- Use React error boundaries for unexpected errors.
- Handle known UI error states (loading, not found, unauthorized).

```typescript
import { ConvexError } from "convex/values";

if (!lobby) {
  throw new ConvexError("Lobby not found");
}
```

## Query patterns

Use decoupled queries instead of fetching everything in one query.

```typescript
const lobby = useQuery(api.lobbies.get, { code });
const players = useQuery(
  api.players.list,
  lobby ? { lobbyId: lobby._id } : "skip"
);
const me = useQuery(api.players.getMe, lobby ? { lobbyId: lobby._id } : "skip");
```

## Real-time state

All game state lives in Convex. Do not use client-side state libraries.

## Session management

Client session ID helper in `lib/session.ts`:

```typescript
export function getSessionId(): string {
  let id = localStorage.getItem("sessionId");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("sessionId", id);
  }
  return id;
}
```
