import { render, screen } from "@testing-library/react";
import type { GenericId } from "convex/values";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { MyTimeline } from "./MyTimeline";

const createMockPlayer = (
  overrides: Partial<{
    timeline: Array<{
      trackId: GenericId<"tracks">;
      year: number;
      earnedAtRoundNumber: number;
      earnedBy: "placement" | "bet" | "initial";
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
    earnedBy: "placement" | "bet" | "initial";
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
  id: string,
  title: string,
  artist: string,
  year: number,
): {
  _id: GenericId<"tracks">;
  title: string;
  artist: string;
  year: number;
} => ({
  _id: id as GenericId<"tracks">,
  title,
  artist,
  year,
});

const mockUseQuery = vi.fn();
const _mockUseEffect = vi.fn((fn) => fn());
const _mockUseState = vi.fn(() => [true, vi.fn()]);

vi.mock("@/convex/_generated/api.js", () => ({
  api: {
    tracks: {
      get: vi.fn(),
    },
  },
}));

vi.mock("convex/react", () => ({
  useQuery: vi.fn(),
}));

vi.mock("react", () => ({
  useEffect: vi.fn((fn) => fn()),
  useState: vi.fn(() => [true, vi.fn()]),
}));

import { useQuery } from "convex/react";

beforeEach(() => {
  vi.clearAllMocks();
  (useQuery as unknown as ReturnType<typeof vi.fn>).mockImplementation(mockUseQuery);
});

describe("MyTimeline", () => {
  test("displays empty state when timeline is empty", () => {
    const mockPlayer = createMockPlayer();

    mockUseQuery.mockReturnValue([]);

    render(<MyTimeline player={mockPlayer} />);

    expect(screen.queryByText("No cards yet")).not.toBeNull();
    expect(screen.queryByText("Place songs on your timeline to collect cards")).not.toBeNull();
  });

  test("displays card count correctly", () => {
    const mockPlayer = createMockPlayer({
      timeline: [
        {
          trackId: "track1" as GenericId<"tracks">,
          year: 1990,
          earnedAtRoundNumber: 1,
          earnedBy: "placement",
        },
      ],
      timelineSize: 1,
    });

    mockUseQuery.mockReturnValue([]);

    render(<MyTimeline player={mockPlayer} />);

    expect(screen.queryByText("1 card")).not.toBeNull();
  });

  test("displays multiple cards correctly", () => {
    const mockPlayer = createMockPlayer({
      timeline: [
        {
          trackId: "track1" as GenericId<"tracks">,
          year: 1985,
          earnedAtRoundNumber: 1,
          earnedBy: "placement",
        },
        {
          trackId: "track2" as GenericId<"tracks">,
          year: 1995,
          earnedAtRoundNumber: 2,
          earnedBy: "bet",
        },
      ],
      timelineSize: 2,
    });

    mockUseQuery.mockReturnValue([
      createMockTrack("track1", "Song One", "Artist One", 1985),
      createMockTrack("track2", "Song Two", "Artist Two", 1995),
    ]);

    render(<MyTimeline player={mockPlayer} />);

    expect(screen.queryByText("Song One")).not.toBeNull();
    expect(screen.queryByText("Song Two")).not.toBeNull();
    expect(screen.queryByText("Artist One")).not.toBeNull();
    expect(screen.queryByText("Artist Two")).not.toBeNull();
  });

  test("shows placement indicator for cards earned by placement", () => {
    const mockPlayer = createMockPlayer({
      timeline: [
        {
          trackId: "track1" as GenericId<"tracks">,
          year: 1990,
          earnedAtRoundNumber: 1,
          earnedBy: "placement",
        },
      ],
      timelineSize: 1,
    });

    mockUseQuery.mockReturnValue([createMockTrack("track1", "Test Song", "Test Artist", 1990)]);

    render(<MyTimeline player={mockPlayer} />);

    const placementElements = screen.getAllByText("Placed yourself");
    expect(placementElements.length).toBeGreaterThanOrEqual(1);
  });

  test("shows bet indicator for cards earned by bet", () => {
    const mockPlayer = createMockPlayer({
      timeline: [
        {
          trackId: "track1" as GenericId<"tracks">,
          year: 1990,
          earnedAtRoundNumber: 1,
          earnedBy: "bet",
        },
      ],
      timelineSize: 1,
    });

    mockUseQuery.mockReturnValue([createMockTrack("track1", "Test Song", "Test Artist", 1990)]);

    render(<MyTimeline player={mockPlayer} />);

    const betElements = screen.getAllByText("Won from bet");
    expect(betElements.length).toBeGreaterThanOrEqual(1);
  });

  test("displays year for each card", () => {
    const mockPlayer = createMockPlayer({
      timeline: [
        {
          trackId: "track1" as GenericId<"tracks">,
          year: 1990,
          earnedAtRoundNumber: 1,
          earnedBy: "placement",
        },
      ],
      timelineSize: 1,
    });

    mockUseQuery.mockReturnValue([createMockTrack("track1", "Test Song", "Test Artist", 1990)]);

    render(<MyTimeline player={mockPlayer} />);

    const yearElements = screen.getAllByText("1990");
    expect(yearElements.length).toBeGreaterThanOrEqual(1);
  });
});
