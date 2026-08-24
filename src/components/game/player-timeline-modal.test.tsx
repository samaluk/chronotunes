import { cleanup, render } from "@testing-library/react";
import type { GenericId } from "convex/values";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PlayerTimelineModal } from "./player-timeline-modal";
import type { Player } from "./betting-types";

/* oxlint-disable typescript/no-unsafe-call -- jest-dom matchers are typed at runtime */

vi.mock(import("next-intl"), () => ({
  useTranslations: () => (key: string, params?: Record<string, unknown>) =>
    params === undefined ? `t:${key}` : `t:${key}:${JSON.stringify(params)}`,
}));

vi.mock(import("convex/react"), () => ({
  useQuery: vi.fn(() => null),
}));

vi.mock(import("convex-helpers/react/sessions"), () => ({
  useSessionMutation: () => vi.fn(),
  useSessionQuery: () => null,
}));

vi.mock(import("usehooks-ts"), () => ({
  useIsMounted: () => () => true,
}));

/* oxlint-disable typescript/consistent-type-assertions, typescript/no-unsafe-type-assertion */
const player = {
  // oxlint-disable-next-line typescript/consistent-type-assertions, typescript/no-unsafe-type-assertion
  _id: "p1" as GenericId<"players">,
  coins: 3,
  displayName: "Tester",
  isHost: true,
  timeline: [],
  timelineSize: 0,
} as unknown as Player;
/* oxlint-enable typescript/consistent-type-assertions, typescript/no-unsafe-type-assertion */

afterEach(() => {
  cleanup();
});

describe(PlayerTimelineModal, () => {
  it("does not render dialog content while closed", () => {
    const { container } = render(
      <PlayerTimelineModal onOpenChange={() => {}} open={false} player={player} />,
    );

    expect(container.textContent).not.toContain("t:title");
  });
});
