import initSqlJs, { type Database, type SqlValue } from "sql.js-fts5";
import sqlWasmUrl from "sql.js-fts5/dist/sql-wasm.wasm?url";
export type DatabaseTarget = "compendium" | "search";

/**
 * Content-hashed asset URLs, supplied by the main thread. The worker cannot
 * import them itself without emitting a second copy of each database under a
 * different hashed name (see src/lib/database-assets.ts).
 */
let databaseUrls: Record<DatabaseTarget, string> | null = null;

/** First two bytes of a gzip member (RFC 1952). */
const GZIP_MAGIC = [0x1f, 0x8b];

/**
 * Inflate the response unless the transport already did it.
 *
 * A host that maps the `.gz` extension to `Content-Encoding: gzip` makes the
 * browser inflate the body before we see it. Sniffing the magic bytes keeps
 * one code path correct on every host, in dev and in production alike.
 */
async function databaseBytes(response: Response): Promise<Uint8Array> {
  const body = await response.arrayBuffer();
  const head = new Uint8Array(body, 0, Math.min(2, body.byteLength));
  if (head[0] !== GZIP_MAGIC[0] || head[1] !== GZIP_MAGIC[1]) {
    return new Uint8Array(body);
  }
  const inflated = new Response(body).body!.pipeThrough(
    new DecompressionStream("gzip"),
  );
  return new Uint8Array(await new Response(inflated).arrayBuffer());
}

interface ConfigureMessage {
  kind: "configure";
  urls: Record<DatabaseTarget, string>;
}

interface QueryRequest {
  kind: "query";
  id: number;
  target: DatabaseTarget;
  sql: string;
  params: SqlValue[];
}

type WorkerMessage = ConfigureMessage | QueryRequest;

interface QueryResponse {
  id: number;
  rows?: unknown[];
  error?: string;
}

interface SqlRuntime {
  Database: new (data: Uint8Array) => Database;
}

let sqlPromise: Promise<SqlRuntime> | null = null;
let compendium: Database | null = null;
let search: Database | null = null;
let compendiumPromise: Promise<Database> | null = null;
let searchPromise: Promise<Database> | null = null;

async function loadDatabase(target: DatabaseTarget): Promise<Database> {
  if (!sqlPromise) {
    sqlPromise = initSqlJs({ locateFile: () => sqlWasmUrl });
  }
  const SQL = await sqlPromise;
  if (!databaseUrls) {
    throw new Error("Database worker was queried before it was configured");
  }
  const response = await fetch(databaseUrls[target]);
  if (!response.ok) {
    throw new Error(`Unable to load ${target} database (${response.status})`);
  }
  const database = new SQL.Database(await databaseBytes(response));
  if (target === "compendium") compendium = database;
  else search = database;
  return database;
}

function openDatabase(target: DatabaseTarget): Promise<Database> {
  if (target === "compendium") {
    if (compendium) return Promise.resolve(compendium);
    compendiumPromise ??= loadDatabase(target);
    return compendiumPromise;
  }
  if (search) return Promise.resolve(search);
  searchPromise ??= loadDatabase(target);
  return searchPromise;
}

async function execute(request: QueryRequest): Promise<unknown[]> {
  const database = await openDatabase(request.target);
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
    databaseUrls = event.data.urls;
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
