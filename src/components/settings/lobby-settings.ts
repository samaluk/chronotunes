import type { Doc } from "@/convex/_generated/dataModel";

/**
 * Lobby settings shape, derived from the Convex `lobbies.settings` schema
 * object so the settings UI can never drift from the backend definition.
 */
export type LobbySettings = Doc<"lobbies">["settings"];
