import { cleanup, render, screen } from "@testing-library/react";
import type { GenericId } from "convex/values";
import { afterEach, describe, expect, it, vi } from "vitest";

import { GameResults } from "./game-results";

// oxlint-disable-next-line typescript/consistent-type-assertions, typescript/no-unsafe-type-assertion
const mockLobbyId = "lobby123" as GenericId<"lobbies">;

// oxlint-disable-next-line landmines-testing/no-test-doubles -- TODO(landmines): remove grandfathered violation.
vi.mock(import("convex/react"), () => ({
  // oxlint-disable-next-line landmines-testing/no-test-doubles -- TODO(landmines): remove grandfathered violation.
  useMutation: vi.fn<() => () => void>(() => vi.fn<() => void>()),
  // oxlint-disable-next-line landmines-testing/no-test-doubles -- TODO(landmines): remove grandfathered violation.
  useQuery: vi.fn<() => null>(() => null),
}));

// oxlint-disable-next-line landmines-testing/no-test-doubles -- TODO(landmines): remove grandfathered violation.
vi.mock(import("convex-helpers/react/sessions"), () => ({
  SessionProvider: ({ children }: { children: React.ReactNode }) => children,
  // oxlint-disable-next-line landmines-testing/no-test-doubles -- TODO(landmines): remove grandfathered violation.
  useSessionMutation: vi.fn<() => () => void>(() => vi.fn<() => void>()),
  // oxlint-disable-next-line landmines-testing/no-test-doubles -- TODO(landmines): remove grandfathered violation.
  useSessionQuery: vi.fn<() => null>(() => null),
}));

// oxlint-disable-next-line landmines-testing/no-test-doubles -- TODO(landmines): remove grandfathered violation.
vi.mock(import("react"), () => ({
  // oxlint-disable-next-line landmines-testing/no-test-doubles -- TODO(landmines): remove grandfathered violation.
  useState: vi.fn<<T>(initial: T | (() => T)) => [T, (val: unknown) => void]>((initial) => {
    if (typeof initial === "function") {
      // oxlint-disable-next-line typescript/no-unsafe-call, typescript/no-unsafe-return
      return [initial(), vi.fn<(val: unknown) => void>()];
    }
    // oxlint-disable-next-line typescript/no-unsafe-return
    return [initial, vi.fn<(val: unknown) => void>()];
  }),
}));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("GameResults", () => {
  it("shows empty state when no results found", () => {
    render(<GameResults code="ABC123" lobbyId={mockLobbyId} />);

    // oxlint-disable-next-line typescript/no-unsafe-call
    expect(screen.getByText("No game results found")).toBeInTheDocument();
  });
});
