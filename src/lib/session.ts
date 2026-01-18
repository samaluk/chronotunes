/**
 * Client-side session ID management using localStorage.
 *
 * Sessions provide anonymous player identity without requiring user accounts.
 * The session ID is generated once and persisted in localStorage, surviving
 * page refreshes and browser restarts.
 */

const SESSION_STORAGE_KEY = "chronotunes-session-id";

/**
 * Generates a cryptographically random UUID v4.
 */
function generateSessionId(): string {
  return crypto.randomUUID();
}

/**
 * Gets the current session ID from localStorage, creating a new one if needed.
 *
 * This function is safe to call in browser environments only.
 * It will throw an error if called during SSR (no window object).
 *
 * @returns The session ID (UUID v4 format)
 * @throws Error if called in a non-browser environment
 */
export function getSessionId(): string {
  if (typeof window === "undefined") {
    throw new Error("getSessionId() can only be called in browser environments");
  }

  let sessionId = localStorage.getItem(SESSION_STORAGE_KEY);

  if (!sessionId) {
    sessionId = generateSessionId();
    localStorage.setItem(SESSION_STORAGE_KEY, sessionId);
  }

  return sessionId;
}

/**
 * Clears the current session ID from localStorage.
 * The next call to getSessionId() will generate a new session.
 *
 * This is useful for testing or when a user wants to start fresh.
 */
export function clearSessionId(): void {
  if (typeof window === "undefined") {
    throw new Error("clearSessionId() can only be called in browser environments");
  }

  localStorage.removeItem(SESSION_STORAGE_KEY);
}

/**
 * Checks if a session ID currently exists in localStorage.
 *
 * @returns true if a session ID exists, false otherwise
 */
export function hasSessionId(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return localStorage.getItem(SESSION_STORAGE_KEY) !== null;
}
