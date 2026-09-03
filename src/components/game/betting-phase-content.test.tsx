import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { BettingPhaseContent } from "./betting-phase-content";

/* oxlint-disable typescript/no-unsafe-call -- jest-dom matchers are typed at runtime */

vi.mock(import("./game-context"), () => ({
  useGame: () => ({ state: {}, actions: {}, meta: {} }),
}));

vi.mock(import("next-intl"), () => ({
  useTranslations: () => (key: string) => `t:${key}`,
}));

afterEach(() => {
  cleanup();
});

describe("BettingPhaseContent", () => {
  it("renders betting phase scaffolding", () => {
    const { container } = render(<BettingPhaseContent />);

    expect(container.firstChild).not.toBeNull();
  });
});
