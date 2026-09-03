import { cleanup, render, screen } from "@testing-library/react";
import type { GenericId } from "convex/values";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PlayersBar } from "./players-bar";

/* oxlint-disable typescript/no-unsafe-call -- jest-dom matchers are typed at runtime */

// oxlint-disable-next-line typescript/consistent-type-assertions, typescript/no-unsafe-type-assertion
const mockLobbyId = "lobby123" as GenericId<"lobbies">;

const playersQueryMock = vi.fn<() => unknown>(() => undefined);

vi.mock(import("convex/react"), () => ({
  useQuery: () => playersQueryMock(),
}));

/* oxlint-disable typescript/consistent-type-assertions, typescript/no-unsafe-type-assertion */
const createRosterPlayer = (overrides: Record<string, unknown>) => ({
  _id: "p1" as GenericId<"players">,
  coins: 3,
  displayName: "P1",
  isHost: true,
  lobbyId: mockLobbyId,
  sessionId: "session-1",
  timeline: [],
  timelineSize: 0,
  ...overrides,
});

vi.mock(import("convex-helpers/react/sessions"), () => ({
  useSessionId: () => ["session-1"],
  useSessionMutation: () => vi.fn<() => void>(),
  useSessionQuery: () => null,
}));

afterEach(() => {
  cleanup();
});

describe("PlayersBar", () => {
  it("renders a skeleton while the roster loads", () => {
    playersQueryMock.mockReturnValue(undefined);
    const { container } = render(<PlayersBar lobbyId={mockLobbyId} />);

    expect(container.querySelector(".animate-pulse")).not.toBeNull();
  });

  it("renders the roster once players load", () => {
    playersQueryMock.mockReturnValue([
      createRosterPlayer({ displayName: "Host", isHost: true, sessionId: "session-1" }),
      createRosterPlayer({
        _id: "p2",
        displayName: "Rival",
        isHost: false,
        sessionId: "session-2",
        timelineSize: 4,
      }),
    ]);

    render(<PlayersBar lobbyId={mockLobbyId} />);

    expect(screen.getByText("Host")).toBeInTheDocument();
    expect(screen.getByText("Rival")).toBeInTheDocument();
  });
});
