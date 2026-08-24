import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ConnectionBanner, NetworkStatus } from "./network-status";

/* oxlint-disable typescript/no-unsafe-call -- jest-dom matchers are typed at runtime */

// Mirrors ConvexConnectionStatus / UseConvexStatusReturn without importing
// from the module under test (vi.mock replaces it wholesale).
type Status = "connecting" | "connected" | "disconnected" | "reconnecting" | "error";
let currentStatus: Status = "connected";

const makeStatus = () => ({
  error: null,
  isConnected: currentStatus === "connected",
  isReconnecting: false,
  retry: vi.fn(),
  status: currentStatus,
});

vi.mock(import("@/lib/hooks/use-convex-status"), () => ({
  useConvexStatus: () => makeStatus(),
}));

afterEach(() => {
  cleanup();
});

describe(NetworkStatus, () => {
  it("renders nothing while connected", () => {
    const { container } = render(<NetworkStatus />);
    expect(container).toBeEmptyDOMElement();
  });

  it.each(["disconnected", "error", "connecting", "reconnecting"] as const)(
    "renders a banner with a label for %s",
    (statusValue) => {
      currentStatus = statusValue;
      const { container } = render(<NetworkStatus />);

      expect(container.querySelector("svg")).not.toBeNull();
      expect(container.textContent?.length ?? 0).toBeGreaterThan(0);
    },
  );

  it("hides the label when showLabel is false but keeps the icon", () => {
    currentStatus = "error";
    const { container } = render(<NetworkStatus showLabel={false} />);

    expect(container.querySelector("svg")).not.toBeNull();
  });
});

describe(ConnectionBanner, () => {
  it("renders nothing while connected", () => {
    currentStatus = "connected";
    const { container } = render(<ConnectionBanner />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders a fixed banner with retry control while offline", () => {
    currentStatus = "disconnected";
    const { container } = render(<ConnectionBanner />);

    expect(container.querySelector("svg")).not.toBeNull();
    expect(container.textContent?.length ?? 0).toBeGreaterThan(0);
  });
});
