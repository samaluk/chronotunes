# ChronoTunes Implementation Plan

Browser-based multiplayer music timeline game with YouTube audio.

## Stack

### Core

- Next.js 16 (App Router) + TypeScript
- Convex (backend, realtime)
- pnpm (package manager)

### Frontend UI

- Tailwind CSS v4.1
- fluid-tailwindcss (responsive scaling)
- shadcn/ui:
  - Component Library: Base UI
  - Style: Lyra
  - Base Color: Neutral
  - Theme: Fuchsia
  - Icon Library: Lucide
- next-themes (light/dark mode)
- sonner (toasts)

### Convex Ecosystem

- @convex-dev/presence (online status)
- convex-helpers (sessions, relationships)
- Local OSS backend for development (no cloud account needed)

### Tooling

- Biome (linting + formatting, not ESLint)
- typescript-go (faster LSP, Convex compatible)
- just (command runner for local backend)

### Internationalization

- next-intl (cookie-based locale)
- Default locale: es
- Supported locales: en, es

### Utilities

- nuqs (URL query param state, if needed)
- YouTube IFrame API (audio playback)

## Local Development (No Cloud)

Development uses local Convex OSS backend - no cloud account required.

### Prerequisites

- Rust toolchain (for convex-local-backend)
- just (command runner): `brew install just`

### Setup Local Backend

```bash
# Clone convex-backend (one-time)
git clone https://github.com/get-convex/convex-backend.git ~/convex-backend

# Build local backend
cd ~/convex-backend && cargo build --release -p local-backend
```

### Justfile Commands

```just
# Run local Convex backend
run-local-backend:
    ~/convex-backend/target/release/convex-local-backend

# Reset local backend data
reset-local-backend:
    rm -rf convex_local_storage convex_local_backend.sqlite3

# Run convex CLI against local backend
convex *ARGS:
    npx convex {{ARGS}} --url "http://127.0.0.1:3210"
```

### Development Workflow

```bash
# Terminal 1: Run local backend
just run-local-backend

# Terminal 2: Deploy to local backend
just convex dev

# Terminal 3: Run Next.js
pnpm dev
```

### Environment Variables

```env
# .env.local (for local development)
NEXT_PUBLIC_CONVEX_URL=http://127.0.0.1:3210
```

### Testing Against Local Backend

For integration tests requiring real backend behavior:

```bash
# Set IS_TEST env to enable test-only functions
just convex env set IS_TEST true
just convex deploy
pnpm test:integration
```

### When to Use Local vs convex-test

| Scenario                         | Use                   |
| -------------------------------- | --------------------- |
| Unit tests, fast iteration       | convex-test (JS mock) |
| Integration tests, real behavior | Local backend         |
| CI pipeline                      | convex-test (faster)  |
| Testing limits/edge cases        | Local backend         |

## Testing Methodology

### Pre-Commit Checks (must pass)

```bash
pnpm biome check .        # lint + format
pnpm next:typegen         # Next.js types
pnpm convex:typegen       # Convex types
pnpm test                 # vitest
```

### Test Framework

- Vitest + convex-test (Convex mock backend)
- @edge-runtime/vm (Convex runtime simulation)
- Tests live alongside code: `*.test.ts`

### Convex Function Tests

```ts
// convex/lobbies.test.ts
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

test("create lobby generates code", async () => {
  const t = convexTest(schema, modules);
  const result = await t.mutation(api.lobbies.create, {
    displayName: "Host",
  });
  expect(result.code).toHaveLength(6);
});
```

### Component Tests

- React Testing Library for UI components
- Mock Convex queries with vitest mocks

### Automated Testing Loop (ralph-wiggum)

Tests run in opencode-ralph-wiggum loop:

- On each code change, pre-commit checks run automatically
- Failures block commit until fixed
- https://github.com/Th0rgal/opencode-ralph-wiggum

### Code Organization Rules

