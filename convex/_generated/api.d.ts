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
import type * as host_disconnect from "../host_disconnect.js";
import type * as import_tracks from "../import_tracks.js";
import type * as lib_game_context from "../lib/game_context.js";
import type * as lib_game_logic from "../lib/game_logic.js";
import type * as lib_round_management from "../lib/round_management.js";
import type * as lib_sessions from "../lib/sessions.js";
import type * as lib_track_selection from "../lib/track_selection.js";
import type * as lobbies from "../lobbies.js";
import type * as players from "../players.js";
import type * as presence from "../presence.js";
import type * as rounds from "../rounds.js";
import type * as seed from "../seed.js";
import type * as test_factories_games from "../test/factories/games.js";
import type * as test_factories_index from "../test/factories/index.js";
import type * as test_factories_lobbies from "../test/factories/lobbies.js";
import type * as test_factories_players from "../test/factories/players.js";
import type * as test_factories_round_bets from "../test/factories/round_bets.js";
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
  host_disconnect: typeof host_disconnect;
  import_tracks: typeof import_tracks;
  "lib/game_context": typeof lib_game_context;
  "lib/game_logic": typeof lib_game_logic;
  "lib/round_management": typeof lib_round_management;
  "lib/sessions": typeof lib_sessions;
  "lib/track_selection": typeof lib_track_selection;
  lobbies: typeof lobbies;
  players: typeof players;
  presence: typeof presence;
  rounds: typeof rounds;
  seed: typeof seed;
  "test/factories/games": typeof test_factories_games;
  "test/factories/index": typeof test_factories_index;
  "test/factories/lobbies": typeof test_factories_lobbies;
  "test/factories/players": typeof test_factories_players;
  "test/factories/round_bets": typeof test_factories_round_bets;
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
  presence: import("@convex-dev/presence/_generated/component.js").ComponentApi<"presence">;
};
