import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ComponentProps } from "react";

import { LobbyPageContent } from "./lobby-page-content";

const leaveLobbyMock = vi.fn<() => void>();
// oxlint-disable-next-line landmines-testing/no-test-doubles -- TODO(landmines): remove grandfathered violation.
const getQueryMock = vi.fn<() => unknown>(() => undefined);

// oxlint-disable-next-line landmines-testing/no-test-doubles -- TODO(landmines): remove grandfathered violation.
vi.mock(import("convex/react"), () => ({
  useQuery: () => getQueryMock(),
}));

// oxlint-disable-next-line landmines-testing/no-test-doubles -- TODO(landmines): remove grandfathered violation.
const sessionIdMock = vi.fn<() => string[]>(() => ["session-123"]);

// oxlint-disable-next-line landmines-testing/no-test-doubles -- TODO(landmines): remove grandfathered violation.
vi.mock(import("convex-helpers/react/sessions"), () => ({
  useSessionId: () => sessionIdMock(),
  useSessionMutation: () => leaveLobbyMock,
}));

// oxlint-disable-next-line landmines-testing/no-test-doubles -- TODO(landmines): remove grandfathered violation.
vi.mock(import("@/i18n/routing"), async (importOriginal) => ({
  ...(await importOriginal()),
  Link: ({ children, href, ...props }: ComponentProps<"a">) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
  useRouter: () => ({
    push: vi.fn<(url: string) => void>(),
    prefetch: vi.fn<(url: string) => void>(),
  }),
}));

// oxlint-disable-next-line landmines-testing/no-test-doubles -- TODO(landmines): remove grandfathered violation.
vi.mock(import("next-intl"), () => ({
  useLocale: () => "en",
  useTranslations: () => (key: string, params?: Record<string, unknown>) =>
    params === undefined ? `t:${key}` : `t:${key}:${JSON.stringify(params)}`,
}));

// oxlint-disable-next-line landmines-testing/no-test-doubles -- TODO(landmines): remove grandfathered violation.
vi.mock(import("@/components/ui/locale-switcher"), () => ({
  LocaleSwitcher: () => <div data-testid="locale-switcher" />,
}));

describe("LobbyPageContent", () => {
  afterEach(() => {
    cleanup();
  });

  it("shows an invalid-code message when code is empty", () => {
    render(<LobbyPageContent code="" />);

    // oxlint-disable-next-line typescript/no-unsafe-call
    expect(screen.getByText("t:invalidLobbyCode")).toBeInTheDocument();
  });

  it("shows a loading skeleton while queries are pending", () => {
    // oxlint-disable-next-line landmines-testing/no-test-doubles -- TODO(landmines): remove grandfathered violation.
    getQueryMock.mockReturnValue(undefined);
    const { container } = render(<LobbyPageContent code="ABC234" />);

    // oxlint-disable-next-line typescript/no-unsafe-call
    expect(screen.getByText("t:title")).toBeInTheDocument();
    expect(container.querySelector("[class*=animate]")).not.toBeNull();
  });

  it("offers a home link when the lobby is missing and player queries are skipped", () => {
    // oxlint-disable-next-line landmines-testing/no-test-doubles -- TODO(landmines): remove grandfathered violation.
    getQueryMock.mockReturnValueOnce(null).mockReturnValue(undefined);
    render(<LobbyPageContent code="ABC234" />);

    expect(screen.getByRole("link", { name: "t:returnHome" }).getAttribute("href")).toBe("/");
  });
});
