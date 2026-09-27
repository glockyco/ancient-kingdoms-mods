import initSqlJs, { type Database, type SqlValue } from "sql.js-fts5";
import sqlWasmUrl from "sql.js-fts5/dist/sql-wasm.wasm?url";
import { inflatedBytes } from "./gzip";

/**
 * Content-hashed database URL, supplied by the main thread. The worker cannot
 * import it itself without emitting a second copy of the database under a
 * different hashed name (see src/lib/database-assets.ts).
 */
let databaseUrl: string | null = null;

interface ConfigureMessage {
  kind: "configure";
  url: string;
}

interface QueryRequest {
  kind: "query";
  id: number;
  sql: string;
  params: SqlValue[];
}

type WorkerMessage = ConfigureMessage | QueryRequest;

interface QueryResponse {
  id: number;
  rows?: unknown[];
  error?: string;
}

let databasePromise: Promise<Database> | null = null;

async function loadDatabase(): Promise<Database> {
  const SQL = await initSqlJs({ locateFile: () => sqlWasmUrl });
  if (!databaseUrl) {
    throw new Error("Database worker was queried before it was configured");
  }
  const response = await fetch(databaseUrl);
  if (!response.ok) {
    throw new Error(`Unable to load the database (${response.status})`);
  }
  return new SQL.Database(await inflatedBytes(response));
}

async function execute(request: QueryRequest): Promise<unknown[]> {
  databasePromise ??= loadDatabase();
  const database = await databasePromise;
  const statement = database.prepare(request.sql);
  try {
    statement.bind(request.params);
    const rows: unknown[] = [];
    while (statement.step()) rows.push(statement.getAsObject());
    return rows;
  } finally {
    statement.free();
  }
}

self.onmessage = (event: MessageEvent<WorkerMessage>) => {
  if (event.data.kind === "configure") {
    databaseUrl = event.data.url;
    return;
  }

  const request = event.data;
  execute(request)
    .then((rows) => {
      const response: QueryResponse = { id: request.id, rows };
      self.postMessage(response);
    })
    .catch((error: unknown) => {
      const response: QueryResponse = {
        id: request.id,
        error: error instanceof Error ? error.message : String(error),
      };
      self.postMessage(response);
    });
};

export {};
