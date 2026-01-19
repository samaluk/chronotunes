"use client";

import { useConvex, useMutation, useQuery } from "convex/react";
import { useEffect, useMemo, useRef } from "react";
import { api } from "@/convex/_generated/api";

interface PresenceState {
  userId: string;
  online: boolean;
  lastDisconnected: number;
  data?: unknown;
}

interface UsePresenceOptions {
  roomId: string;
  userId: string;
  interval?: number;
}

export function usePresence({
  roomId,
  userId,
  interval = 15000,
}: UsePresenceOptions): PresenceState[] | null | undefined {
  const convex = useConvex();
  const hasMounted = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionTokenRef = useRef<string | null>(null);
  const roomTokenRef = useRef<string | null>(null);
  const sessionIdRef = useRef(crypto.randomUUID());

  const heartbeat = useMutation(api.presence.sendHeartbeat);
  const disconnect = useMutation(api.presence.disconnectPresence);
  const baseUrl = convex.url;

  useEffect(() => {
    sessionIdRef.current = crypto.randomUUID();
    sessionTokenRef.current = null;
    roomTokenRef.current = null;

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (sessionTokenRef.current) {
        void disconnect({ sessionToken: sessionTokenRef.current });
      }
    };
  }, [disconnect]);

  useEffect(() => {
    const sendHeartbeat = async () => {
      try {
        const result = await heartbeat({
          roomId,
          userId,
          sessionId: sessionIdRef.current,
          interval,
        });
        sessionTokenRef.current = result.sessionToken;
        roomTokenRef.current = result.roomToken;
      } catch {
        // Silently fail, will retry on next interval
      }
    };

    void sendHeartbeat();

    intervalRef.current = setInterval(sendHeartbeat, interval);

    const handleUnload = () => {
      if (sessionTokenRef.current) {
        const blob = new Blob(
          [
            JSON.stringify({
              path: "presence:disconnectPresence",
              args: { sessionToken: sessionTokenRef.current },
            }),
          ],
          { type: "application/json" },
        );
        navigator.sendBeacon(`${baseUrl}/api/mutation`, blob);
      }
    };

    window.addEventListener("beforeunload", handleUnload);

    const handleVisibility = async () => {
      if (document.hidden) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        if (sessionTokenRef.current) {
          await disconnect({ sessionToken: sessionTokenRef.current });
        }
      } else {
        void sendHeartbeat();
        intervalRef.current = setInterval(sendHeartbeat, interval);
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("beforeunload", handleUnload);

      if (hasMounted.current && sessionTokenRef.current) {
        void disconnect({ sessionToken: sessionTokenRef.current });
      }
    };
  }, [heartbeat, disconnect, baseUrl, interval, roomId, userId]);

  useEffect(() => {
    hasMounted.current = true;
  }, []);

  const state = useQuery(
    api.presence.getPresenceList,
    roomTokenRef.current ? { roomToken: roomTokenRef.current } : "skip",
  );

  return useMemo(() => {
    if (!state) return state;
    return state.slice().sort((a, b) => {
      if (a.userId === userId) return -1;
      if (b.userId === userId) return 1;
      return 0;
    });
  }, [state, userId]);
}

export function useIsOnline(userId: string, presence: PresenceState[] | null | undefined): boolean {
  const myPresence = presence?.find((p) => p.userId === userId);
  return myPresence?.online ?? false;
}