1. **One component per .tsx file** (except shadcn/ui in components/ui/)
2. Extract subcomponents to separate files
3. Each exported function must have unit tests
4. Pure logic in lib/, tested independently

### Test File Structure

```
convex/
├── lobbies.ts
├── lobbies.test.ts      # tests for lobbies.ts
├── lib/
│   ├── gameLogic.ts
│   └── gameLogic.test.ts
components/
├── game/
│   ├── TimelinePlacer.tsx
│   ├── TimelinePlacer.test.tsx
│   ├── BettingSlot.tsx
│   └── BettingSlot.test.tsx
```

### vitest.config.ts

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environmentMatchGlobs: [
      ["convex/**", "edge-runtime"],
      ["**", "jsdom"],
    ],
    server: { deps: { inline: ["convex-test"] } },
  },
});
```

## Project Structure

```
chronotunes/
├── src/
│   ├── app/
│   │   ├── page.tsx              # Landing
│   │   ├── lobby/[code]/page.tsx # Lobby + game
│   │   ├── layout.tsx            # Root layout with NextIntlClientProvider
│   │   └── providers.tsx
│   ├── components/
│   │   ├── ui/                   # shadcn
│   │   ├── lobby/
│   │   ├── game/
│   │   ├── player/               # YouTube wrapper
│   │   └── settings/
│   ├── i18n/
│   │   ├── request.ts            # getRequestConfig for next-intl
│   │   └── routing.ts            # Locale routing config
│   └── lib/
│       ├── session.ts            # Client sessionId
│       └── hooks/
├── convex/
│   ├── schema.ts
│   ├── lib/                      # sessionWrapper, gameLogic
│   ├── lobbies.ts
│   ├── players.ts
│   ├── games.ts
│   ├── rounds.ts
│   ├── bets.ts
│   └── tracks.ts
└── messages/
    ├── en.json                   # English translations
    └── es.json                   # Spanish (default)
