# PRD: ChronoTunes - Multiplayer Music Timeline Game

## Overview

ChronoTunes is a browser-based multiplayer music timeline game inspired by Hitster. Players compete to place songs in chronological order while others bet on their success. The game uses YouTube for audio playback and Convex for real-time multiplayer synchronization.

**Problem:** Music trivia games like Hitster require physical cards and are limited to in-person play. There's no accessible online version that lets friends play together remotely with betting mechanics.

**Solution:** A real-time multiplayer web game with turn-based timeline placement, spectator betting on outcomes, and coin-based economy. Built on Convex for instant sync across all players.

**Target Users:**

- Music enthusiasts aged 18-45
- Friend groups wanting remote game nights
- Trivia and party game fans
- Casual gamers seeking quick multiplayer sessions

## Goals

- Enable remote multiplayer music trivia gameplay
- Provide real-time synchronization across all players
- Support betting mechanics that increase engagement
- Deliver responsive UI for both mobile and desktop
- Support 6 languages (en, es, fr, de, pt, ja)

## Quality Gates

These commands must pass for every user story:

- `pnpm biome check .` - Linting and formatting
- `pnpm test` - Run all Vitest tests

For UI stories, also include:

- Verify in browser using dev-browser skill

## User Stories

### US-001: Project Initialization

**Description:** As a developer, I want to initialize the project with Next.js 16, TypeScript, pnpm, and Convex so that we have a solid foundation.

**Acceptance Criteria:**

- [ ] Create Next.js 16 project with App Router and TypeScript using pnpm
- [ ] Install and configure Convex with convex-helpers for sessions
- [ ] Create Justfile with commands for local Convex backend
- [ ] Configure Biome for linting and formatting (replace ESLint)
- [ ] Set up Vitest with convex-test and @edge-runtime/vm
- [ ] Create vitest.config.ts with edge-runtime for convex and jsdom for react
- [ ] `pnpm dev` starts Next.js successfully
- [ ] `just run-local-backend` starts local Convex backend
- [ ] `just convex dev` deploys to local backend

### US-002: UI Foundation Setup

**Description:** As a developer, I want to configure Tailwind CSS v4.1 and shadcn/ui so that we have a consistent design system.

**Acceptance Criteria:**

- [ ] Install and configure Tailwind CSS v4.1 with fluid-tailwindcss
- [ ] Initialize shadcn/ui with Base UI, Lyra style, Neutral base color, Fuchsia theme
- [ ] Install Lucide icons
- [ ] Configure next-themes for light/dark mode
- [ ] Install and configure sonner for toast notifications
- [ ] Create app/providers.tsx with ConvexProvider and ThemeProvider
- [ ] Tailwind styles apply correctly
- [ ] Dark/light mode toggle works
- [ ] Toast notifications display correctly

### US-003: Database Schema

**Description:** As a developer, I want to create the Convex schema with all tables so that data can be persisted.

**Acceptance Criteria:**

- [ ] Create convex/schema.ts with lobbies table (code, hostSessionId, status, settings, activeGameId)
- [ ] Add players table (lobbyId, sessionId, displayName, isHost, coins, timeline, timelineSize)
- [ ] Add games table (lobbyId, status, currentRoundNumber, turnPlayerId, turnOrder, winnerPlayerId)
- [ ] Add rounds table (gameId, roundNumber, turnPlayerId, trackId, phase, placement, resolution)
- [ ] Add roundBets table (roundId, playerId, proposedIndex, lockedIn, status)
- [ ] Add tracks table (title, artist, year, externalIds with youtubeVideoId)
- [ ] Create all necessary indexes for efficient queries
- [ ] `just convex dev` deploys schema without errors

### US-004: Session Management

**Description:** As a player, I want my session to persist across page refreshes so that I don't lose my game state.

**Acceptance Criteria:**

- [ ] Create lib/session.ts with getSessionId() that generates and persists UUID in localStorage
- [ ] Create convex/lib/sessionWrapper.ts using convex-helpers for session-based mutations
- [ ] Export useSessionId hook for React components
- [ ] Session ID is generated on first visit
- [ ] Session ID persists across page refreshes
- [ ] Session ID is available in Convex mutations via sessionWrapper

