# Project structure

```text
src/
  app/
    page.tsx              # Landing page
    lobby/[code]/page.tsx # Lobby and game view
    layout.tsx            # Root layout with NextIntlClientProvider
    providers.tsx         # Context providers
    globals.css           # Global styles
  components/
    ui/                   # shadcn/ui components (multi-component files OK)
    lobby/                # Lobby-specific components
    game/                 # Game-specific components
    player/               # YouTube player wrapper
    settings/             # Settings UI
  i18n/
    request.ts            # getRequestConfig for next-intl
    routing.ts            # Locale routing config (defineRouting)
  lib/
    session.ts            # Client sessionId (localStorage)
    hooks/                # Custom React hooks

convex/
  schema.ts               # Database schema
  lib/                    # Pure logic (sessionWrapper, gameLogic)
  lobbies.ts              # Lobby mutations/queries
  players.ts              # Player mutations/queries
  games.ts                # Game mutations/queries
  rounds.ts               # Round mutations/queries
  bets.ts                 # Betting mutations/queries
  tracks.ts               # Track queries

messages/
  en.json                 # English
  es.json                 # Spanish (default)
```
