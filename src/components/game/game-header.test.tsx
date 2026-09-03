import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { GameHeader } from "./game-header";
import type { GameContextValue } from "./game-context";

/* oxlint-disable typescript/no-unsafe-call -- jest-dom matchers are typed at runtime */

const stateMock = vi.fn<() => { state: Partial<GameContextValue["state"]> }>(() => ({
  state: { phase: "placing" },
}));

vi.mock(import("./game-context"), () => ({
  useGame: () => stateMock(),
}));

vi.mock(import("next-intl"), () => ({
  useTranslations: () => (key: string, params?: Record<string, unknown>) =>
    params === undefined ? `t:${key}` : `t:${key}:${JSON.stringify(params)}`,
}));

afterEach(() => {
  cleanup();
});

describe("GameHeader", () => {
  it("renders round header content", () => {
    render(<GameHeader />);

    // The header shows the phase label and round number for the placing phase.
    expect(screen.getByText("t:placing")).toBeInTheDocument();
    expect(screen.getByText(/t:round/)).toBeInTheDocument();
  });
});
