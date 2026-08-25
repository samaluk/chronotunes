import { cleanup, fireEvent, render, renderHook, screen } from "@testing-library/react";
import type { GenericId } from "convex/values";
import { afterEach, describe, expect, it } from "vitest";

import { deriveRoundState, useGame } from "./game-context";
import { GameProvider } from "./game-provider";

// oxlint-disable-next-line typescript/consistent-type-assertions, typescript/no-unsafe-type-assertion
const lobbyId = "lobby1" as GenericId<"lobbies">;
const now = Date.now();

const createPlayer = (id: string, overrides = {}) => ({
  _creationTime: now,
  // oxlint-disable-next-line typescript/consistent-type-assertions, typescript/no-unsafe-type-assertion
  _id: id as GenericId<"players">,
  coins: 0,
  createdAt: now,
  displayName: `Player ${id}`,
  isHost: false,
  lobbyId,
  sessionId: `session-${id}`,
  timeline: [],
  timelineSize: 0,
  ...overrides,
});

const playerA = createPlayer("a");
const playerB = createPlayer("b");

const createRound = (overrides = {}) => ({
  _creationTime: now,
  // oxlint-disable-next-line typescript/consistent-type-assertions, typescript/no-unsafe-type-assertion
  _id: "round1" as GenericId<"rounds">,
  // oxlint-disable-next-line typescript/consistent-type-assertions, typescript/no-unsafe-type-assertion
  gameId: "game1" as GenericId<"games">,
  phase: "placing" as const,
  roundNumber: 1,
  startedAt: now,
  // oxlint-disable-next-line typescript/consistent-type-assertions, typescript/no-unsafe-type-assertion
  trackId: "track1" as GenericId<"tracks">,
  turnPlayerId: playerA._id,
  ...overrides,
});

const baseArgs = {
  currentRound: null,
  game: null,
  me: null,
  players: [playerA, playerB],
};

afterEach(() => {
  cleanup();
});

describe("deriveRoundState", () => {
  it("falls back to placing phase with no round", () => {
    const derived = deriveRoundState(baseArgs);

    expect(derived.phase).toBe("placing");
    expect(derived.turnPlayer).toBeNull();
    expect(derived.track).toBeNull();
    expect(derived.isMyTurn).toBe(false);
    expect(derived.isGameFinished).toBe(false);
  });

  it("finds the turn player and marks my turn when I am up", () => {
    const derived = deriveRoundState({
      ...baseArgs,
      currentRound: createRound(),
      me: playerA,
    });

    expect(derived.turnPlayer).toEqual(playerA);
    expect(derived.isMyTurn).toBe(true);
    expect(derived.phase).toBe("placing");
  });

  it("does not mark my turn when another player is up", () => {
    const derived = deriveRoundState({
      ...baseArgs,
      currentRound: createRound(),
      me: playerB,
    });

    expect(derived.isMyTurn).toBe(false);
  });

  it("maps the round track into track info", () => {
    const year = 1987;
    const derived = deriveRoundState({
      ...baseArgs,
      currentRound: createRound({
        track: {
          // oxlint-disable-next-line typescript/consistent-type-assertions, typescript/no-unsafe-type-assertion
          trackId: "track9" as GenericId<"tracks">,
          artist: "A",
          title: "T",
          year,
        },
      }),
    });

    expect(derived.track).toEqual({ _id: "track9", artist: "A", title: "T", year });
  });

  it("marks a finished game", () => {
    const derived = deriveRoundState({
      ...baseArgs,
      // oxlint-disable-next-line typescript/consistent-type-assertions, typescript/no-unsafe-type-assertion
      game: { _id: "game1", status: "finished" } as never,
    });

    expect(derived.isGameFinished).toBe(true);
  });
});

describe("GameProvider", () => {
  it("shares state through context and closes the player modal", async () => {
    function Consumer(): React.ReactNode {
      const { state, actions } = useGame();

      return (
        <>
          <button
            onClick={() => {
              actions.setSelectedPlayerForTimeline(playerA);
            }}
            type="button"
          >
            select-player
          </button>
          <button onClick={actions.handleModalClose} type="button">
            close-modal
          </button>
          <p>{state.phase}</p>
          <p>{state.selectedPlayerForTimeline ? "modal-open" : "modal-closed"}</p>
          <p>{state.turnPlayer === null ? "no-turn" : "has-turn"}</p>
        </>
      );
    }

    render(
      <GameProvider
        code="ABC123"
        currentRound={createRound()}
        game={null}
        lobby={null}
        lobbyId={lobbyId}
        me={playerB}
        players={[playerA, playerB]}
        revealedTracks={[]}
        sessionId="session-b"
      >
        <Consumer />
      </GameProvider>,
    );

    expect(screen.getByText("placing")).toBeDefined();
    expect(screen.getByText("modal-closed")).toBeDefined();
    expect(screen.getByText("has-turn")).toBeDefined();

    fireEvent.click(screen.getByText("select-player"));
    expect(screen.getByText("modal-open")).toBeDefined();

    fireEvent.click(screen.getByText("close-modal"));
    expect(screen.getByText("modal-closed")).toBeDefined();
  });

  it("reads live-bet and timing settings from the lobby", () => {
    const { result } = renderHook(() => useGame(), {
      wrapper: ({ children }) => (
        <GameProvider
          code="ABC123"
          currentRound={null}
          game={null}
          lobby={{
            _creationTime: now,
            // oxlint-disable-next-line typescript/consistent-type-assertions, typescript/no-unsafe-type-assertion
            _id: lobbyId,
            activeGameId: undefined,
            code: "ABC123",
            hostSessionId: "session-a",
            settings: { bettingWindowSeconds: 30, showLiveBets: true, turnSeconds: 60 },
            status: "lobby",
          }}
          lobbyId={lobbyId}
          me={null}
          players={[]}
          revealedTracks={[]}
          sessionId={null}
        >
          {children}
        </GameProvider>
      ),
    });

    expect(result.current.state.showLiveBets).toBe(true);
    expect(result.current.state.bettingWindowSeconds).toBe(30);
    expect(result.current.state.turnSeconds).toBe(60);
  });
});
