import type { Page, WebSocketRoute } from "@playwright/test";

const LOBBY_CODE = "ABC234";
const LOBBY_ID = "j573g7f4x8m2q9r1s6t0u4v8w2";

type ConvexMessage = {
  type?: string;
  requestId?: number;
  udfPath?: string;
  newVersion?: number;
  modifications?: Array<{
    type?: string;
    queryId?: number;
    udfPath?: string;
  }>;
};

type QueryModification = NonNullable<ConvexMessage["modifications"]>[number];

type ServerVersion = {
  querySet: number;
  timestamp: number;
};

type ConnectionState = {
  pendingLobbyQueries: Map<number, number>;
  route: WebSocketRoute;
  serverVersion: ServerVersion;
};

type FixtureState = {
  connections: Set<ConnectionState>;
  released: boolean;
};

export interface ConvexFixtureControls {
  releaseLobby: () => void;
}

/**
 * Installs a small Convex sync endpoint for browser tests.
 *
 * It resolves the landing-page create/join mutations and keeps lobbies.get
 * pending until releaseLobby is called. The fixture intentionally speaks only
 * the public sync messages used by these flows; it does not emulate Convex's
 * HTTP or database APIs.
 */
export async function installConvexFixture(page: Page): Promise<ConvexFixtureControls> {
  const state: FixtureState = { connections: new Set(), released: false };
  await page.routeWebSocket(isConvexWebSocket, (route) => registerConnection(route, state));
  return { releaseLobby: () => releaseLobby(state) };
}

function registerConnection(route: WebSocketRoute, state: FixtureState): void {
  const connection: ConnectionState = {
    pendingLobbyQueries: new Map(),
    route,
    serverVersion: { querySet: 0, timestamp: 0 },
  };
  state.connections.add(connection);
  route.onMessage((rawMessage) => handleMessage(rawMessage, connection, state.released));
  route.onClose(() => state.connections.delete(connection));
}

function releaseLobby(state: FixtureState): void {
  state.released = true;
  for (const connection of state.connections) {
    flushPendingLobbyQueries(connection);
  }
}

function flushPendingLobbyQueries(connection: ConnectionState): void {
  const pending = [...connection.pendingLobbyQueries.entries()];
  if (pending.length === 0) {
    return;
  }

  connection.pendingLobbyQueries.clear();
  const querySetVersion = Math.max(...pending.map(([, version]) => version));
  sendLobbyResult(
    connection,
    pending.map(([queryId]) => queryId),
    querySetVersion,
  );
}

function handleMessage(
  rawMessage: string | Buffer,
  connection: ConnectionState,
  released: boolean,
): void {
  const message = parseMessage(rawMessage);
  if (message === null) {
    return;
  }

  if (message.type === "ModifyQuerySet") {
    handleQuerySetModification(message, connection, released);
    return;
  }

  if (message.type === "Mutation") {
    handleMutation(message, connection);
  }
}

function handleQuerySetModification(
  message: ConvexMessage,
  connection: ConnectionState,
  released: boolean,
): void {
  const querySetVersion = message.newVersion ?? connection.serverVersion.querySet;
  const readyQueryIds: number[] = [];
  for (const modification of message.modifications ?? []) {
    if (modification.type !== "Add" || modification.udfPath !== "lobbies:get") {
      continue;
    }
    if (modification.queryId === undefined) {
      continue;
    }
    if (released) {
      readyQueryIds.push(modification.queryId);
    } else {
      connection.pendingLobbyQueries.set(modification.queryId, querySetVersion);
    }
  }
  if (readyQueryIds.length > 0) {
    sendLobbyResult(connection, readyQueryIds, querySetVersion);
  }
}

function handleMutation(message: ConvexMessage, connection: ConnectionState): void {
  if (message.requestId === undefined) {
    return;
  }
  const result = mutationResult(message.udfPath);
  if (result === undefined) {
    return;
  }

  const timestamp = nextTimestamp(connection);
  connection.route.send(
    JSON.stringify({
      type: "MutationResponse",
      requestId: message.requestId,
      success: true,
      result,
      ts: encodeTimestamp(timestamp),
      logLines: [],
    }),
  );
  sendTransition(connection, [], connection.serverVersion.querySet, timestamp);
}

function mutationResult(
  udfPath: string | undefined,
): { code: string } | { lobbyId: string } | undefined {
  if (udfPath === "lobbies:create") {
    return { code: LOBBY_CODE };
  }
  if (udfPath === "lobbies:join") {
    return { lobbyId: LOBBY_ID };
  }
  return undefined;
}

function nextTimestamp(connection: ConnectionState): number {
  return connection.serverVersion.timestamp + 1;
}

function sendLobbyResult(
  connection: ConnectionState,
  queryIds: number[],
  querySetVersion: number,
): void {
  sendTransition(
    connection,
    queryIds.map((queryId) => ({
      type: "QueryUpdated" as const,
      queryId,
      value: null,
      logLines: [],
      journal: null,
    })),
    querySetVersion,
  );
}

function sendTransition(
  connection: ConnectionState,
  modifications: Array<{
    type: "QueryUpdated";
    queryId: number;
    value: null;
    logLines: string[];
    journal: null;
  }>,
  querySetVersion: number,
  transitionTimestamp = nextTimestamp(connection),
): void {
  const startVersion = connection.serverVersion;
  connection.serverVersion = {
    querySet: querySetVersion,
    timestamp: transitionTimestamp,
  };
  connection.route.send(
    JSON.stringify({
      type: "Transition",
      startVersion: {
        querySet: startVersion.querySet,
        ts: encodeTimestamp(startVersion.timestamp),
        identity: 0,
      },
      endVersion: {
        querySet: querySetVersion,
        ts: encodeTimestamp(transitionTimestamp),
        identity: 0,
      },
      modifications,
    }),
  );
}

function parseMessage(rawMessage: string | Buffer): ConvexMessage | null {
  try {
    const parsed: unknown = JSON.parse(rawMessage.toString());
    if (!isRecord(parsed)) {
      return null;
    }
    const modifications = Array.isArray(parsed.modifications)
      ? parsed.modifications.flatMap((value): QueryModification[] => {
          if (!isRecord(value)) {
            return [];
          }
          return [
            {
              type: typeof value.type === "string" ? value.type : undefined,
              queryId: typeof value.queryId === "number" ? value.queryId : undefined,
              udfPath: typeof value.udfPath === "string" ? value.udfPath : undefined,
            },
          ];
        })
      : undefined;

    return {
      type: typeof parsed.type === "string" ? parsed.type : undefined,
      requestId: typeof parsed.requestId === "number" ? parsed.requestId : undefined,
      udfPath: typeof parsed.udfPath === "string" ? parsed.udfPath : undefined,
      newVersion: typeof parsed.newVersion === "number" ? parsed.newVersion : undefined,
      modifications,
    };
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isConvexWebSocket(url: URL): boolean {
  return (
    url.hostname === "127.0.0.1" &&
    url.port === "3210" &&
    /^\/api\/[^/]+\/sync$/u.test(url.pathname)
  );
}

function encodeTimestamp(value: number): string {
  const bytes = Buffer.alloc(8);
  bytes.writeBigUInt64LE(BigInt(value));
  return bytes.toString("base64");
}
