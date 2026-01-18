"use client";

import { useEffect, useState } from "react";
import { getSessionId } from "../session";

/**
 * React hook that provides the current session ID.
 *
 * The session ID is lazily initialized on the client side to avoid
 * hydration mismatches. During SSR, the hook returns null.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const sessionId = useSessionId();
 *
 *   if (!sessionId) {
 *     return <div>Loading...</div>;
 *   }
 *
 *   // Use sessionId in Convex mutations
 *   return <div>Session: {sessionId}</div>;
 * }
 * ```
 *
 * @returns The session ID string, or null during SSR/initial render
 */
export function useSessionId(): string | null {
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    // Only runs on client side
    setSessionId(getSessionId());
  }, []);

  return sessionId;
}
