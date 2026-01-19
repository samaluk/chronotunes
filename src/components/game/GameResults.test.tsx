import { cleanup, render, screen } from "@testing-library/react";
import type { GenericId } from "convex/values";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GameResults } from "./GameResults";

const mockLobbyId = "lobby123" as GenericId<"lobbies">;

vi.mock("convex/react", () => ({
  useMutation: vi.fn(() => vi.fn()),
  useQuery: vi.fn(() => null),
}));

vi.mock("@/lib/hooks/use-session-id", () => ({
  useSessionId: vi.fn(() => "session123"),
}));

vi.mock("react", () => ({
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

describe("GameResults", () => {
  it("shows empty state when no results found", () => {
    render(<GameResults lobbyId={mockLobbyId} code="ABC123" />);

    expect(screen.getByText("No game results found")).toBeInTheDocument();
  });
});
