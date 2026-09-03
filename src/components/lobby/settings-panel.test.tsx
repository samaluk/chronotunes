import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SettingsPanel } from "./settings-panel";

/* oxlint-disable typescript/no-unsafe-call -- jest-dom matchers are typed at runtime */

vi.mock(import("convex-helpers/react/sessions"), () => ({
  useSessionId: () => ["session-1"],
  useSessionMutation: () => vi.fn(),
}));

vi.mock(import("convex/react"), () => ({
  useMutation: () => vi.fn(),
}));

vi.mock(import("next-intl"), () => ({
  useTranslations: () => (key: string, params?: Record<string, unknown>) =>
    params === undefined ? `t:${key}` : `t:${key}:${JSON.stringify(params)}`,
}));

const baseSettings = {
  allowBetRetraction: true,
  allowGuessTitleArtist: true,
  bettingWindowSeconds: 15,
  maxYear: 2025,
  minYear: 1950,
  showLiveBets: true,
  startingCoins: 3,
  targetTimelineSize: 10,
  turnSeconds: 30,
};

afterEach(() => {
  cleanup();
});

describe("SettingsPanel", () => {
  it("shows the read-only summary to non-hosts", () => {
    render(<SettingsPanel code="ABC234" currentSettings={baseSettings} isHost={false} />);

    expect(screen.getByText("t:title")).toBeInTheDocument();
    expect(screen.getByText("t:yearRange")).toBeInTheDocument();
  });

  it("shows editing controls for hosts", () => {
    render(<SettingsPanel code="ABC234" currentSettings={{ ...baseSettings }} isHost />);

    // Host sees the collapsible settings body rather than the summary.
    expect(screen.getAllByRole("button").length).toBeGreaterThan(0);
  });
});
