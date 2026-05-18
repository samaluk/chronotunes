import { cleanup, render, screen } from "@testing-library/react";
import type { GenericId } from "convex/values";
import { afterEach, describe, expect, it, vi } from "vitest";

import { GameResults } from "./game-results";

const mockLobbyId = "lobby123" as GenericId<"lobbies">;

vi.mock(import("convex/react"), () => ({
  useMutation: vi.fn(() => vi.fn()),
  useQuery: vi.fn(() => null),
}));

vi.mock(import("convex-helpers/react/sessions"), () => ({
  SessionProvider: ({ children }: { children: React.ReactNode }) => children,
  useSessionMutation: vi.fn(() => vi.fn()),
  useSessionQuery: vi.fn(() => null),
}));

vi.mock(import("react"), () => ({
  useState: vi.fn((initial) => {
    if (typeof initial === "function") {
      return [initial(), vi.fn()];
    }
    return [initial, vi.fn()];
  }),
}));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe(GameResults, () => {
  it("shows empty state when no results found", () => {
    render(<GameResults code="ABC123" lobbyId={mockLobbyId} />);

    expect(screen.getByText("No game results found")).toBeInTheDocument();
  });
});
