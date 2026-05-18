import { render, screen } from "@testing-library/react"
import type { GenericId } from "convex/values"
import { beforeEach, describe, expect, test, vi } from "vitest"
import { GameContext } from "./game-provider"
import { MyTimeline } from "./my-timeline"

const CARD_REGEX = /card/i

const now = Date.now()
const mockLobbyId = "lobby123" as GenericId<"lobbies">

const createMockPlayer = (
  overrides: Partial<{
    timeline: Array<{
      trackId: GenericId<"tracks">
      year: number
      earnedAtRoundNumber: number
      earnedBy: "placement" | "bet" | "initial"
    }>
    timelineSize: number
  }> = {},
): any => ({
  _id: "player123" as GenericId<"players">,
  _creationTime: now,
  lobbyId: mockLobbyId,
  createdAt: now,
  displayName: "Test Player",
  timeline: [],
  timelineSize: 0,
  coins: 3,
  isHost: false,
  sessionId: "session1",
  ...overrides,
})

const createMockTrack = (id: string, title: string, artist: string, year: number): any => ({
  _id: id as GenericId<"tracks">,
  title,
  artist,
  year,
})

const mockUseQuery = vi.fn()

vi.mock("convex/react", () => ({
  useQuery: vi.fn(),
}))

vi.mock("usehooks-ts", () => ({
  useIsMounted: () => () => true,
}))

vi.mock("react", async () => {
  const actual = await vi.importActual("react")
  return {
    ...actual,
    useMemo: vi.fn((fn) => fn()),
  }
})

import { useQuery } from "convex/react"

const createGameContext = (player: any): any => ({
  state: {
    lobby: null,
    players: [player],
    me: player,
    game: null,
    currentRound: null,
    revealedTracks: [],
    turnPlayer: null,
    isMyTurn: false,
    phase: "placing",
    track: null,
    isGameFinished: false,
    bettingWindowSeconds: undefined,
    turnSeconds: undefined,
    showLiveBets: false,
    selectedPlayerForTimeline: null,
  },
  actions: {
    setSelectedPlayerForTimeline: vi.fn(),
    handleModalClose: vi.fn(),
  },
  meta: {
    sessionId: "session1",
    lobbyId: mockLobbyId,
    code: "ABC123",
  },
})

beforeEach(() => {
  vi.clearAllMocks()
  ;(useQuery as unknown as ReturnType<typeof vi.fn>).mockImplementation(mockUseQuery)
})

describe("MyTimeline", () => {
  test("displays empty state when timeline is empty", () => {
    const mockPlayer = createMockPlayer()
    mockUseQuery.mockReturnValue([])

    const TestWrapper = ({ children }: { children: React.ReactNode }) => {
      return (
        <GameContext.Provider value={createGameContext(mockPlayer)}>
          {children}
        </GameContext.Provider>
      )
    }

    render(<MyTimeline />, { wrapper: TestWrapper })

    expect(screen.queryByText("No cards yet")).not.toBeNull()
    expect(screen.queryByText("Place songs on your timeline to collect cards")).not.toBeNull()
  })

  test("does not show card count when populated", () => {
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
    })

    mockUseQuery.mockReturnValue([createMockTrack("track1", "Test Song", "Test Artist", 1990)])

    const TestWrapper = ({ children }: { children: React.ReactNode }) => {
      return (
        <GameContext.Provider value={createGameContext(mockPlayer)}>
          {children}
        </GameContext.Provider>
      )
    }

    render(<MyTimeline />, { wrapper: TestWrapper })

    expect(screen.queryByText(CARD_REGEX)).toBeNull()
  })

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
    })

    mockUseQuery.mockReturnValue([
      createMockTrack("track1", "Song One", "Artist One", 1985),
      createMockTrack("track2", "Song Two", "Artist Two", 1995),
    ])

    const TestWrapper = ({ children }: { children: React.ReactNode }) => {
      return (
        <GameContext.Provider value={createGameContext(mockPlayer)}>
          {children}
        </GameContext.Provider>
      )
    }

    render(<MyTimeline />, { wrapper: TestWrapper })

    expect(screen.queryByText("Song One")).not.toBeNull()
    expect(screen.queryByText("Song Two")).not.toBeNull()
    expect(screen.queryByText("Artist One")).not.toBeNull()
    expect(screen.queryByText("Artist Two")).not.toBeNull()
  })

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
    })

    mockUseQuery.mockReturnValue([createMockTrack("track1", "Test Song", "Test Artist", 1990)])

    const TestWrapper = ({ children }: { children: React.ReactNode }) => {
      return (
        <GameContext.Provider value={createGameContext(mockPlayer)}>
          {children}
        </GameContext.Provider>
      )
    }

    const { container } = render(<MyTimeline />, { wrapper: TestWrapper })

    expect(container.querySelector(".lucide-target")).not.toBeNull()
  })

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
    })

    mockUseQuery.mockReturnValue([createMockTrack("track1", "Test Song", "Test Artist", 1990)])

    const TestWrapper = ({ children }: { children: React.ReactNode }) => {
      return (
        <GameContext.Provider value={createGameContext(mockPlayer)}>
          {children}
        </GameContext.Provider>
      )
    }

    const { container } = render(<MyTimeline />, { wrapper: TestWrapper })

    expect(container.querySelector(".lucide-trophy")).not.toBeNull()
  })

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
    })

    mockUseQuery.mockReturnValue([createMockTrack("track1", "Test Song", "Test Artist", 1990)])

    const TestWrapper = ({ children }: { children: React.ReactNode }) => {
      return (
        <GameContext.Provider value={createGameContext(mockPlayer)}>
          {children}
        </GameContext.Provider>
      )
    }

    render(<MyTimeline />, { wrapper: TestWrapper })

    const yearElements = screen.getAllByText("1990")
    expect(yearElements.length).toBeGreaterThanOrEqual(1)
  })
})
