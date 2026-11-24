import { render, screen } from "@testing-library/react";
import type { GenericId } from "convex/values";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, test, vi } from "vitest";

import messages from "../../../messages/en.json";
import { TimelinePlacer } from "./timeline-placer";

// oxlint-disable-next-line landmines/no-test-doubles -- TODO(landmines): remove grandfathered violation.
vi.mock(import("@/convex/_generated/api.js"), () => ({
  api: {
    rounds: {
      setPlacementPreview: vi.fn<() => void>(),
      submitPlacement: vi.fn<() => void>(),
    },
  },
}));

// oxlint-disable-next-line landmines/no-test-doubles -- TODO(landmines): remove grandfathered violation.
vi.mock(import("convex/react"), () => ({
  // oxlint-disable-next-line landmines/no-test-doubles -- TODO(landmines): remove grandfathered violation.
  useMutation: vi.fn<() => () => void>(() => vi.fn<() => void>()),
}));

// oxlint-disable-next-line landmines/no-test-doubles -- TODO(landmines): remove grandfathered violation.
vi.mock(import("convex-helpers/react/sessions"), () => ({
  SessionProvider: ({ children }: { children: React.ReactNode }) => children,
  // oxlint-disable-next-line landmines/no-test-doubles -- TODO(landmines): remove grandfathered violation.
  useSessionMutation: vi.fn<() => () => void>(() => vi.fn<() => void>()),
  // oxlint-disable-next-line landmines/no-test-doubles -- TODO(landmines): remove grandfathered violation.
  useSessionQuery: vi.fn<() => null>(() => null),
}));

// oxlint-disable-next-line landmines/no-test-doubles -- TODO(landmines): remove grandfathered violation.
vi.mock(import("react"), () => ({
  // oxlint-disable-next-line typescript/no-unsafe-return, landmines/no-test-doubles -- TODO(landmines): remove grandfathered violation.
  useCallback: vi.fn<<T extends (...args: unknown[]) => unknown>(fn: T) => T>((fn) => fn),
  // oxlint-disable-next-line typescript/no-unsafe-call, typescript/no-unsafe-return, landmines/no-test-doubles -- TODO(landmines): remove grandfathered violation.
  useEffect: vi.fn<(fn: () => void) => void>((fn) => fn()),
  // oxlint-disable-next-line typescript/no-unsafe-return, landmines/no-test-doubles -- TODO(landmines): remove grandfathered violation.
  useEffectEvent: vi.fn<<T extends (...args: unknown[]) => unknown>(fn: T) => T>((fn) => fn),
  // oxlint-disable-next-line typescript/no-unsafe-call, typescript/no-unsafe-return, landmines/no-test-doubles -- TODO(landmines): remove grandfathered violation.
  useMemo: vi.fn<<T>(fn: () => T) => T>((fn) => fn()),
  // oxlint-disable-next-line typescript/no-unsafe-assignment, landmines/no-test-doubles -- TODO(landmines): remove grandfathered violation.
  useRef: vi.fn<<T>(initial: T) => { current: T }>((initial) => ({ current: initial })),
  // oxlint-disable-next-line landmines/no-test-doubles -- TODO(landmines): remove grandfathered violation.
  useState: vi.fn<<T>(initial: T | (() => T)) => [T, (val: unknown) => void]>((initial) => {
    if (typeof initial === "function") {
      // oxlint-disable-next-line typescript/no-unsafe-call, typescript/no-unsafe-return
      return [initial(), vi.fn<(val: unknown) => void>()];
    }
    // oxlint-disable-next-line typescript/no-unsafe-return
    return [initial, vi.fn<(val: unknown) => void>()];
  }),
}));

const createMockPlayer = (
  overrides: Partial<{
    _id: GenericId<"players">;
    displayName: string;
    timeline: {
      trackId: GenericId<"tracks">;
      year: number;
      earnedAtRoundNumber: number;
      earnedBy: "placement" | "bet" | "initial";
    }[];
    timelineSize: number;
    coins: number;
  }> = {},
): {
  _id: GenericId<"players">;
  _creationTime: number;
  displayName: string;
  timeline: {
    trackId: GenericId<"tracks">;
    year: number;
    earnedAtRoundNumber: number;
    earnedBy: "placement" | "bet" | "initial";
  }[];
  timelineSize: number;
  coins: number;
  lobbyId: GenericId<"lobbies">;
  sessionId: string;
  isHost: boolean;
  createdAt: number;
} => ({
  _creationTime: Date.now(),
  // oxlint-disable-next-line typescript/consistent-type-assertions, typescript/no-unsafe-type-assertion
  _id: "player123" as GenericId<"players">,
  coins: 3,
  createdAt: Date.now(),
  displayName: "Test Player",
  isHost: false,
  // oxlint-disable-next-line typescript/consistent-type-assertions, typescript/no-unsafe-type-assertion
  lobbyId: "lobby123" as GenericId<"lobbies">,
  sessionId: "session123",
  timeline: [],
  timelineSize: 0,
  ...overrides,
});