```

## Data Model

### lobbies

- code: string (6-char alphanumeric, indexed)
- hostSessionId: string
- hostTransferDeadline?: number (set when host disconnects)
- status: "lobby" | "in_game" | "finished"
- settings: { targetTimelineSize, startingCoins, turnSeconds, bettingWindowSeconds, allowGuessTitleArtist, showLiveBets, allowBetRetraction, minYear, maxYear }
- activeGameId?: Id<games>

### players

- lobbyId: Id<lobbies> (indexed)
- sessionId: string (indexed with lobbyId)
- displayName: string
- isHost: boolean
- coins: number
- timeline: [{ trackId, year, earnedAtRoundNumber, earnedBy }] (embedded, max 10)
- timelineSize: number (denormalized)
- createdAt: number

### games

- lobbyId: Id<lobbies> (indexed)
- status: "active" | "paused" | "finished"
- startedAt, endedAt?: number
- currentRoundNumber: number
- currentRoundId?: Id<rounds>
- turnPlayerId?: Id<players>
- turnOrder: Id<players>[] (explicit order)
- winnerPlayerId?: Id<players>

### rounds

- gameId: Id<games> (indexed)
- roundNumber: number
- turnPlayerId: Id<players>
- trackId: Id<tracks>
- phase: "placing" | "betting" | "resolved"
- startedAt: number
- placementPreview?: { proposedIndex, updatedAt }
- placement?: { proposedIndex, submittedAt }
- guess?: { guessedTitle, guessedArtist, isCorrect, awardedCoin, submittedAt }
- resolution?: { validIndexMin, validIndexMax, turnPlayerWasCorrect, awardedPlayerIds, coinDeltas, resolvedAt }

### roundBets

- roundId: Id<rounds> (indexed, also with proposedIndex, also with playerId)
- playerId: Id<players>
- proposedIndex: number
- placedAt: number
- lockedIn: boolean (two-step: preview → confirm)
- status: "pending" | "won" | "lost"

### tracks

- mbid?: string
- title, artist: string
- year: number (indexed with \_creationTime)
- durationMs?: number
- externalIds: { spotifyTrackId?, youtubeVideoId?, deezerTrackId? }
- links: { spotifyUrl?, youtubeUrl?, deezerUrl? }
- createdAt: number
- source: string

## Game Rules (Core Logic)

### Placement Validation

- Timeline sorted by year ascending
- New song correct if placed in valid range for its year
- Same-year songs: any order among them is valid
- validIndexMin/validIndexMax computed from year boundaries

### Betting Outcomes

| Turn Player | Bettor Index | Result                       |
| ----------- | ------------ | ---------------------------- |
| Correct     | Any          | Bettor loses coin            |
| Wrong       | Valid        | Bettor wins card, keeps coin |
| Wrong       | Invalid      | Bettor loses coin            |

### Two-Step Betting

1. Player selects slot → bet created, lockedIn=false (ghost)
2. Player confirms → lockedIn=true (solid)
3. Only locked bets count at resolution
4. Unlocked bets auto-cancelled (coin refunded)

### Win Condition

First player with timelineSize >= targetTimelineSize wins.

## Query Architecture (Decoupled)

| Query                             | Purpose                     |
| --------------------------------- | --------------------------- |
| lobbies.get(code)                 | Lobby state, settings, host |
| players.list(lobbyId)             | All players summary         |
| players.getMe(lobbyId)            | Current user details        |
| games.getCurrent(lobbyId)         | Game state                  |
| rounds.getCurrent(gameId)         | Round phase, placement      |
| bets.listForRound(roundId)        | Bets (if showLiveBets)      |
| tracks.getForRound(roundId)       | Host only, full metadata    |
| tracks.getPublicForRound(roundId) | Post-reveal metadata        |

## Mutations

### Lobby

- lobbies.create → generates code, creates host player
- lobbies.join(code, displayName)
- lobbies.leave
- lobbies.updateSettings (host)
- lobbies.transferHost (host)
- lobbies.kick (host)

### Game

- games.start (host)
- rounds.setPlacementPreview (turn player)
- rounds.submitPlacement (turn player)
- rounds.submitGuess (turn player)
- bets.preview (non-turn) → creates unlocked bet
- bets.lockIn (non-turn) → locks bet
- bets.cancel (non-turn) → removes unlocked bet, refunds coin
- games.resolveAndNext (host)
- games.skipTurn (host) → skip disconnected player

## Host Failover

1. Presence detects host disconnect
2. Set lobby.hostTransferDeadline = now + 30s, game.status = "paused"
3. Schedule checkHostTransfer in 30s
4. If still disconnected: random online player becomes host, resume
5. Original host can rejoin as normal player
6. Manual transfer via lobbies.transferHost anytime

## UI Components

```
/lobby/[code]
├── LobbyLayout
│   ├── Header (code, player count, host controls)
│   └── PresenceIndicators
├── [lobby] → LobbyWaitingRoom
│   ├── PlayerList
│   ├── SettingsPanel (host)
│   └── StartGameButton (host)
├── [in_game] → GameView
│   ├── GameHeader (round#, turn, soft timer)
│   ├── YouTubePlayer (host only)
│   ├── PlayersBar (timelines, coins)
│   ├── CurrentRoundPanel
│   │   ├── TimelinePlacer (turn player, placing)
│   │   ├── WaitingView (others, placing)
│   │   ├── BettingPanel (betting)
│   │   └── RoundResults (resolved)
│   └── MyTimeline
└── [finished] → GameResults
```

## Track Seeding

- Deferred to later phase
- YouTube-only for MVP (videoId required)
- Manual JSON import or future seed script

## Implementation Phases

### Phase 1: Foundation

- [ ] Init Next.js 16 + Convex + pnpm
- [ ] Local Convex backend setup (Justfile)
- [ ] Biome setup (replace ESLint)
- [ ] Vitest + convex-test setup
- [ ] vitest.config.ts with edge-runtime
- [ ] Schema (all tables + indexes)
- [ ] Presence component setup
- [ ] Session management (convex-helpers)
- [ ] Tailwind v4.1 + fluid-tailwindcss
- [ ] shadcn/ui (Lyra style, Fuchsia theme)
- [ ] next-themes + sonner
- [ ] Session ID client util (localStorage)
- [ ] typescript-go config
- [ ] next-intl setup (src/i18n/request.ts, src/i18n/routing.ts)
- [ ] messages/en.json with initial translation keys

### Phase 2: Lobby

- [ ] lobbies.create mutation + tests
- [ ] lobbies.join mutation + tests
- [ ] lobbies.leave mutation + tests
- [ ] lobbies.get query + tests
- [ ] players.list query + tests
- [ ] players.getMe query + tests
- [ ] Lobby page + waiting room UI
- [ ] Settings panel component
- [ ] Presence indicators component

### Phase 3: Core Game Loop

- [ ] games.start mutation + tests
- [ ] Track selection algorithm + tests
- [ ] rounds.getCurrent query + tests
- [ ] rounds.setPlacementPreview mutation + tests
- [ ] rounds.submitPlacement mutation + tests
- [ ] bets.preview mutation + tests
- [ ] bets.lockIn mutation + tests
- [ ] bets.cancel mutation + tests
- [ ] bets.listForRound query + tests
- [ ] games.resolveAndNext mutation + tests
- [ ] games.skipTurn mutation + tests
- [ ] Win condition logic + tests

### Phase 4: Game UI

- [ ] Game view layout
- [ ] TimelinePlacer component + tests
- [ ] BettingSlot component + tests
- [ ] BettingPanel component + tests
- [ ] RoundResults component + tests
- [ ] PlayersBar component + tests
- [ ] SoftTimer component + tests
- [ ] MyTimeline component + tests

### Phase 5: Audio + Tracks

- [ ] YouTubePlayer component + tests
- [ ] Video error handling (fallback to new song)
- [ ] Manual track import (JSON or dashboard)
- [ ] tracks.getForRound query + tests
- [ ] tracks.getPublic query + tests

### Phase 6: Polish

- [ ] Host disconnect detection + tests
- [ ] Host failover (pause + timer + transfer) + tests
- [ ] Manual host transfer + tests
- [ ] Player disconnect handling + tests
- [ ] Title/artist guessing
- [ ] Game restart flow
- [ ] Loading/error states

### Phase 7: Observability

- [ ] Sentry (frontend + backend wrappers)
- [ ] PostHog analytics

## Decisions

| Area          | Decision                               |
| ------------- | -------------------------------------- |
| Structure     | Single repo with `src/` for app code   |
| Timeline      | Embedded array (max 10)                |
| Queries       | Decoupled (6+ queries)                 |
| State         | No client lib, Convex only             |
| Sessions      | localStorage + convex-helpers          |
| Lobby codes   | 6-char alphanumeric                    |
| Timer         | Soft (advisory)                        |
| Audio         | YouTube IFrame, all clients load video |
| Tracks        | Deferred, manual import for MVP        |
| Host failover | 30s timer, auto-transfer               |
| i18n          | next-intl, cookie-based locale         |

## Unresolved Questions

None - all questions resolved.

---

## Resolved Questions (Reference)

1. **Audio**: All players load same YouTube video. Accept minor sync differences.

2. **Year definition**: Original release year.

3. **Track seeding**: Deferred. YouTube-only for MVP, manual import.

4. **Video unavailable**: Fallback to new song if video fails to load.

5. **Same-year placement**: Any order valid for same year (turn player).
   - Bettors can only win if turn player is WRONG
   - If turn player correct (including same-year valid): bettors LOSE coins
   - If turn player wrong: bettors with valid index win card, others lose coin

6. **Bet visibility**: Two-step betting (preview → lock in).
   - Ghost (semi-transparent) = not locked in
   - Solid = locked in
   - May change to show only locked-in bets

7. **Turn player disconnect**: Host can manually skip turn. Server state is authoritative.
