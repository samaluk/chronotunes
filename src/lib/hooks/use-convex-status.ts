"use client";

import { useConvex } from "convex/react";
import { useCallback, useEffect, useState } from "react";

export type ConvexConnectionStatus =
  | "connecting"
  | "connected"
  | "disconnected"
  | "reconnecting"
  | "error";

interface UseConvexStatusReturn {
  status: ConvexConnectionStatus;
  isConnected: boolean;
  isReconnecting: boolean;
  error: Error | null;
  retry: () => void;
}

export function useConvexStatus(): UseConvexStatusReturn {
  const client = useConvex();
  const [status, setStatus] = useState<ConvexConnectionStatus>("connecting");
  const [error, setError] = useState<Error | null>(null);
  const [_retryCount, setRetryCount] = useState(0);

  const retry = useCallback(() => {
    setStatus("connecting");
    setRetryCount((prev) => prev + 1);
  }, []);

  useEffect(() => {
    if (!client) {
      setStatus("disconnected");
      return;
    }

    if (typeof window === "undefined") {
      return;
    }

    let mounted = true;

    const checkConnection = async () => {
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
        retry();
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
  }, [client, retry]);

  useEffect(() => {
    if (status === "connecting" && client) {
      const timeout = setTimeout(() => {
        setStatus("connected");
      }, 2000);

      return () => clearTimeout(timeout);
    }
  }, [status, client]);

  return {
    status,
    isConnected: status === "connected",
    isReconnecting: status === "reconnecting",
    error,
    retry,
  };
}
