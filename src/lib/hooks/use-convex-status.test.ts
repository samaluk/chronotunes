import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { useConvexConnectionState } from "convex/react";

import { useConvexStatus } from "./use-convex-status";

type ConnectionState = ReturnType<typeof useConvexConnectionState>;

let currentConnectionState: ConnectionState = {
  connectionCount: 0,
  connectionRetries: 0,
  hasEverConnected: false,
  hasInflightRequests: false,
  inflightActions: 0,
  inflightMutations: 0,
  isWebSocketConnected: false,
  timeOfOldestInflightRequest: null,
};

vi.mock(import("convex/react"), () => ({
  useConvexConnectionState: () => currentConnectionState,
}));

afterEach(() => {
  currentConnectionState = {
    connectionCount: 0,
    connectionRetries: 0,
    hasEverConnected: false,
    hasInflightRequests: false,
    inflightActions: 0,
    inflightMutations: 0,
    isWebSocketConnected: false,
    timeOfOldestInflightRequest: null,
  };
});

describe("useConvexStatus", () => {
  it.each([
    ["connecting", false, false],
    ["connected", true, true],
    ["reconnecting", false, true],
  ] as const)(
    "derives %s from Convex connection state",
    (status, isConnected, hasEverConnected) => {
      currentConnectionState = {
        ...currentConnectionState,
        hasEverConnected,
        isWebSocketConnected: isConnected,
      };

      const { result } = renderHook(() => useConvexStatus());

      expect(result.current.status).toBe(status);
    },
  );
});