### US-005: Presence System

**Description:** As a player, I want to see who is online/offline so that I know who is connected.

**Acceptance Criteria:**

- [ ] Install @convex-dev/presence package
- [ ] Create convex/presence.ts with presence configuration
- [ ] Create usePresence hook for tracking player online status
- [ ] Create PresenceIndicator component showing online/offline status
- [ ] Players appear as online when connected
- [ ] Players appear as offline when disconnected
- [ ] Presence updates in real-time across all clients

### US-006: Create Lobby Mutation

**Description:** As a host, I want to create a game lobby so that other players can join.

**Acceptance Criteria:**

- [ ] Create convex/lobbies.ts with create mutation
- [ ] Generate unique 6-char alphanumeric lobby code
- [ ] Create lobby with default settings (targetTimelineSize: 10, startingCoins: 3, etc.)
- [ ] Create host player record linked to lobby
- [ ] Write convex/lobbies.test.ts with tests for create mutation
- [ ] Mutation returns lobby code
- [ ] Lobby is created with status 'lobby'
- [ ] Host player is created with isHost: true

### US-007: Join Lobby Mutation

**Description:** As a player, I want to join an existing lobby by code so that I can play with friends.

**Acceptance Criteria:**

- [ ] Add join mutation to convex/lobbies.ts
- [ ] Validate lobby exists and status is 'lobby'
- [ ] Check player is not already in lobby
- [ ] Create player record with displayName and starting coins
- [ ] Write tests for join mutation including error cases
- [ ] Player receives starting coins from lobby settings
- [ ] Error thrown if lobby not found
- [ ] Error thrown if session already in lobby

### US-008: Leave Lobby Mutation

**Description:** As a player, I want to leave a lobby so that I can exit the game.

**Acceptance Criteria:**

- [ ] Add leave mutation to convex/lobbies.ts
- [ ] Remove player record from lobby
- [ ] If leaving player is host, transfer host to another player or delete lobby if empty
- [ ] Write tests for leave mutation
- [ ] Player record is deleted
- [ ] Host is transferred if host leaves and other players exist
- [ ] Lobby is deleted if last player leaves

### US-009: Lobby Queries

**Description:** As a player, I want to query lobby state so that I can see current players and settings.

**Acceptance Criteria:**

- [ ] Add get query to convex/lobbies.ts (by code)
- [ ] Create convex/players.ts with list query (by lobbyId)
- [ ] Add getMe query to convex/players.ts (by lobbyId and sessionId)
- [ ] Write tests for all queries
- [ ] lobbies.get returns lobby with settings by code
- [ ] players.list returns all players in lobby
- [ ] players.getMe returns current player or null

### US-010: Landing Page

**Description:** As a player, I want a landing page with Create Game and Join Game options so that I can start playing.

**Acceptance Criteria:**

- [ ] Create app/page.tsx with landing page layout
- [ ] Add Create Game button that calls lobbies.create and redirects to /lobby/[code]
- [ ] Add Join Game form with code input that redirects to /lobby/[code]
- [ ] Add display name input (stored in localStorage)
- [ ] Style with shadcn/ui components and Fuchsia theme
- [ ] Landing page renders with Create and Join options
- [ ] Create Game creates lobby and redirects to lobby page
- [ ] Display name is captured and used when creating/joining

### US-011: Lobby Waiting Room

**Description:** As a player, I want to see the lobby waiting room so that I can see who has joined.

**Acceptance Criteria:**

- [ ] Create app/lobby/[code]/page.tsx
- [ ] Display lobby code prominently for sharing
- [ ] Create PlayerList component showing all players with presence indicators
- [ ] Create SettingsPanel component (host only) for game settings
- [ ] Create StartGameButton (host only) that calls games.start
- [ ] Handle lobby not found with redirect to home
- [ ] All players are listed with online status
- [ ] Host sees settings panel and start button
- [ ] Non-host players see waiting state

### US-012: Lobby Settings Mutation

**Description:** As a host, I want to configure game settings so that I can customize the game.

**Acceptance Criteria:**

