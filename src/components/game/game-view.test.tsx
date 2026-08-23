import { cleanup, render, screen } from "@testing-library/react";
import type { GenericId } from "convex/values";
import { afterEach, describe, expect, it, vi } from "vitest";

import { GameView } from "./game-view";

/* oxlint-disable typescript/no-unsafe-call -- jest-dom matchers are typed at runtime */

// oxlint-disable-next-line typescript/consistent-type-assertions, typescript/no-unsafe-type-assertion
const mockLobbyId = "lobby123" as GenericId<"lobbies">;

vi.mock(import("convex/react"), () => ({
  useQuery: vi.fn(() => undefined),
}));

vi.mock(import("convex-helpers/react/sessions"), () => ({
  SessionProvider: ({ children }: { children: React.ReactNode }) => children,
  useSessionId: () => ["session-1"],
  useSessionMutation: vi.fn(() => vi.fn()),
  useSessionQuery: vi.fn(() => null),
}));

vi.mock(import("usehooks-ts"), () => ({
  useIsMounted: () => () => false,
}));

afterEach(() => {
  cleanup();
});

describe(GameView, () => {
  it("renders the loading skeleton before mount", () => {
    const { container } = render(<GameView code="ABC234" lobbyId={mockLobbyId} />);

    expect(container.querySelector(".animate-pulse")).not.toBeNull();
  });
});
