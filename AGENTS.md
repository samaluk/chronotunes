# AGENTS.md - ChronoTunes

Guidelines for AI coding agents working in this repository.

## Project Overview

Browser-based multiplayer music timeline game (Hitster clone) with YouTube audio.
- **Frontend**: Next.js 16 (App Router) + TypeScript
- **Backend**: Convex (realtime BaaS)
- **Package Manager**: pnpm

## Commands

### Development
```bash
pnpm dev                    # Start Next.js dev server
just run-local-backend      # Start local Convex backend (Terminal 1)
just convex dev             # Deploy to local backend (Terminal 2)
```

### Linting & Formatting
```bash
pnpm biome check .          # Lint + format check
pnpm biome check . --write  # Auto-fix lint + format issues
pnpm biome format .         # Format only
```

### Type Generation
```bash
pnpm next:typegen           # Generate Next.js types
pnpm convex:typegen         # Generate Convex types
```

### Testing
```bash
pnpm test                   # Run all tests (vitest)
pnpm test <file>            # Run single test file
pnpm test <pattern>         # Run tests matching pattern
pnpm test --watch           # Watch mode
pnpm test:integration       # Integration tests against local backend
```

### Pre-Commit (must all pass)
```bash
pnpm biome check .
pnpm next:typegen
pnpm convex:typegen
pnpm test
```

## Code Style

### Formatting (Biome)
- **NOT ESLint** - this project uses Biome
- 2 space indentation
- Double quotes for strings
- Semicolons required
- Trailing commas in multiline

### Imports
```typescript
// Order: external packages, then internal, then relative
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { GameHeader } from "./GameHeader";
```

### TypeScript
- Strict mode enabled
- Explicit return types on exported functions
- Use `type` for object shapes, `interface` for extendable contracts
- Prefer `unknown` over `any`
- Use Convex's `Id<"tableName">` for document IDs

```typescript
// Good
export function computeValidRange(timeline: TimelineEntry[], year: number): Range {
  // ...
}

// Bad - no return type
export function computeValidRange(timeline: TimelineEntry[], year: number) {
```

### Naming Conventions
- **Files**: kebab-case (`game-logic.ts`, `betting-panel.tsx`)
- **Components**: PascalCase (`TimelinePlacer.tsx` exports `TimelinePlacer`)
- **Functions/variables**: camelCase
- **Constants**: SCREAMING_SNAKE_CASE
- **Types/Interfaces**: PascalCase

### React Components
- One component per `.tsx` file (except `components/ui/`)
- Extract subcomponents to separate files
- Use function declarations, not arrow functions for components

```typescript
// Good
export function PlayerCard({ player }: PlayerCardProps) {
  return <div>...</div>;
}

// Bad
export const PlayerCard = ({ player }: PlayerCardProps) => {
  return <div>...</div>;
};
```

### Convex Functions
- Mutations and queries in `convex/*.ts`
- Pure logic in `convex/lib/*.ts`
- Use `convex-helpers` sessionWrapper for auth

```typescript
// convex/lobbies.ts
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const create = mutation({
  args: { displayName: v.string() },
  handler: async (ctx, args) => {
    // Implementation
  },
});
```

### Error Handling
- Throw `ConvexError` in Convex functions with user-friendly messages
- Use error boundaries in React for unexpected errors
- Handle known error states in UI (loading, not found, unauthorized)

```typescript
import { ConvexError } from "convex/values";

if (!lobby) {
  throw new ConvexError("Lobby not found");
}
```

## Testing

### Test File Location
Tests live alongside source files:
```
convex/lobbies.ts           → convex/lobbies.test.ts
convex/lib/gameLogic.ts     → convex/lib/gameLogic.test.ts
components/game/Timer.tsx   → components/game/Timer.test.tsx
```

### Convex Function Tests
```typescript
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

test("create lobby generates 6-char code", async () => {
  const t = convexTest(schema, modules);
  const result = await t.mutation(api.lobbies.create, { displayName: "Host" });
  expect(result.code).toHaveLength(6);
});
```

### Component Tests
```typescript
import { render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { PlayerCard } from "./PlayerCard";

test("displays player name", () => {
  render(<PlayerCard player={{ displayName: "Alice", coins: 3 }} />);
  expect(screen.getByText("Alice")).toBeInTheDocument();
});
```