- [ ] Add updateSettings mutation to convex/lobbies.ts
- [ ] Validate caller is host
- [ ] Allow updating: targetTimelineSize, startingCoins, turnSeconds, bettingWindowSeconds, showLiveBets, minYear, maxYear
- [ ] Write tests for updateSettings
- [ ] Host can update all configurable settings
- [ ] Non-host receives error
- [ ] Settings are validated (e.g., targetTimelineSize 5-15)

### US-013: Start Game Mutation

**Description:** As a host, I want to start the game so that players can begin playing.

**Acceptance Criteria:**

- [ ] Create convex/games.ts with start mutation
- [ ] Validate caller is host and lobby status is 'lobby'
- [ ] Require minimum 2 players
- [ ] Create game record with randomized turnOrder
- [ ] Update lobby status to 'in_game' and set activeGameId
- [ ] Create first round with random track selection
- [ ] Write tests for games.start
- [ ] Game is created with status 'active'
- [ ] First round is created with phase 'placing'

### US-014: Track Selection Algorithm

**Description:** As a developer, I want an algorithm to select random tracks so that games have variety.

**Acceptance Criteria:**

- [ ] Create convex/lib/trackSelection.ts with selectTrackForRound function
- [ ] Query available tracks within minYear-maxYear range
- [ ] Exclude tracks already used in current game
- [ ] Return random track from remaining pool
- [ ] Write tests for track selection
- [ ] Returns track within year range
- [ ] Never returns track already used in game
- [ ] Returns null if no tracks available

### US-015: Current Round Query

**Description:** As a player, I want to query the current round so that I can see the game state.

**Acceptance Criteria:**

- [ ] Create convex/rounds.ts with getCurrent query
- [ ] Return current round with phase, turnPlayerId, placementPreview
- [ ] Include track info only if phase is 'resolved' or viewer is host
- [ ] Write tests for getCurrent
- [ ] Returns current round for active game
- [ ] Hides track details during placing/betting phases for non-host
- [ ] Returns null if no active game

### US-016: Placement Preview Mutation

**Description:** As the turn player, I want to preview my placement so that others can see where I'm thinking.

**Acceptance Criteria:**

- [ ] Add setPlacementPreview mutation to convex/rounds.ts
- [ ] Validate caller is turn player and phase is 'placing'
- [ ] Update round.placementPreview with proposedIndex and timestamp
- [ ] Write tests for setPlacementPreview
- [ ] Turn player can set preview index
- [ ] Preview updates in real-time for all players
- [ ] Error if not turn player or wrong phase

### US-017: Submit Placement Mutation

**Description:** As the turn player, I want to submit my final placement so that the round can progress.

**Acceptance Criteria:**

- [ ] Add submitPlacement mutation to convex/rounds.ts
- [ ] Validate caller is turn player and phase is 'placing'
- [ ] Set round.placement with proposedIndex and timestamp
- [ ] Transition phase to 'betting' (or skip to resolution if no betting)
- [ ] Write tests for submitPlacement
- [ ] Round phase changes to 'betting'
- [ ] Placement is locked and cannot be changed

### US-018: Betting Mutations

**Description:** As a non-turn player, I want to place bets so that I can win cards.

**Acceptance Criteria:**

- [ ] Create convex/bets.ts with preview mutation (creates unlocked bet)
- [ ] Add lockIn mutation (sets lockedIn: true)
- [ ] Add cancel mutation (deletes unlocked bet, refunds coin)
- [ ] Validate caller is not turn player
- [ ] Validate player has coins for betting
- [ ] Deduct coin on preview, refund on cancel
- [ ] Write tests for all betting mutations
- [ ] Non-turn player can preview bet (ghost state)
- [ ] Player can lock in bet (solid state)
- [ ] Player can cancel unlocked bet and get coin refunded

### US-019: Bets List Query

**Description:** As a player, I want to see current bets so that I know what others have wagered.

**Acceptance Criteria:**

- [ ] Add listForRound query to convex/bets.ts
- [ ] Return all bets for round if showLiveBets is true
- [ ] Return only locked bets if showLiveBets is false
- [ ] Include player info for each bet
- [ ] Write tests for listForRound
- [ ] Returns bets for current round
- [ ] Respects showLiveBets setting

