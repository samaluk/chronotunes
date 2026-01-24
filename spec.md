# Hitster-like Online Game – High-Level Spec

This document captures the current design decisions for a **Hitster-style online party game** implemented with **Convex** and **Next.js**. It is written to be consumed by a planning / implementation agent.

The emphasis is on:

- Convex-idiomatic data modeling, queries, and mutations. [oai_citation:0‡Convex Developer Hub](https://docs.convex.dev/understanding/best-practices/?utm_source=chatgpt.com)  
- Clean separation of game rules vs. storage vs. UI.
- Mobile-first UI with host-streamed audio and provider-agnostic track metadata.

---

## 1. Product Overview

### 1.1 Concept

Browser-based multiplayer music game inspired by Hitster:

- Players join a lobby via link/code.
- Each round, one player is the **turn player**.
- Host plays a real song locally (Spotify/YouTube/Deezer/etc.). The app shows **no metadata** (title/artist) during play.
- Turn player must place the new song in their **personal timeline** (ordered by year).
- Other players can **bet a coin** on where they believe the song truly belongs in the turn player’s timeline.
- Turn player can optionally **guess title + artist** to earn an extra coin.
- The game ends when a player has **10 songs in their timeline**.

### 1.2 Core Rules

1. **Timeline & Win Condition**
   - Each player has a personal, ordered timeline of songs.
   - A song in a timeline is obtained either by:
     - Correctly placing their own song (as turn player), or
     - Correctly betting on another player’s song when that player is wrong.
   - First player whose timeline reaches the configured **target size** (default 10) wins.

2. **Coins & Betting**
   - Each player starts with `startingCoins` (e.g., 3).
   - On each round, non-turn players may **bet 1 coin** on where the song belongs in the turn player’s timeline.
   - Betting constraints:
     - At most **one bet per player per round**.
     - At most **one bet per index per round** (first-come-first-served for each slot).
   - Coin outcomes:
     - If the turn player is **correct**:
       - Turn player gains the song in their timeline.
       - All bettors get their **1 coin refunded** (no net gain/loss).
     - If the turn player is **wrong**:
       - Bettors whose index is **within the correct range** (see tie rule) earn the song into **their own timeline** and keep their coin (no further gain).
       - Bettors who chose an **incorrect index** permanently **lose** the coin (no refund).
   - Optional **bet retraction** (config flag): If enabled, players may retract their bet during the betting phase, reclaiming their coin.

3. **Guessing Title & Artist**
   - Turn player can submit a **single guess** (title + artist together).
   - If correct (liberal matching), they gain **+1 coin** (independent of placement correctness).

4. **Tie Rule – Same Year**
   - Multiple songs can share the same year.
   - If the new song’s year equals existing years in the turn player’s timeline, **any insertion index among songs with the same year is valid**.
   - Implementation: compute a **valid index range** `[validIndexMin, validIndexMax]` for the new song; any index in that range is considered correct.

5. **Track Bounds**
   - Games can be configured to use only tracks with `minYear ≤ year ≤ maxYear`.

6. **Host-Driven Pacing**
   - Only the **host** can advance the game to the next round via a dedicated mutation that:
     - Resolves the current round (placement, bets, coins, timelines).
     - Optionally starts the next round if no winner exists yet.

---

## 2. Tech Stack

### 2.1 Backend & Realtime

- **Convex** as authoritative backend and realtime sync: queries, mutations, actions, and storage. [oai_citation:1‡Convex Developer Hub](https://docs.convex.dev/understanding/best-practices/?utm_source=chatgpt.com)  
- Use **Convex best practices**:
  - Index every large query.
  - Use `.collect()` only on small result sets (bounded). [oai_citation:2‡Convex Developer Hub](https://docs.convex.dev/understanding/best-practices/?utm_source=chatgpt.com)  
  - Use argument validators and access control in all public functions. [oai_citation:3‡Convex Developer Hub](https://docs.convex.dev/understanding/best-practices/?utm_source=chatgpt.com)  

- **Convex Components**:
  - **Presence component** for live-updating list of users in a lobby (no custom `isConnected` field). [oai_citation:4‡Convex](https://www.convex.dev/components/presence?utm_source=chatgpt.com)  

- **convex-helpers**:
  - **Session tracking without cookies** via parameter injection and wrappers (sessionId stored client-side). [oai_citation:5‡Stack by Convex](https://stack.convex.dev/track-sessions-without-cookies?utm_source=chatgpt.com)  
  - **Relationship helpers** to traverse relational data (players ↔ lobbies ↔ games ↔ rounds ↔ tracks) in readable, composable functions instead of hand-rolled joins. [oai_citation:6‡Stack by Convex](https://stack.convex.dev/functional-relationships-helpers?utm_source=chatgpt.com)  

### 2.2 Frontend

- **Next.js** (App Router) + **TypeScript**.
- **Tailwind CSS v4** + **shadcn/ui** for fast, accessible component styling.
- **next-intl** for internationalization:
  - Cookie-based locale with no URL prefix
  - Default locale: `es`
  - Supported locales: `en`, `es`
  - Server and client component support via `getTranslations` and `useTranslations`
- No global state library initially; rely on:
  - Convex React client
  - `convex-helpers` richer `useQuery` wrappers for better loading/error/staleness handling. [oai_citation:7‡GitHub](https://github.com/get-convex/convex-helpers?utm_source=chatgpt.com)  
- Mobile-first layout; vertical timelines; host-streamed audio.

### 2.3 Observability & Analytics

- **Sentry**:
  - Wrap Convex queries/mutations/actions via custom “middleware” functions (similar to custom function wrappers used for authorization/sessions). [oai_citation:8‡Stack by Convex](https://stack.convex.dev/authorization?utm_source=chatgpt.com)  
  - Capture `lobbyId`, `gameId`, `roundId`, `sessionId` tags where available.

- **PostHog**:
  - Frontend product analytics: lobby creation, joins, game start, placement submission, bet placement, round resolution, game finish.

- **logtape** or equivalent for structured logs in Convex functions.

### 2.4 Repo Structure

- `src/app` – Next.js App Router pages and layouts.
- `src/components` – UI and feature components.
- `src/i18n` – next-intl configuration.
- `src/lib` – shared utilities and hooks.
- `convex` – Convex schema and functions.

### 2.5 Internationalization (next-intl)

File structure for i18n:
```
src/i18n/
  request.ts         # getRequestConfig for next-intl
  routing.ts         # defineRouting with supported locales
messages/
  en.json            # English
  es.json            # Spanish (default)
```

Translation key organization (namespaced by feature):
```json
{
  "common": { "loading": "Loading...", "error": "An error occurred" },
  "lobby": { "title": "Game Lobby", "startGame": "Start Game" },
  "game": { "round": "Round {number}", "yourTurn": "Your Turn" }
}
```

Usage patterns:
- Server Components: `const t = await getTranslations("lobby")`
- Client Components: `const t = useTranslations("lobby")`
- Links: Use `<Link>` from `@/i18n/routing` to preserve locale

---

## 3. Sessions & Presence

### 3.1 Sessions Without Cookies

- A **sessionId** is generated client-side (UUID) and stored in `localStorage`.
- All Convex functions expect a `sessionId` argument injected via **convex-helpers session wrappers**, instead of cookies. [oai_citation:9‡Stack by Convex](https://stack.convex.dev/track-sessions-without-cookies?utm_source=chatgpt.com)  
- Server-side:
  - Wrap queries/mutations/actions with `SessionIdArg` to ensure `sessionId` is always available.
  - Optionally maintain a `sessions` table for additional metadata (lastSeenAt, device info, etc.), but **core gameplay is keyed by `sessionId` + `lobbyId`**.

### 3.2 Presence

- Use Convex **Presence component** to track:
  - Which sessionIds are currently active in each lobby.
  - Optional per-user status (“in game”, “choosing placement”, “idle”). [oai_citation:10‡Convex](https://www.convex.dev/components/presence?utm_source=chatgpt.com)  
- Presence is **ephemeral UI state** and is not persisted as part of the game’s durable state.

---

## 4. Data Model (Convex Tables)

### 4.1 `lobbies`

Represents a waiting room + container for a single game.

- `_id`
- `code`: string (unique join code).
- `hostSessionId`: string.
- `status`: `"lobby" | "in_game" | "finished"`.
- `settings`:
  - `targetTimelineSize`: number (default 10).
  - `startingCoins`: number (e.g., 3).
  - `turnSeconds`: number (e.g., 60).
  - `bettingWindowSeconds`: number (e.g., 15).
  - `allowGuessTitleArtist`: boolean.
  - `showLiveBets`: boolean (whether players see each other’s bet slots in real time).
  - `allowBetRetraction`: boolean.
  - `minYear`: number.
  - `maxYear`: number.
- `activeGameId`: Id<"games"> | null.

**Index:**

- `by_code`: `["code"]`.

---

### 4.2 `players`

One document per **sessionId in a lobby**.

- `_id`
- `lobbyId`: Id<"lobbies">.
- `sessionId`: string (from session wrapper).
- `displayName`: string.
- `isHost`: boolean.
- `coins`: number (int).
- `timelineSize`: number (denormalized length).
- `timeline`: `TimelineEntry[]` (small, bounded):
  - `trackId`: Id<"tracks">.
  - `year`: number.
  - `earnedAtRoundNumber`: number.
  - `earnedBy`: `"self_correct" | "bet_correct"`.
- `createdAt`: number (timestamp).

**Indexes:**

- `by_lobby`: `["lobbyId"]`.
- `by_lobby_and_session`: `["lobbyId", "sessionId"]` (for uniqueness and fast lookups). [oai_citation:11‡Stack by Convex](https://stack.convex.dev/databases-are-spreadsheets?utm_source=chatgpt.com)  

---

### 4.3 `games`

A single game instance associated with a lobby.

- `_id`
- `lobbyId`: Id<"lobbies">.
- `status`: `"active" | "finished"`.
- `startedAt`: number.
- `endedAt`: number | null.
- `currentRoundNumber`: number.
- `currentRoundId`: Id<"rounds"> | null.
- `turnPlayerId`: Id<"players"> | null.
- `winnerPlayerId`: Id<"players"> | null.

**Index:**

- `by_lobby`: `["lobbyId"]`.

---

### 4.4 `rounds`

One document per turn; doubles as decision log.

- `_id`
- `gameId`: Id<"games">.
- `roundNumber`: number (1-based).
- `turnPlayerId`: Id<"players">.
- `trackId`: Id<"tracks">.
- `phase`: `"placing" | "betting" | "resolved"`.
- `startedAt`: number.

**Placement preview** (live, before submission):

- `placementPreview`: null or:
  - `proposedIndex`: number.
  - `updatedAt`: number.

**Final placement**:

- `placement`: null or:
  - `proposedIndex`: number.
  - `submittedAt`: number.

**Guess (title/artist)**:

- `guess`: null or:
  - `guessedTitle`: string.
  - `guessedArtist`: string.
  - `isCorrect`: boolean.
  - `awardedCoin`: boolean.
  - `submittedAt`: number.

**Resolution**:

- `resolution`: null or:
  - `validIndexMin`: number.
  - `validIndexMax`: number.
  - `turnPlayerWasCorrect`: boolean.
  - `awardedPlayerIds`: Id<"players">[] (players who gained the card via betting).
  - `coinDeltas`: `{ playerId: Id<"players">; delta: number; reason: string; }[]`.
  - `resolvedAt`: number.

**Indexes:**

- `by_game_round`: `["gameId", "roundNumber"]`.
- `by_game`: `["gameId"]` (safe to `.collect()` because games have few rounds). [oai_citation:12‡Convex Developer Hub](https://docs.convex.dev/understanding/best-practices/?utm_source=chatgpt.com)  

---

### 4.5 `roundBets`

One bet per player per round; at most one bet per index per round.

- `_id`
- `roundId`: Id<"rounds">.
- `playerId`: Id<"players">.
- `proposedIndex`: number.
- `placedAt`: number.
- `status`: `"pending" | "won" | "lost | "refunded"`.

**Indexes:**

- `by_round`: `["roundId"]` (for displaying all bets).
- `by_round_and_index`: `["roundId", "proposedIndex"]` (for enforcing unique slot).
- `by_round_and_player`: `["roundId", "playerId"]` (for enforcing one bet per player).

---

### 4.6 `tracks` (Catalog)

Central catalog of playable tracks; used across games.

- `_id`
- `mbid`: string | null (MusicBrainz recording ID).
- `title`: string.
- `artist`: string.
- `year`: number (chosen definition, e.g. first release year).
- `durationMs`: number | null.
- `externalIds`: object:
  - `spotifyTrackId`?: string.
  - `youtubeVideoId`?: string.
  - `deezerTrackId`?: string.
- `links`: object:
  - `spotifyUrl`?: string.
  - `youtubeUrl`?: string.
  - `deezerUrl`?: string.
- `createdAt`: number.
- `source`: string (manual import, script, etc.).

**Index:**

- `by_year`: `["year", "_creationTime"]` for efficient range queries and pagination. [oai_citation:13‡Stack by Convex](https://stack.convex.dev/databases-are-spreadsheets?utm_source=chatgpt.com)  

---

## 5. Track Selection Algorithm (Next Track)

Goals:

- Draw tracks uniformly-ish from the catalog **within a year range** [minYear, maxYear].
- Avoid repeats within a game.
- Avoid heavy “deck” precomputation.

### 5.1 Used Tracks for a Game

For a given `gameId`:

1. Query all rounds for the game (bounded small) via `rounds.by_game`.
2. Build a `Set<Id<"tracks">>` of `usedTrackIds`.

This is safe because `.collect()` is only over a small set (≤ a few hundred documents). [oai_citation:14‡Convex Developer Hub](https://docs.convex.dev/understanding/best-practices/?utm_source=chatgpt.com)  

### 5.2 Candidate Selection

In mutation `startNextRound(gameId)`:

1. Read `lobby.settings.minYear` / `maxYear`.
2. Try a fixed number of attempts (`MAX_TRIES`) to find a new track:

   - Pick a random year `y` in `[minYear, maxYear]`.
   - Query `tracks.by_year` with inequalities:

     ```ts
     query("tracks")
       .withIndex("by_year", q => q.gte("year", y).lte("year", maxYear))
       .take(50);
     ```

     This follows the “databases as spreadsheets” mental model: use indexes and inequalities instead of scanning. [oai_citation:15‡Stack by Convex](https://stack.convex.dev/databases-are-spreadsheets?utm_source=chatgpt.com)  

   - Filter out tracks in `usedTrackIds`.
   - Pick a random unused candidate from the page.

3. If no candidate found after a few attempts, either:
   - Fall back to scanning a narrower year range, or
   - Declare “no more tracks available” and end the game or prompt the host.

### 5.3 Round Creation

When a candidate track is chosen:

- `roundNumber = game.currentRoundNumber + 1`.
- Compute `nextTurnPlayerId` (round-robin among lobby players).
- Insert a new `round` document with `phase = "placing"`.
- Patch `games` with `currentRoundNumber`, `currentRoundId`, `turnPlayerId`.

---

## 6. Round Lifecycle & Mutations

All server logic is implemented as Convex **mutations** with appropriate access controls and argument validation. [oai_citation:16‡Convex Developer Hub](https://docs.convex.dev/understanding/best-practices/?utm_source=chatgpt.com)  

### 6.1 Lobby Management

- `createLobby(settings?)`
  - Creates `lobby` and host `player`.
  - Generates `code`.

- `joinLobby(lobbyCode, displayName)`
  - Using `sessionId + lobbyCode`, create or fetch `player`.

- `setDisplayName(displayName)`
  - Updates current player’s name.

- `leaveLobby(lobbyId)`
  - Optional: mark player as “left” or delete; presence component handles online/offline.

### 6.2 Game Start

- `startGame(lobbyCode)`
  - Only host; lobby must be in `"lobby"` state.
  - Creates a `game` for the lobby.
  - Initializes each player:
    - `coins = startingCoins`.
    - `timeline = []`, `timelineSize = 0`.
  - Creates first `round` via track selection.
  - Sets `lobby.status = "in_game"` and ties `activeGameId`.

### 6.3 Placing Phase (Turn Player)

- `setPlacementPreview(roundId, proposedIndex)`
  - Only **turn player**; round.phase must be `"placing"`.
  - Updates `round.placementPreview`.

- `submitPlacement(roundId, proposedIndex)`
  - Turn player submits final chosen index.
  - Writes `round.placement` (proposedIndex, submittedAt).
  - Sets `round.phase = "betting"` (or `"resolved"` if betting disabled).
  - Optionally sets a `bettingDeadline` field (if timed, handled by host or separate scheduler).

### 6.4 Betting Phase (Other Players)

- `placeBet(roundId, proposedIndex)`
  - Current session’s player must:
    - Not be the turn player.
    - Have `coins ≥ 1`.
    - Have no existing bet in this round.
  - Enforce uniqueness:
    - Query `roundBets.by_round_and_player` to ensure no bet by this player.
    - Query `roundBets.by_round_and_index` to ensure no existing bet at `proposedIndex`.
  - Insert new `roundBets` row.
  - Decrement `player.coins` by 1 in same mutation (transactional).

- `retractBet(roundId)` (only if `allowBetRetraction === true`)
  - Find current player’s bet via `roundBets.by_round_and_player`.
  - Delete that bet.
  - Refund `player.coins += 1`.
  - Only allowed while `round.phase === "betting"`.

### 6.5 Guessing Title & Artist (Turn Player)

- `submitGuess(roundId, guessedTitle, guessedArtist)`
  - Only turn player; optional, if `allowGuessTitleArtist === true`.
  - Normalize strings (case-insensitive, strip punctuation).
  - Evaluate correctness vs `track.title` & `track.artist`.
  - If correct and `guess` not yet submitted:
    - `player.coins += 1`.
    - store `round.guess = {..., isCorrect: true, awardedCoin: true}`.

### 6.6 Resolution & Next Round (Host)

Single host-only mutation for deterministic state:

- `resolveAndNext(roundId)`
  - Validate:
    - Caller is lobby host.
    - `roundId === game.currentRoundId`.
    - Round in `"betting"` or `"placing"` (if no betting).
  - **Resolve placement:**
    1. Load turn player’s timeline and sort by `year` to compute index range:
       - Let `Y` be their timeline years.
       - Compute `validIndexMin`/`validIndexMax` as described (range among equal years).
    2. Compare `placement.proposedIndex` to range:
       - `turnPlayerWasCorrect = validIndexMin ≤ k ≤ validIndexMax`.

  - **Apply rewards & coins:**
    - Fetch all bets via `roundBets.by_round`.
    - If **turn player correct**:
      - Add track to **turn player’s timeline** and increment `timelineSize`.
      - For each bet:
        - Mark bet `status = "refunded"`.
        - Refund 1 coin to bettor.
    - If **turn player incorrect**:
      - Determine which bets have `proposedIndex` in `[validIndexMin, validIndexMax]`.
      - For each **winning bettor**:
        - Add track to that bettor’s timeline and increment `timelineSize`.
        - Mark bet `status = "won"` (no additional coins).
      - For each **losing bettor**:
        - Bet remains a coin loss; mark `status = "lost"` (no refund).
    - Update `round.resolution` including:
      - `validIndexMin`, `validIndexMax`.
      - `turnPlayerWasCorrect`.
      - `awardedPlayerIds`.
      - `coinDeltas` summary.

  - **Check win condition:**
    - Query all players in lobby.
    - If any `timelineSize >= targetTimelineSize`:
      - Set `game.status = "finished"`, `winnerPlayerId`.
      - Set `lobby.status = "finished"`.
      - Do **not** create next round.
      - Exit.

  - **Start next round:**
    - Compute `nextTurnPlayerId` (round-robin).
    - Run track selection algorithm to create next `round`.
    - Update `game.currentRoundNumber`, `currentRoundId`, `turnPlayerId`.

---

## 7. Queries & Relationship Patterns

Queries should be built using indexed lookups and **relationship helpers** from `convex-helpers` where beneficial. [oai_citation:17‡Stack by Convex](https://stack.convex.dev/functional-relationships-helpers?utm_source=chatgpt.com)  

### 7.1 Main Game View Query

- `getGameView(lobbyCode)`
  - Resolve `lobby` by `code`.
  - Resolve `game` by `lobbyId`.
  - Fetch all `players` in lobby (`players.by_lobby`).
  - Fetch current `round` by `game.currentRoundId`.
  - Fetch bets for that round via `roundBets.by_round`.
  - Fetch `track` by `round.trackId`.
  - Optionally, if `showLiveBets`:
    - Expose bets as `{ playerId, proposedIndex }[]`.

Returned shape should be tailored to UI:

```ts
{
  lobby: {...},
  game: {...},
  players: PlayerSummary[],
  round: RoundPublicView,
  track: TrackPublicView, // no title/artist for main view
  bets: BetPublicView[]   // depending on showLiveBets
}
