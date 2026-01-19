import { render, screen } from "@testing-library/react";
import type { GenericId } from "convex/values";
import { describe, expect, test, vi } from "vitest";
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

vi.mock("@/lib/hooks/use-session-id", () => ({
  useSessionId: vi.fn(() => "session123"),
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
}));

const createMockPlayer = (
  overrides: Partial<{
    _id: GenericId<"players">;
    displayName: string;
    timeline: Array<{
      trackId: GenericId<"tracks">;
      year: number;
      earnedAtRoundNumber: number;
      earnedBy: "placement" | "bet";
    }>;
    timelineSize: number;
  }> = {},
): {
  _id: GenericId<"players">;
  displayName: string;
  timeline: Array<{
    trackId: GenericId<"tracks">;
    year: number;
    earnedAtRoundNumber: number;
    earnedBy: "placement" | "bet";
  }>;
  timelineSize: number;
} => ({
  _id: "player123" as GenericId<"players">,
  displayName: "Test Player",
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
      <TimelinePlacer
        lobbyId={lobbyId}
        player={mockPlayer}
        currentTrack={null}
        existingPreviewIndex={null}
      />,
    );

    expect(screen.getByText("Loading track...")).toBeInTheDocument();
  });

  test("renders empty timeline with drop zone", () => {
    const mockPlayer = createMockPlayer();
    const mockTrack = createMockTrack();

    render(
      <TimelinePlacer
        lobbyId={lobbyId}
        player={mockPlayer}
        currentTrack={mockTrack}
        existingPreviewIndex={null}
      />,
    );

    expect(screen.getByRole("heading", { name: /place the song/i })).toBeInTheDocument();
    expect(screen.getByText("Test Song")).toBeInTheDocument();
    expect(screen.getByText("Test Artist")).toBeInTheDocument();
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
      <TimelinePlacer
        lobbyId={lobbyId}
        player={mockPlayer}
        currentTrack={mockTrack}
        existingPreviewIndex={null}
      />,
    );

    expect(screen.getByText("New Song")).toBeInTheDocument();
  });

  test("displays card count", () => {
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
      <TimelinePlacer
        lobbyId={lobbyId}
        player={mockPlayer}
        currentTrack={mockTrack}
        existingPreviewIndex={null}
      />,
    );

    expect(screen.getByText("1 card in timeline")).toBeInTheDocument();
  });
});
