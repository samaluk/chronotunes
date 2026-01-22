# ChronoTunes Game Instructions

## Overview

ChronoTunes is a multiplayer music guessing game inspired by Hitster. Players listen to song clips and compete to place them correctly on their timeline to win the song card.

## Game Phases

### 1. Placing Phase

- **Current player** hears the song and must place it on their timeline
- **Other players** can see the current player's timeline and watch their preview
- **Controls**: Use ↑↓ arrow keys to position, Enter to confirm
- **Goal**: Guess the correct year/position to win the song card

### 2. Betting Phase

- All other players (except the current player) place a coin bet on a specific placement slot in the current player's timeline
- **Goal**: Bet on the correct slot to win the song card; incorrect bets lose the coin
- Placement bets can only be locked in after the current player locks their placement
- Only one bet is allowed per placement slot each round
- Song details remain hidden (title/artist/year unknown)

### 3. Resolution Phase

- Results are revealed
- **Placement rewards**:
  - Correct position: Player wins the song card
  - Incorrect position: No card earned
- **Betting rewards**:
  - Correct bet: Player wins the song card and spends the coin
  - Incorrect bet: Player loses the coin

### 4. Title/Artist Guess Phase

- The current player can submit a guess for the title and artist while the song is playing
- **Goal**: Guess the correct title and artist to win a bonus coin
- **Controls**: Use Enter to submit the guess

### 5. Title/Artist Resolution

- **Current player rewards**:
  - Correct title and artist: Player wins a bonus coin
  - Incorrect title and artist: No bonus coin earned
- **Other players' rewards**:
  - If the current player is correct, no one else gains or loses coins
  - If the current player is wrong, guesses resolve in the order they were submitted:
    - Every incorrect guess before the first correct guess loses a coin
    - The first correct guess wins a coin
    - Guesses after the first correct guess have no effect

## Track Visibility Rules

### Public Information (Always Visible)

- **Timeline years**: The year of each card on your timeline is always visible
- **Timeline order**: Cards are sorted by year
- **Player timelines**: All previously played songs are fully visible (year, title, artist)

### Hidden Information

- **Current round song**: Title, artist, and year are hidden until resolution
- **Mystery songs**: Only the current round song is hidden (title/artist/year shown as "???")

### Revealed Information (After Resolution)

- **Won cards**: Song title, artist, and year are visible to all players after the round resolves
- This allows players to learn from past songs and improve their guessing

## Scoring

### Earning Coins

- Correct title/artist guess by the current player: +1 coin
- Correct title/artist guess by another player (after current player is wrong): +1 coin

### Losing Coins

- Placement bets: Any incorrect placement bet loses its coin
- Title/artist guesses: Only guesses before the first correct guess lose a coin

## Controls

### Placing Phase

- **↑ (Arrow Up)**: Move card up in timeline
- **↓ (Arrow Down)**: Move card down in timeline
- **Enter**: Confirm placement
- **Volume slider**: Adjust song volume (no pause allowed)

### Betting Phase

- Click position slots to place bets
- Confirm bet with button

## Technical Notes

### Song Data

- Each track has: title, artist, year, YouTube video ID
- Song audio plays automatically for all players
- Volume control only (no pause/stop)

### Round Flow

1. Round starts → Song begins playing
2. Title/artist guessing opens immediately for everyone
3. Turn player places card on timeline
4. Turn player locks placement → placement betting opens for remaining slots
5. Resolution → Results revealed, rewards distributed
6. Next round begins

### Real-time Updates

- All game state managed via Convex
- Real-time subscriptions sync state to all players
- Timeline preview updates in real-time as turn player selects position
