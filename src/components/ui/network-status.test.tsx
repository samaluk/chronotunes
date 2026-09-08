import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { ConvexConnectionStatus } from "../../lib/hooks/use-convex-status";

import { ConnectionBanner, NetworkStatus } from "./network-status";

/* oxlint-disable typescript/no-unsafe-call -- jest-dom matchers are typed at runtime */

let currentStatus: ConvexConnectionStatus = "connected";
let currentOffline = false;

const makeStatus = () => ({
  status: currentStatus,
});

vi.mock(import("@/lib/hooks/use-convex-status"), () => ({
  useConvexStatus: () => makeStatus(),
}));

vi.mock(import("next/offline"), () => ({
  useOffline: () => currentOffline,
}));

vi.mock(import("next-intl"), () => ({
  useTranslations: () => (key: string) => `network:${key}`,
}));

afterEach(() => {
  currentStatus = "connected";
  currentOffline = false;
  cleanup();
});

describe("NetworkStatus", () => {
  it("renders nothing while connected", () => {
    const { container } = render(<NetworkStatus />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders the offline state even when Convex is connected, then follows Convex after recovery", () => {
    currentOffline = true;

    const view = render(<NetworkStatus />);

    expect(view.container.textContent).toContain("network:offline");

    currentOffline = false;
    currentStatus = "reconnecting";
    view.rerender(<NetworkStatus />);

    expect(view.container.textContent).toContain("network:reconnecting");
  });

  it.each(["connecting", "reconnecting"] as const)(
    "renders a banner with a label for %s",
    (statusValue) => {
      currentStatus = statusValue;
      const { container } = render(<NetworkStatus />);

      expect(container.querySelector("svg")).not.toBeNull();
      expect(container.textContent).toBe(`network:${statusValue}`);
    },
  );

  it("hides the label when showLabel is false but keeps the icon", () => {
    currentStatus = "connecting";
    const { container } = render(<NetworkStatus showLabel={false} />);

    expect(container.querySelector("svg")).not.toBeNull();
    expect(container.textContent).toBe("");
  });
});

describe("ConnectionBanner", () => {
  it("renders nothing while connected", () => {
    currentStatus = "connected";
    const { container } = render(<ConnectionBanner />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders the offline state while Next has a pending request", () => {
    currentOffline = true;

    const { container } = render(<ConnectionBanner />);

    expect(container.textContent).toContain("network:offline");
  });

  it("renders a fixed banner without a fake retry control", () => {
    currentStatus = "reconnecting";
    const { container } = render(<ConnectionBanner />);

    expect(container.querySelector("svg")).not.toBeNull();
    expect(container.textContent?.length ?? 0).toBeGreaterThan(0);
    expect(container.querySelector("button")).toBeNull();
  });
});
