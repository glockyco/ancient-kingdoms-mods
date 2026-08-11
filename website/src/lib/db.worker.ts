import initSqlJs, { type Database, type SqlValue } from "sql.js-fts5";
import sqlWasmUrl from "sql.js-fts5/dist/sql-wasm.wasm?url";

export type DatabaseTarget = "compendium" | "search";

interface QueryRequest {
  id: number;
  target: DatabaseTarget;
  sql: string;
  params: SqlValue[];
}

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
  const response = await fetch(`/${target}.db`);
  if (!response.ok) {
    throw new Error(`Unable to load /${target}.db (${response.status})`);
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  const database = new SQL.Database(bytes);
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

self.onmessage = (event: MessageEvent<QueryRequest>) => {
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