const createMockTrack = (
  overrides: Partial<{
    _id: GenericId<"tracks">;
    title: string;
    artist: string;
    year: number;
  }> = {},
): {
  _id: GenericId<"tracks">;
  title: string;
  artist: string;
  year: number;
} => ({
  // oxlint-disable-next-line typescript/consistent-type-assertions, typescript/no-unsafe-type-assertion
  _id: "track123" as GenericId<"tracks">,
  artist: "Test Artist",
  title: "Test Song",
  year: 1990,
  ...overrides,
});

// oxlint-disable-next-line typescript/consistent-type-assertions, typescript/no-unsafe-type-assertion
const lobbyId = "lobby123" as GenericId<"lobbies">;
const placeSongHeadingText = "Place the Song";
const placeOnTimelineText = /Place on timeline/i;
const confirmPlacementText = "Confirm Placement";

describe("TimelinePlacer", () => {
  test("renders loading state when track is null", () => {
    const mockPlayer = createMockPlayer();

    render(
      <NextIntlClientProvider locale="en" messages={messages}>
        <TimelinePlacer
          currentTrack={null}
          existingPreviewIndex={null}
          lobbyId={lobbyId}
          player={mockPlayer}
          revealedTracks={[]}
        />
      </NextIntlClientProvider>,
    );

    // oxlint-disable-next-line typescript/no-unsafe-call
    expect(screen.getByText("Loading track...")).toBeInTheDocument();
  });

  test("renders empty timeline with drop zone", () => {
    const mockPlayer = createMockPlayer();
    const mockTrack = createMockTrack();

    render(
      <NextIntlClientProvider locale="en" messages={messages}>
        <TimelinePlacer
          currentTrack={mockTrack}
          existingPreviewIndex={null}
          lobbyId={lobbyId}
          player={mockPlayer}
          revealedTracks={[]}
        />
      </NextIntlClientProvider>,
    );

    // oxlint-disable-next-line typescript/no-unsafe-call
    expect(screen.getByRole("heading", { name: placeSongHeadingText })).toBeInTheDocument();
    // oxlint-disable-next-line typescript/no-unsafe-call
    expect(screen.getByRole("button", { name: placeOnTimelineText })).toBeInTheDocument();
  });

  test("renders timeline with existing cards", () => {
    const mockPlayer = createMockPlayer({
      timeline: [
        {
          earnedAtRoundNumber: 1,
          earnedBy: "placement",
          // oxlint-disable-next-line typescript/consistent-type-assertions, typescript/no-unsafe-type-assertion
          trackId: "track1" as GenericId<"tracks">,
          year: 1980,
        },
        {
          earnedAtRoundNumber: 2,
          earnedBy: "bet",
          // oxlint-disable-next-line typescript/consistent-type-assertions, typescript/no-unsafe-type-assertion
          trackId: "track2" as GenericId<"tracks">,
          year: 1990,
        },
      ],
      timelineSize: 2,
    });
    const mockTrack = createMockTrack({
      artist: "New Artist",
      title: "New Song",
    });

    render(
      <NextIntlClientProvider locale="en" messages={messages}>
        <TimelinePlacer
          currentTrack={mockTrack}
          existingPreviewIndex={null}
          lobbyId={lobbyId}
          player={mockPlayer}
          revealedTracks={[]}
        />
      </NextIntlClientProvider>,
    );

    expect(screen.getAllByText("Known Track")).toHaveLength(2);
  });

  test("displays confirm placement button", () => {
    const mockPlayer = createMockPlayer({
      timeline: [
        {
          earnedAtRoundNumber: 1,
          earnedBy: "placement",
          // oxlint-disable-next-line typescript/consistent-type-assertions, typescript/no-unsafe-type-assertion
          trackId: "track1" as GenericId<"tracks">,
          year: 1980,
        },
      ],
      timelineSize: 1,
    });
    const mockTrack = createMockTrack();

    render(
      <NextIntlClientProvider locale="en" messages={messages}>
        <TimelinePlacer
          currentTrack={mockTrack}
          existingPreviewIndex={null}
          lobbyId={lobbyId}
          player={mockPlayer}
          revealedTracks={[]}
        />
      </NextIntlClientProvider>,
    );

    // oxlint-disable-next-line typescript/no-unsafe-call
    expect(screen.getByRole("button", { name: confirmPlacementText })).toBeInTheDocument();
  });
});
