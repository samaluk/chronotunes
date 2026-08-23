import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { LobbyPageContent } from "./lobby-page-content";

const leaveLobbyMock = vi.fn();
const getQueryMock = vi.fn<() => unknown>(() => undefined);

vi.mock(import("convex/react"), () => ({
  useQuery: () => getQueryMock(),
}));

const sessionIdMock = vi.fn(() => ["session-123"]);

vi.mock(import("convex-helpers/react/sessions"), () => ({
  useSessionId: () => sessionIdMock(),
  useSessionMutation: () => leaveLobbyMock,
}));

vi.mock(import("next/navigation"), () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock(import("next-intl"), () => ({
  useTranslations: () => (key: string, params?: Record<string, unknown>) =>
    params === undefined ? `t:${key}` : `t:${key}:${JSON.stringify(params)}`,
}));

vi.mock(import("@/components/ui/locale-switcher"), () => ({
  LocaleSwitcher: () => <div data-testid="locale-switcher" />,
}));

describe(LobbyPageContent, () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("shows an invalid-code message when code is empty", () => {
    render(<LobbyPageContent code="" />);

    // oxlint-disable-next-line typescript/no-unsafe-call
    expect(screen.getByText("t:invalidLobbyCode")).toBeInTheDocument();
  });

  it("shows a loading skeleton while queries are pending", () => {
    getQueryMock.mockReturnValue(undefined);
    const { container } = render(<LobbyPageContent code="ABC234" />);

    // oxlint-disable-next-line typescript/no-unsafe-call
    expect(screen.getByText("t:title")).toBeInTheDocument();
    expect(container.querySelector("[class*=animate]")).not.toBeNull();
  });
});
