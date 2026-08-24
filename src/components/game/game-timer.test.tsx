import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { GameTimer } from "./game-timer";

vi.mock(import("next-intl"), () => ({
  useTranslations: () => (key: string, params?: Record<string, unknown>) =>
    params === undefined ? `t:${key}` : `t:${key}:${JSON.stringify(params)}`,
}));

afterEach(() => {
  cleanup();
});

describe(GameTimer, () => {
  it("renders timer text for an in-progress round", () => {
    const { container } = render(
      <GameTimer showProgress={false} startedAt={Date.now() - 5_000} totalSeconds={60} />,
    );

    // The timer renders a monospace clock readout.
    expect(container.querySelector(".font-mono")).not.toBeNull();
  });
});
