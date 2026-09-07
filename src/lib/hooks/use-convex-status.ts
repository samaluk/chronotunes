"use client";

import { useConvexConnectionState } from "convex/react";

export type ConvexConnectionStatus =
  | "connecting"
  | "connected"
  | "disconnected"
  | "reconnecting"
  | "error";

type ConnectionState = ReturnType<typeof useConvexConnectionState>;

function getConvexConnectionStatus(connectionState: ConnectionState): ConvexConnectionStatus {
  if (connectionState.isWebSocketConnected) {
    return "connected";
  }

  if (connectionState.hasEverConnected) {
    return "reconnecting";
  }

  return "connecting";
}

export function useConvexStatus(): { status: ConvexConnectionStatus } {
  const connectionState = useConvexConnectionState();

  return {
    status: getConvexConnectionStatus(connectionState),
  };
}