### US-020: Placement Validation Logic

**Description:** As a developer, I want placement validation logic so that correct placements are computed.

**Acceptance Criteria:**

- [ ] Create convex/lib/gameLogic.ts with computeValidIndexRange function
- [ ] Given timeline array and new song year, compute validIndexMin and validIndexMax
- [ ] Handle same-year songs (any order valid)
- [ ] Create isPlacementCorrect function comparing proposed index to valid range
- [ ] Write comprehensive tests for edge cases
- [ ] Same-year songs can be in any order
- [ ] Empty timeline allows index 0

### US-021: Round Resolution Mutation

**Description:** As the host, I want to resolve the round so that outcomes are computed.

**Acceptance Criteria:**

- [ ] Add resolveAndNext mutation to convex/games.ts
- [ ] Compute if turn player placement was correct
- [ ] If correct: add track to turn player timeline, all bettors lose coins
- [ ] If wrong: discard track, bettors with valid index win card + keep coin, others lose coin
- [ ] Update player timelines and coins
- [ ] Check win condition (timelineSize >= targetTimelineSize)
- [ ] Create next round or end game
- [ ] Write tests for resolveAndNext
- [ ] Turn player gets card if correct
- [ ] Betting outcomes match game rules
- [ ] Game ends if win condition met

### US-022: Skip Turn Mutation

**Description:** As a host, I want to skip a disconnected player's turn so that the game can continue.

**Acceptance Criteria:**

- [ ] Add skipTurn mutation to convex/games.ts
- [ ] Validate caller is host
- [ ] Advance to next player in turnOrder
- [ ] Create new round with new track
- [ ] Write tests for skipTurn
- [ ] Host can skip current turn
- [ ] Turn advances to next player
- [ ] New round is created

### US-023: Game View Layout

**Description:** As a player, I want to see the game view so that I can play the game.

**Acceptance Criteria:**

- [ ] Update app/lobby/[code]/page.tsx to show GameView when lobby status is 'in_game'
- [ ] Create components/game/GameView.tsx with layout structure
- [ ] Create GameHeader showing round number, whose turn, and timer
- [ ] Create PlayersBar showing all players with timeline size and coins
- [ ] Create CurrentRoundPanel placeholder for phase-specific content
- [ ] Game view renders when game is active
- [ ] Header shows current round and turn player
- [ ] Layout is responsive (mobile and desktop)

### US-024: My Timeline Component

**Description:** As a player, I want to see my timeline so that I know my current cards.

**Acceptance Criteria:**

- [ ] Create components/game/MyTimeline.tsx
- [ ] Display cards in chronological order by year
- [ ] Show song title, artist, year for each card
- [ ] Indicate how each card was earned (own turn vs betting win)
- [ ] Timeline displays all player's cards
- [ ] Cards are sorted by year ascending
- [ ] Earned-by indicator shows correctly

### US-025: Timeline Placer Component

**Description:** As the turn player, I want to drag and drop the song so that I can place it on my timeline.

**Acceptance Criteria:**

- [ ] Create components/game/TimelinePlacer.tsx
- [ ] Show current timeline with drop zones between cards
- [ ] Show new song card to be placed (without year)
- [ ] Implement drag-and-drop or tap-to-select placement
- [ ] Call rounds.setPlacementPreview on position change
- [ ] Add Submit Placement button calling rounds.submitPlacement
- [ ] Turn player sees timeline with insertion points
- [ ] Can drag or tap to select position
- [ ] Submit button finalizes placement

### US-026: Betting Panel Component

**Description:** As a non-turn player, I want to see the betting panel so that I can place bets.

**Acceptance Criteria:**

- [ ] Create components/game/BettingPanel.tsx
- [ ] Show turn player's timeline with betting slots
- [ ] Display coin balance and bet status
- [ ] Create BettingSlot component for each position
- [ ] Implement two-step flow: select (ghost) then confirm (solid)
- [ ] Allow cancel for unlocked bets
- [ ] Non-turn players see betting interface
- [ ] Can select slot (ghost preview)
- [ ] Can confirm bet (solid lock)