## Project Structure

```
app/
  [locale]/               # i18n locale segment (en, es, fr, de, pt, ja)
    page.tsx              # Landing page
    lobby/[code]/page.tsx # Lobby + game view
    layout.tsx            # Locale layout with NextIntlClientProvider
  layout.tsx              # Root layout
  providers.tsx           # Context providers

components/
  ui/                     # shadcn/ui components (multi-component files OK)
  lobby/                  # Lobby-specific components
  game/                   # Game-specific components
  player/                 # YouTube player wrapper

convex/
  schema.ts               # Database schema
  lib/                    # Pure logic (sessionWrapper, gameLogic)
  lobbies.ts              # Lobby mutations/queries
  players.ts              # Player mutations/queries
  games.ts                # Game mutations/queries
  rounds.ts               # Round mutations/queries
  bets.ts                 # Betting mutations/queries
  tracks.ts               # Track queries

i18n/
  request.ts              # getRequestConfig for next-intl
  routing.ts              # Locale routing config (defineRouting)

messages/
  en.json                 # English translations (default)
  es.json                 # Spanish
  fr.json                 # French
  de.json                 # German
  pt.json                 # Portuguese
  ja.json                 # Japanese

lib/
  session.ts              # Client sessionId (localStorage)
  hooks/                  # Custom React hooks
```

## UI Stack

- **Tailwind CSS v4.1** with fluid-tailwindcss
- **shadcn/ui**: Lyra style, Neutral base, Fuchsia theme
- **Icons**: Lucide
- **Theming**: next-themes (light/dark)
- **Toasts**: sonner
- **i18n**: next-intl (internationalization)

## Key Patterns

### Session Management
```typescript
// Client: lib/session.ts
export function getSessionId(): string {
  let id = localStorage.getItem("sessionId");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("sessionId", id);
  }
  return id;
}
```

### Convex Queries
```typescript
// Decoupled queries - don't fetch everything in one query
const lobby = useQuery(api.lobbies.get, { code });
const players = useQuery(api.players.list, lobby ? { lobbyId: lobby._id } : "skip");
const me = useQuery(api.players.getMe, lobby ? { lobbyId: lobby._id } : "skip");
```

### Real-time State
All game state lives in Convex. No client-side state management library.
Convex subscriptions handle real-time updates automatically.

## Internationalization (next-intl)

### File Structure
```
i18n/
  request.ts          # getRequestConfig
  routing.ts          # defineRouting with locales
messages/
  en.json             # English (default)
  es.json             # Spanish
  fr.json             # French
  de.json             # German
  pt.json             # Portuguese
  ja.json             # Japanese
```

### Translation Keys
Use nested namespaces matching component structure:
```json
{
  "common": {
    "loading": "Loading...",
    "error": "An error occurred"
  },
  "lobby": {
    "title": "Game Lobby",
    "joinCode": "Join Code",
    "startGame": "Start Game"
  },
  "game": {
    "round": "Round {number}",
    "yourTurn": "Your Turn",
    "placeSong": "Place this song on your timeline"
  }
}
```

### Using Translations
```typescript
// In Server Components
import { getTranslations } from "next-intl/server";

export default async function LobbyPage() {
  const t = await getTranslations("lobby");
  return <h1>{t("title")}</h1>;
}

// In Client Components
"use client";
import { useTranslations } from "next-intl";

export function StartButton() {
  const t = useTranslations("lobby");
  return <Button>{t("startGame")}</Button>;
}
```

### Linking with Locale
```typescript
import { Link } from "@/i18n/routing";

// Automatically preserves current locale
<Link href="/lobby/ABC123">Join Lobby</Link>
```

### Adding New Translation Keys
1. Add key to `messages/en.json` first
2. Add same key to all other locale files
3. Use `t("namespace.key")` in components
4. Never hardcode user-facing strings

## Don't

- Don't use ESLint (use Biome)
- Don't use client-side state libraries (Zustand, Redux) - use Convex
- Don't use `any` type
- Don't create documentation files unless explicitly requested
- Don't add emojis unless explicitly requested
- Don't put multiple components in one file (except `components/ui/`)
- Don't hardcode user-facing strings (use next-intl translations)
