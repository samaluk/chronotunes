import {
  create as createGame,
  createInPhase as createGameInPhase,
  createWithRound as createGameWithRound,
  findCurrent as findCurrentGame,
  findById as findGameById,
} from "./games"
import {
  create as createLobby,
  createWithGame as createLobbyWithGame,
  createWithPlayers as createLobbyWithPlayers,
  findByCode as findLobbyByCode,
  findById as findLobbyById,
} from "./lobbies"
import {
  createHost as createHostPlayer,
  createMany as createManyPlayers,
  create as createPlayer,
  createWithCoins as createPlayerWithCoins,
  createWithTimeline as createPlayerWithTimeline,
  findById as findPlayerById,
  findBySessionId as findPlayerBySessionId,
  getAllInLobby as getAllPlayersInLobby,
} from "./players"
import {
  createLocked as createLockedRoundBet,
  createMany as createManyRoundBets,
  create as createRoundBet,
  findAllInRound as findAllRoundBetsInRound,
  findByPlayerAndRound as findRoundBetByPlayerAndRound,
} from "./round_bets"
import {
  create as createRound,
  createInPhase as createRoundInPhase,
  findCurrent as findCurrentRound,
  findById as findRoundById,
} from "./rounds"
import {
  createMany as createManyTracks,
  create as createTrack,
  createForTimeline as createTrackForTimeline,
  createWithYear as createTrackWithYear,
} from "./tracks"

const games = {
  create: createGame,
  createInPhase: createGameInPhase,
  createWithRound: createGameWithRound,
  findById: findGameById,
  findCurrent: findCurrentGame,
}

const lobbies = {
  create: createLobby,
  createWithGame: createLobbyWithGame,
  createWithPlayers: createLobbyWithPlayers,
  findByCode: findLobbyByCode,
  findById: findLobbyById,
}

const players = {
  create: createPlayer,
  createHost: createHostPlayer,
  createMany: createManyPlayers,
  createWithCoins: createPlayerWithCoins,
  createWithTimeline: createPlayerWithTimeline,
  findById: findPlayerById,
  findBySessionId: findPlayerBySessionId,
  getAllInLobby: getAllPlayersInLobby,
}

const roundBets = {
  create: createRoundBet,
  createLocked: createLockedRoundBet,
  createMany: createManyRoundBets,
  findAllInRound: findAllRoundBetsInRound,
  findByPlayerAndRound: findRoundBetByPlayerAndRound,
}

const rounds = {
  create: createRound,
  createInPhase: createRoundInPhase,
  findById: findRoundById,
  findCurrent: findCurrentRound,
}

const tracks = {
  create: createTrack,
  createForTimeline: createTrackForTimeline,
  createMany: createManyTracks,
  createWithYear: createTrackWithYear,
}

export const factories = {
  games,
  lobbies,
  players,
  roundBets,
  rounds,
  tracks,
}

export { games, lobbies, players, roundBets, rounds, tracks }
