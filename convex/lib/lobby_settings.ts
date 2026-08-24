export const LOBBY_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const LOBBY_CODE_LENGTH = 6;

export interface LobbySettings {
  allowBetRetraction: boolean;
  allowGuessTitleArtist: boolean;
  bettingWindowSeconds: number;
  maxYear: number;
  minYear: number;
  showLiveBets: boolean;
  startingCoins: number;
  targetTimelineSize: number;
  turnSeconds: number;
}

export const DEFAULT_SETTINGS: Readonly<LobbySettings> = {
  allowBetRetraction: true,
  allowGuessTitleArtist: true,
  bettingWindowSeconds: 15,
  maxYear: 2025,
  minYear: 1950,
  showLiveBets: true,
  startingCoins: 3,
  targetTimelineSize: 10,
  turnSeconds: 30,
};

/** Applies per-lobby overrides on top of the default settings. */
export function resolveLobbySettings(overrides?: Partial<LobbySettings>): LobbySettings {
  return {
    allowBetRetraction: overrides?.allowBetRetraction ?? DEFAULT_SETTINGS.allowBetRetraction,
    allowGuessTitleArtist:
      overrides?.allowGuessTitleArtist ?? DEFAULT_SETTINGS.allowGuessTitleArtist,
    bettingWindowSeconds: overrides?.bettingWindowSeconds ?? DEFAULT_SETTINGS.bettingWindowSeconds,
    maxYear: overrides?.maxYear ?? DEFAULT_SETTINGS.maxYear,
    minYear: overrides?.minYear ?? DEFAULT_SETTINGS.minYear,
    showLiveBets: overrides?.showLiveBets ?? DEFAULT_SETTINGS.showLiveBets,
    startingCoins: overrides?.startingCoins ?? DEFAULT_SETTINGS.startingCoins,
    targetTimelineSize: overrides?.targetTimelineSize ?? DEFAULT_SETTINGS.targetTimelineSize,
    turnSeconds: overrides?.turnSeconds ?? DEFAULT_SETTINGS.turnSeconds,
  };
}

/** Generates a random, human-friendly lobby code (no ambiguous characters). */
export function generateLobbyCode(): string {
  let code = "";
  const randomValues = new Uint8Array(LOBBY_CODE_LENGTH);
  crypto.getRandomValues(randomValues);
  for (let i = 0; i < LOBBY_CODE_LENGTH; i++) {
    const rawIndex = randomValues[i];
    if (rawIndex === undefined) {
      throw new Error("Failed to generate random values");
    }
    const index = rawIndex % LOBBY_CODE_CHARS.length;
    code += LOBBY_CODE_CHARS[index];
  }
  return code;
}
