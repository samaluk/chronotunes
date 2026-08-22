"use client";

import { useConvex } from "convex/react";
import { useEffect, useState } from "react";

export type ConvexConnectionStatus =
  | "connecting"
  | "connected"
  | "disconnected"
  | "reconnecting"
  | "error";

interface UseConvexStatusReturn {
  error: Error | null;
  isConnected: boolean;
  isReconnecting: boolean;
  retry: () => void;
  status: ConvexConnectionStatus;
}

export function useConvexStatus(): UseConvexStatusReturn {
  const client = useConvex();
  // Derived from `client` at init so a missing client never needs a
  // synchronous setState inside an effect.
  const [status, setStatus] = useState<ConvexConnectionStatus>(() =>
    client ? "connecting" : "disconnected",
  );
  const [error, setError] = useState<Error | null>(null);
  const [_retryCount, setRetryCount] = useState(0);

  const retry = (): void => {
    setStatus("connecting");
    setRetryCount((previous) => previous + 1);
  };

  useEffect(() => {
    if (!client) {
      return;
    }

    if (typeof window === "undefined") {
      return;
    }

    let mounted = true;

    const checkConnection = () => {
      try {
        setStatus("connected");
        setError(null);
      } catch {
        if (mounted) {
          setStatus("error");
          setError(new Error("Connection check failed"));
        }
      }
    };

    checkConnection();

    const handleOnline = (): void => {
      if (mounted) {
        setStatus("connecting");
        setRetryCount((previous) => previous + 1);
      }
    };

    const handleOffline = (): void => {
      if (mounted) {
        setStatus("disconnected");
      }
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      mounted = false;
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [client]);

  useEffect(() => {
    if (status === "connecting" && client) {
      const timeout = setTimeout(() => {
        setStatus("connected");
      }, 2000);

      return () => clearTimeout(timeout);
    }
  }, [status, client]);

  return {
    error,
    isConnected: status === "connected",
    isReconnecting: status === "reconnecting",
    retry,
    status,
  };
}