### US-027: Round Results Component

**Description:** As a player, I want to see round results so that I know the outcome.

**Acceptance Criteria:**

- [ ] Create components/game/RoundResults.tsx
- [ ] Show song reveal (title, artist, year)
- [ ] Show if turn player was correct or wrong
- [ ] Show betting outcomes for each bettor
- [ ] Display coin changes and card awards
- [ ] Add Next Round button (host) or waiting state
- [ ] Song details are revealed
- [ ] Turn player result is clear
- [ ] Host can advance to next round

### US-028: Soft Timer Component

**Description:** As a player, I want to see a countdown timer so that I know how much time is left.

**Acceptance Criteria:**

- [ ] Create components/game/SoftTimer.tsx
- [ ] Display countdown based on round.startedAt and settings.turnSeconds
- [ ] Show visual indicator when time is low
- [ ] Timer is purely advisory (no auto-actions)
- [ ] Timer counts down from turnSeconds
- [ ] Visual warning when time is low
- [ ] Timer continues past zero (no enforcement)

### US-029: YouTube Player Component

**Description:** As a player, I want to hear the song so that I can guess the year.

**Acceptance Criteria:**

- [ ] Create components/player/YouTubePlayer.tsx
- [ ] Load YouTube IFrame API
- [ ] Play video by youtubeVideoId from round track
- [ ] Hide video element (audio only or minimal UI)
- [ ] Handle video unavailable errors
- [ ] Add play/pause controls
- [ ] Video loads and plays audio
- [ ] Video is hidden or minimal
- [ ] Error handling for unavailable videos

### US-030: Track Import

**Description:** As a developer, I want to import tracks so that the game has content.

**Acceptance Criteria:**

- [ ] Create convex/tracks.ts with import mutation
- [ ] Accept array of tracks with title, artist, year, youtubeVideoId
- [ ] Validate required fields and year range
- [ ] Create seed data JSON file with sample tracks
- [ ] Write import script or Convex dashboard function
- [ ] Tracks can be imported via mutation
- [ ] Validation prevents invalid data
- [ ] Sample tracks are available for testing

### US-031: Track Queries

**Description:** As a developer, I want track queries so that game rounds can access track data.

**Acceptance Criteria:**

- [ ] Add getForRound query to convex/tracks.ts (host only, full metadata)
- [ ] Add getPublic query (post-resolution, public metadata)
- [ ] Return track info based on round phase and viewer role
- [ ] Write tests for track queries
- [ ] Host can see full track info during round
- [ ] Others see only youtubeVideoId during placing/betting
- [ ] Full metadata visible after resolution

### US-032: Host Disconnect Detection

**Description:** As a player, I want host disconnect to be detected so that the game doesn't stall.

**Acceptance Criteria:**

- [ ] Create scheduled function to check host presence
- [ ] When host disconnects, set hostTransferDeadline on lobby
- [ ] Set game status to 'paused' if game is active
- [ ] Write tests for disconnect detection
- [ ] Host disconnect is detected within seconds
- [ ] Lobby hostTransferDeadline is set
- [ ] Game pauses if in progress

### US-033: Host Failover

**Description:** As a player, I want automatic host transfer so that the game can continue without the original host.

**Acceptance Criteria:**

- [ ] Create scheduled function checkHostTransfer
- [ ] After 30s timeout, if host still disconnected, transfer to random online player
- [ ] Update lobby.hostSessionId and player.isHost flags
- [ ] Resume game if it was paused
- [ ] Allow original host to rejoin as regular player
- [ ] Write tests for host failover
- [ ] New host is selected after 30s timeout
- [ ] Game resumes with new host
- [ ] Original host can rejoin as player

### US-034: Manual Host Transfer

**Description:** As a host, I want to manually transfer host role so that I can leave gracefully.

**Acceptance Criteria:**

- [ ] Add transferHost mutation to convex/lobbies.ts
- [ ] Validate caller is current host
- [ ] Update hostSessionId and player isHost flags
- [ ] Write tests for manual transfer
- [ ] Host can transfer to any player
- [ ] New host gets host controls
- [ ] Old host becomes regular player

