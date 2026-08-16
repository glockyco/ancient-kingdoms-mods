import { browser } from "$app/environment";
import type { SqlValue } from "sql.js-fts5";
import type { DatabaseTarget } from "./db.worker";
import { DATABASE_URLS } from "./database-assets";

interface QueryResponse<T = unknown> {
  id: number;
  rows?: T[];
  error?: string;
}

interface PendingQuery<T> {
  resolve: (rows: T[]) => void;
  reject: (error: Error) => void;
}

let worker: Worker | null = null;
let nextRequestId = 1;
const pending = new Map<number, PendingQuery<unknown>>();

function workerClient(): Worker {
  if (!browser) throw new Error("Database can only be accessed in the browser");
  if (worker) return worker;
  worker = new Worker(new URL("./db.worker.ts", import.meta.url), {
    type: "module",
  });
  // The worker cannot resolve the hashed database URLs itself; see
  // src/lib/database-assets.ts. This message is queued before any query.
  worker.postMessage({ kind: "configure", urls: DATABASE_URLS });
  worker.onmessage = (event: MessageEvent<QueryResponse>) => {
    const response = event.data;
    const request = pending.get(response.id);
    if (!request) return;
    pending.delete(response.id);
    if (response.error) request.reject(new Error(response.error));
    else request.resolve(response.rows ?? []);
  };
  worker.onerror = (event) => {
    const error = new Error(event.message || "Database worker failed");
    for (const request of pending.values()) request.reject(error);
    pending.clear();
  };
  return worker;
}

export function query<T = unknown>(
  sql: string,
  params: SqlValue[] = [],
  target: DatabaseTarget = "compendium",
): Promise<T[]> {
  const client = workerClient();
  const id = nextRequestId++;
  return new Promise<T[]>((resolve, reject) => {
    pending.set(id, {
      resolve: resolve as (rows: unknown[]) => void,
      reject: reject as (error: Error) => void,
    });
    client.postMessage({ kind: "query", id, target, sql, params });
  });
}

export function querySearch<T = unknown>(
  sql: string,
  params: SqlValue[] = [],
): Promise<T[]> {
  return query<T>(sql, params, "search");
}

export async function queryOne<T = unknown>(
  sql: string,
  params: SqlValue[] = [],
  target: DatabaseTarget = "compendium",
): Promise<T | null> {
  const rows = await query<T>(sql, params, target);
  return rows[0] ?? null;
}

export async function queryScalar<T = unknown>(
  sql: string,
  params: SqlValue[] = [],
  target: DatabaseTarget = "compendium",
): Promise<T | null> {
  const row = await queryOne<Record<string, unknown>>(sql, params, target);
  return row ? (Object.values(row)[0] as T) : null;
}

/** Start the shared worker and load one database without blocking the caller. */
export function preloadDb(target: DatabaseTarget = "compendium"): void {
  if (!browser) return;
  query("SELECT 1", [], target).catch(() => {
    // A missing optional artifact (for example before prebuild) is surfaced by
    // the query that requested it; preload must remain best-effort.
  });
}
