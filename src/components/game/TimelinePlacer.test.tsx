import { render, screen } from "@testing-library/react";
import type { GenericId } from "convex/values";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, test, vi } from "vitest";
import messages from "../../../messages/en.json";
import { TimelinePlacer } from "./TimelinePlacer";

vi.mock("@/convex/_generated/api.js", () => ({
  api: {
    rounds: {
      setPlacementPreview: vi.fn(),
      submitPlacement: vi.fn(),
    },
  },
}));

vi.mock("convex/react", () => ({
  useMutation: vi.fn(() => vi.fn()),
}));

vi.mock("convex-helpers/react/sessions", () => ({
  useSessionQuery: vi.fn(() => null),
  useSessionMutation: vi.fn(() => vi.fn()),
  SessionProvider: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock("react", () => ({
  useEffect: vi.fn((fn) => fn()),
  useState: vi.fn((initial) => {
    if (typeof initial === "function") {
      return [initial(), vi.fn()];
    }
    return [initial, vi.fn()];
  }),
  useCallback: vi.fn((fn) => fn),
  useMemo: vi.fn((fn) => fn()),
  useRef: vi.fn((initial) => ({ current: initial })),
}));

const createMockPlayer = (
  overrides: Partial<{
    _id: GenericId<"players">;
    displayName: string;
    timeline: Array<{
      trackId: GenericId<"tracks">;
      year: number;
      earnedAtRoundNumber: number;
      earnedBy: "placement" | "bet" | "initial";
    }>;
    timelineSize: number;
    coins: number;
  }> = {},
): {
  _id: GenericId<"players">;
  _creationTime: number;
  displayName: string;
  timeline: Array<{
    trackId: GenericId<"tracks">;
    year: number;
    earnedAtRoundNumber: number;
    earnedBy: "placement" | "bet" | "initial";
  }>;
  timelineSize: number;
  coins: number;
  lobbyId: GenericId<"lobbies">;
  sessionId: string;
  isHost: boolean;
  createdAt: number;
} => ({
  _id: "player123" as GenericId<"players">,
  _creationTime: Date.now(),
  displayName: "Test Player",
  timeline: [],
  timelineSize: 0,
  coins: 3,
  lobbyId: "lobby123" as GenericId<"lobbies">,
  sessionId: "session123",
  isHost: false,
  createdAt: Date.now(),
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
  _id: "track123" as GenericId<"tracks">,
  title: "Test Song",
  artist: "Test Artist",
  year: 1990,
  ...overrides,
});

const lobbyId = "lobby123" as GenericId<"lobbies">;

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

    expect(screen.getByRole("heading", { name: /place the song/i })).toBeInTheDocument();
    expect(screen.getByText("New Song")).toBeInTheDocument();
    expect(screen.getByText("Guess the year!")).toBeInTheDocument();
  });

  test("renders timeline with existing cards", () => {
    const mockPlayer = createMockPlayer({
      timeline: [
        {
          trackId: "track1" as GenericId<"tracks">,
          year: 1980,
          earnedAtRoundNumber: 1,
          earnedBy: "placement",
        },
        {
          trackId: "track2" as GenericId<"tracks">,
          year: 1990,
          earnedAtRoundNumber: 2,
          earnedBy: "bet",
        },
      ],
      timelineSize: 2,
    });
    const mockTrack = createMockTrack({ title: "New Song", artist: "New Artist" });

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

    expect(screen.getByText("New Song")).toBeInTheDocument();
  });

  test("displays confirm placement button", () => {
    const mockPlayer = createMockPlayer({
      timeline: [
        {
          trackId: "track1" as GenericId<"tracks">,
          year: 1980,
          earnedAtRoundNumber: 1,
          earnedBy: "placement",
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

    expect(screen.getByRole("button", { name: /confirm placement/i })).toBeInTheDocument();
  });
});
