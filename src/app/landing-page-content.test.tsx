import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { LandingPageContent } from "./landing-page-content";

vi.mock(import("convex/react"), () => ({
  useMutation: vi.fn(() => vi.fn()),
}));

vi.mock(import("next/navigation"), () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

const sessionIdMock = vi.fn(() => ["session-123"]);

vi.mock(import("convex-helpers/react/sessions"), () => ({
  useSessionId: () => sessionIdMock(),
}));

vi.mock(import("next-intl"), () => ({
  useLocale: () => "en",
  useTranslations: () => (key: string, params?: Record<string, unknown>) =>
    params === undefined ? `t:${key}` : `t:${key}:${JSON.stringify(params)}`,
}));

vi.mock(import("@/components/ui/locale-switcher"), () => ({
  LocaleSwitcher: () => <div data-testid="locale-switcher" />,
}));

vi.mock(import("@/components/ui/theme-toggle"), () => ({
  ThemeToggle: () => <div data-testid="theme-toggle" />,
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("LandingPageContent", () => {
  it("renders title, tagline, and create button", () => {
    render(<LandingPageContent />);

    // oxlint-disable-next-line typescript/no-unsafe-call
    expect(screen.getByText("t:title")).toBeInTheDocument();
    // oxlint-disable-next-line typescript/no-unsafe-call
    expect(screen.getByText("t:tagline")).toBeInTheDocument();
    // oxlint-disable-next-line typescript/no-unsafe-call
    expect(screen.getByRole("button", { name: "t:createGame" })).toBeInTheDocument();
  });

  it("shows the join form when Join is clicked and cancels back", () => {
    render(<LandingPageContent />);

    fireEvent.click(screen.getByRole("button", { name: "t:joinGame" }));
    expect(screen.getAllByRole("textbox").length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: "t:cancel" }));
    // oxlint-disable-next-line typescript/no-unsafe-call
    expect(screen.getByRole("button", { name: "t:createGame" })).toBeInTheDocument();
  });
});
