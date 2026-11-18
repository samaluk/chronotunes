import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PlacingPhaseContent } from "./placing-phase-content";
import type { GameState } from "./game-context";

/* oxlint-disable typescript/no-unsafe-call -- jest-dom matchers are typed at runtime */

// oxlint-disable-next-line landmines-testing/no-test-doubles -- TODO(landmines): remove grandfathered violation.
vi.mock(import("next-intl"), () => ({
  useTranslations: () => (key: string) => `t:${key}`,
}));

// oxlint-disable-next-line landmines-testing/no-test-doubles -- TODO(landmines): remove grandfathered violation.
const stateMock = vi.fn<() => { state: Partial<GameState> }>(() => ({ state: {} }));

// oxlint-disable-next-line landmines-testing/no-test-doubles -- TODO(landmines): remove grandfathered violation.
vi.mock(import("./game-context"), async (importOriginal) => {
  const actual = await importOriginal<typeof import("./game-context")>();
  return {
    ...actual,
    useGame: () => stateMock(),
  };
});

afterEach(() => {
  cleanup();
  // oxlint-disable-next-line landmines-testing/no-test-doubles -- TODO(landmines): remove grandfathered violation.
  stateMock.mockReturnValue({ state: {} });
});

describe("PlacingPhaseContent", () => {
  it("renders the waiting message when nothing is ready", () => {
    render(<PlacingPhaseContent />);

    expect(screen.getByText("t:playerPlacing")).toBeInTheDocument();
  });
});
