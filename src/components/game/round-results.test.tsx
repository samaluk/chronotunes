import { cleanup, render, screen } from "@testing-library/react"
import type { GenericId } from "convex/values"
import { afterEach, describe, expect, it, vi } from "vitest"
import { GameContext } from "./game-provider"
import { RoundResults } from "./round-results"

const mockLobbyId = "lobby123" as GenericId<"lobbies">
const now = Date.now()

const createMockPlayer = (overrides = {}) => ({
  _id: "player1" as GenericId<"players">,
  _creationTime: now,
  lobbyId: mockLobbyId,
  createdAt: now,
  displayName: "TestPlayer",
  timeline: [],
  timelineSize: 0,
  coins: 3,
  isHost: true,
  sessionId: "session1",
  ...overrides,
})

const mockPlayers = [
  createMockPlayer({
    _id: "player1" as GenericId<"players">,
    displayName: "Player1",
    isHost: true,
    sessionId: "session1",
  }),
  createMockPlayer({
    _id: "player2" as GenericId<"players">,
    displayName: "Player2",
    isHost: false,
    sessionId: "session2",
    timelineSize: 1,
    coins: 2,
  }),
]

const mockTrack = {
  _id: "track1" as GenericId<"tracks">,
  title: "Test Song",
  artist: "Test Artist",
  year: 2020,
}

const mockResolution = {
  validIndexMin: 0,
  validIndexMax: 1,
  turnPlayerWasCorrect: true,
  awardedPlayerIds: ["player1"] as GenericId<"players">[],
  coinDeltas: [],
  resolvedAt: now,
}

vi.mock("convex/react", () => ({
  useMutation: vi.fn(() => vi.fn()),
  useQuery: vi.fn(() => null),
}))

vi.mock("convex-helpers/react/sessions", () => ({
  useSessionQuery: vi.fn(() => null),
  useSessionMutation: vi.fn(() => vi.fn()),
  SessionProvider: ({ children }: { children: React.ReactNode }) => children,
}))

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}))

let useStateCallCount = 0

vi.mock("react", async () => {
  const actual = await vi.importActual("react")
  return {
    ...actual,
    useMemo: vi.fn((fn) => fn()),
    useState: vi.fn((initial) => {
      useStateCallCount += 1
      if (useStateCallCount === 2) {
        return [true, vi.fn()]
      }
      if (typeof initial === "function") {
        return [initial(), vi.fn()]
      }
      return [initial, vi.fn()]
    }),
  }
})

afterEach(() => {
  cleanup()
  useStateCallCount = 0
})

const startNextRoundRegex = /Start Next Round/i
const waitingForHostRegex = /Waiting for host to start next round/i
const resolvedAtRegex = /Resolved at/i

const createContextValue = (
  overrides: { state?: Record<string, unknown>; meta?: Record<string, unknown> } = {},
) => ({
  state: {
    lobby: null,
    players: mockPlayers,
    me: mockPlayers[0],
    game: null,
    currentRound: { resolution: mockResolution },
    revealedTracks: [],
    turnPlayer: mockPlayers[0],
    isMyTurn: false,
    phase: "resolved" as const,
    track: mockTrack,
    isGameFinished: false,
    bettingWindowSeconds: undefined,
    turnSeconds: undefined,
    showLiveBets: false,
    selectedPlayerForTimeline: null,
    ...overrides.state,
  },
  actions: {
    setSelectedPlayerForTimeline: vi.fn(),
    handleModalClose: vi.fn(),
  },
  meta: {
    sessionId: "session1",
    lobbyId: mockLobbyId,
    code: "ABC123",
    ...overrides.meta,
  },
})

describe("RoundResults", () => {
  it("displays song title, artist, and year", () => {
    render(
      <GameContext.Provider value={createContextValue() as any}>
        <RoundResults />
      </GameContext.Provider>,
    )

    expect(screen.getByText((content) => content.includes("Test Song"))).toBeInTheDocument()
    expect(screen.getByText((content) => content.includes("Test Artist"))).toBeInTheDocument()
    expect(screen.getByText("2020")).toBeInTheDocument()
  })

  it("shows correct placement result when turn player was correct", () => {
    render(
      <GameContext.Provider value={createContextValue() as any}>
        <RoundResults />
      </GameContext.Provider>,
    )

    expect(screen.getByText("correct")).toBeInTheDocument()
  })

  it("shows incorrect placement result when turn player was wrong", () => {
    const wrongResolution = {
      ...mockResolution,
      turnPlayerWasCorrect: false,
    }

    render(
      <GameContext.Provider
        value={
          createContextValue({ state: { currentRound: { resolution: wrongResolution } } }) as any
        }
      >
        <RoundResults />
      </GameContext.Provider>,
    )

    expect(screen.getByText("incorrect")).toBeInTheDocument()
  })

  it("displays card awards for awarded players", () => {
    render(
      <GameContext.Provider value={createContextValue() as any}>
        <RoundResults />
      </GameContext.Provider>,
    )

    expect(screen.getByText("Card Awards")).toBeInTheDocument()
    expect(screen.getByText("Player1")).toBeInTheDocument()
  })

  it("displays resolved timestamp", () => {
    render(
      <GameContext.Provider value={createContextValue() as any}>
        <RoundResults />
      </GameContext.Provider>,
    )

    expect(screen.getByText(resolvedAtRegex)).toBeInTheDocument()
  })

  it("shows message when no cards were awarded", () => {
    const noAwardResolution = {
      ...mockResolution,
      turnPlayerWasCorrect: false,
      awardedPlayerIds: [],
    }

    render(
      <GameContext.Provider
        value={
          createContextValue({ state: { currentRound: { resolution: noAwardResolution } } }) as any
        }
      >
        <RoundResults />
      </GameContext.Provider>,
    )

    expect(screen.getByText("No cards were awarded this round")).toBeInTheDocument()
  })

  it("highlights current user with (You) indicator", () => {
    render(
      <GameContext.Provider value={createContextValue() as any}>
        <RoundResults />
      </GameContext.Provider>,
    )

    expect(screen.getByText("(You)")).toBeInTheDocument()
  })

  it("shows host controls when user is host", () => {
    render(
      <GameContext.Provider value={createContextValue() as any}>
        <RoundResults />
      </GameContext.Provider>,
    )

    expect(screen.getByRole("button", { name: startNextRoundRegex })).toBeInTheDocument()
  })

  it("shows waiting state when user is not host", () => {
    render(
      <GameContext.Provider value={createContextValue({ state: { me: mockPlayers[1] } }) as any}>
        <RoundResults />
      </GameContext.Provider>,
    )

    expect(screen.getByText(waitingForHostRegex)).toBeInTheDocument()
  })
})
