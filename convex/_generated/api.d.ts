/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as bets from "../bets.js";
import type * as cron from "../cron.js";
import type * as games from "../games.js";
import type * as hostDisconnect from "../host-disconnect.js";
import type * as importTracks from "../import-tracks.js";
import type * as lib_gameContext from "../lib/game-context.js";
import type * as lib_gameLogic from "../lib/game-logic.js";
import type * as lib_roundManagement from "../lib/round-management.js";
import type * as lib_sessions from "../lib/sessions.js";
import type * as lib_trackSelection from "../lib/track-selection.js";
import type * as lobbies from "../lobbies.js";
import type * as players from "../players.js";
import type * as presence from "../presence.js";
import type * as rounds from "../rounds.js";
import type * as seed from "../seed.js";
import type * as test_factories_games from "../test/factories/games.js";
import type * as test_factories_index from "../test/factories/index.js";
import type * as test_factories_lobbies from "../test/factories/lobbies.js";
import type * as test_factories_players from "../test/factories/players.js";
import type * as test_factories_roundBets from "../test/factories/round-bets.js";
import type * as test_factories_rounds from "../test/factories/rounds.js";
import type * as test_factories_tracks from "../test/factories/tracks.js";
import type * as test_factories_types from "../test/factories/types.js";
import type * as tracks from "../tracks.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  bets: typeof bets;
  cron: typeof cron;
  games: typeof games;
  hostDisconnect: typeof hostDisconnect;
  importTracks: typeof importTracks;
  "lib/gameContext": typeof lib_gameContext;
  "lib/gameLogic": typeof lib_gameLogic;
  "lib/roundManagement": typeof lib_roundManagement;
  "lib/sessions": typeof lib_sessions;
  "lib/trackSelection": typeof lib_trackSelection;
  lobbies: typeof lobbies;
  players: typeof players;
  presence: typeof presence;
  rounds: typeof rounds;
  seed: typeof seed;
  "test/factories/games": typeof test_factories_games;
  "test/factories/index": typeof test_factories_index;
  "test/factories/lobbies": typeof test_factories_lobbies;
  "test/factories/players": typeof test_factories_players;
  "test/factories/roundBets": typeof test_factories_roundBets;
  "test/factories/rounds": typeof test_factories_rounds;
  "test/factories/tracks": typeof test_factories_tracks;
  "test/factories/types": typeof test_factories_types;
  tracks: typeof tracks;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  presence: {
    public: {
      disconnect: FunctionReference<
        "mutation",
        "internal",
        { sessionToken: string },
        null
      >;
      heartbeat: FunctionReference<
        "mutation",
        "internal",
        {
          interval?: number;
          roomId: string;
          sessionId: string;
          userId: string;
        },
        { roomToken: string; sessionToken: string }
      >;
      list: FunctionReference<
        "query",
        "internal",
        { limit?: number; roomToken: string },
        Array<{
          data?: any;
          lastDisconnected: number;
          online: boolean;
          userId: string;
        }>
      >;
      listRoom: FunctionReference<
        "query",
        "internal",
        { limit?: number; onlineOnly?: boolean; roomId: string },
        Array<{ lastDisconnected: number; online: boolean; userId: string }>
      >;
      listUser: FunctionReference<
        "query",
        "internal",
        { limit?: number; onlineOnly?: boolean; userId: string },
        Array<{ lastDisconnected: number; online: boolean; roomId: string }>
      >;
      removeRoom: FunctionReference<
        "mutation",
        "internal",
        { roomId: string },
        null
      >;
      removeRoomUser: FunctionReference<
        "mutation",
        "internal",
        { roomId: string; userId: string },
        null
      >;
      updateRoomUser: FunctionReference<
        "mutation",
        "internal",
        { data?: any; roomId: string; userId: string },
        null
      >;
    };
  };
};
