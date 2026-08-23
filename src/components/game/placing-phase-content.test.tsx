import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PlacingPhaseContent } from "./placing-phase-content";
import type { GameState } from "./game-context";

/* oxlint-disable typescript/no-unsafe-call -- jest-dom matchers are typed at runtime */

vi.mock(import("next-intl"), () => ({
  useTranslations: () => (key: string) => `t:${key}`,
}));

const stateMock = vi.fn<() => { state: Partial<GameState> }>(() => ({ state: {} }));

vi.mock(import("./game-context"), async (importOriginal) => {
  const actual = await importOriginal<typeof import("./game-context")>();
  return {
    ...actual,
    useGame: () => stateMock(),
  };
});

afterEach(() => {
  cleanup();
  stateMock.mockReturnValue({ state: {} });
});

describe(PlacingPhaseContent, () => {
  it("renders the waiting message when nothing is ready", () => {
    render(<PlacingPhaseContent />);

    expect(screen.getByText("t:playerPlacing")).toBeInTheDocument();
  });
});