### US-035: Game Results View

**Description:** As a player, I want to see the final results so that I know who won.

**Acceptance Criteria:**

- [ ] Create components/game/GameResults.tsx
- [ ] Display winner prominently
- [ ] Show final standings with timeline sizes
- [ ] List all songs played with years
- [ ] Add Play Again button (returns to lobby)
- [ ] Winner is displayed clearly
- [ ] All players ranked by timeline size
- [ ] Song history is visible
- [ ] Can start new game from results

### US-036: Loading and Error States

**Description:** As a player, I want loading and error states so that I know what's happening.

**Acceptance Criteria:**

- [ ] Create loading skeletons for all major components
- [ ] Add error boundaries with retry options
- [ ] Handle Convex connection errors gracefully
- [ ] Show reconnecting state during network issues
- [ ] Loading states show during data fetching
- [ ] Errors display helpful messages
- [ ] Retry option available on recoverable errors
- [ ] Network issues show reconnecting indicator

### US-037: Internationalization Setup

**Description:** As a player, I want the game in my language so that I can understand it.

**Acceptance Criteria:**

- [ ] Install next-intl package
- [ ] Create i18n/request.ts with getRequestConfig
- [ ] Create i18n/routing.ts with defineRouting (locales: en, es, fr, de, pt, ja)
- [ ] Create middleware.ts for locale detection and routing
- [ ] Restructure app/ to app/[locale]/ with NextIntlClientProvider in layout
- [ ] Create messages/en.json with all UI string keys organized by namespace
- [ ] Create messages/ files for es, fr, de, pt, ja (can start with en copy)
- [ ] Update all components to use useTranslations hook
- [ ] App routes include locale prefix (e.g., /en/lobby/ABC123)
- [ ] Translations load correctly for each locale
- [ ] Locale switcher allows changing language

## Functional Requirements

- FR-1: The system must generate unique 6-character alphanumeric lobby codes
- FR-2: The system must support 2-10 players per lobby
- FR-3: The system must persist session IDs in localStorage
- FR-4: The system must synchronize game state in real-time via Convex
- FR-5: The system must play YouTube audio for each song
- FR-6: The system must validate timeline placement against year boundaries
- FR-7: The system must compute betting outcomes according to game rules
- FR-8: The system must support two-step betting (preview, confirm)
- FR-9: The system must transfer host automatically after 30s disconnect
- FR-10: The system must support 6 locales (en, es, fr, de, pt, ja)
- FR-11: The system must track player timelines as embedded arrays (max 10 cards)
- FR-12: The system must avoid track repeats within a single game

## Non-Goals

- Native mobile apps (web only for MVP)
- Spotify or Apple Music integration
- Voice chat between players
- Monetization features
- AI-generated playlists
- Automated track seeding (manual import for MVP)
- User accounts (session-only for MVP)

## Technical Considerations

**Tech Stack:**

- Frontend: Next.js 16 (App Router), TypeScript
- Backend: Convex (realtime BaaS)
- Styling: Tailwind CSS v4.1, shadcn/ui (Lyra style, Fuchsia theme)
- Testing: Vitest, convex-test, React Testing Library
- Linting: Biome (not ESLint)
- i18n: next-intl

**Key Patterns:**

- Decoupled Convex queries (6+ separate queries vs one monolithic)
- Session-based auth via convex-helpers sessionWrapper
- Embedded timeline arrays (max 10 cards per player)
- Soft timer (advisory, no server enforcement)
- Two-step betting (preview -> confirm)

**Local Development:**

- Local Convex OSS backend (no cloud account needed)
- Justfile for command orchestration
- Three terminals: local backend, convex dev, next dev

## Success Metrics

- All 37 user stories completed with passing tests
- Real-time sync works across 2-10 players
- Game completes successfully from start to win condition
- All 6 locales load correctly
- No critical bugs in game logic or betting outcomes

## Open Questions

- Should we add a "rematch" feature that keeps the same players?
- Should we support custom year ranges per game session?
- Do we need rate limiting on lobby creation?
