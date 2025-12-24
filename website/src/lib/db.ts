import { browser } from "$app/environment";

// Type for the database worker from sql.js-httpvfs (no official types available)
interface DbWorker {
  db: {
    query: (sql: string, params: unknown[]) => Promise<unknown[]>;
  };
}

let dbWorker: DbWorker | null = null;

/**
 * Initialize and return the database worker.
 * This function is called once and cached.
 * Only works in browser environment.
 */
export async function getDb() {
  if (!browser) {
    throw new Error("Database can only be accessed in the browser");
  }

  if (dbWorker) {
    return dbWorker;
  }

  // Dynamic import to avoid loading in SSR
  const sqlJsHttpvfs = await import("sql.js-httpvfs");
  const { createDbWorker } = sqlJsHttpvfs.default || sqlJsHttpvfs;

  const workerUrl = new URL(
    "sql.js-httpvfs/dist/sqlite.worker.js",
    import.meta.url,
  );

  const wasmUrl = new URL("sql.js-httpvfs/dist/sql-wasm.wasm", import.meta.url);

  // Type assertion at I/O boundary - sql.js-httpvfs has no official types
  dbWorker = (await createDbWorker(
    [
      {
        from: "inline",
        config: {
          serverMode: "full",
          url: "/compendium.db",
          requestChunkSize: 65536,
        },
      },
    ],
    workerUrl.toString(),
    wasmUrl.toString(),
  )) as DbWorker;

  return dbWorker;
}

/**
 * Execute a SELECT query and return all rows.
 */
export async function query<T = unknown>(
  sql: string,
  params: unknown[] = [],
): Promise<T[]> {
  const db = await getDb();
  const result = await db.db.query(sql, params);
  return result as T[];
}

/**
 * Execute a SELECT query and return the first row.
 */
export async function queryOne<T = unknown>(
  sql: string,
  params: unknown[] = [],
): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows[0] || null;
}

/**
 * Execute a SELECT query and return a single value.
 */
export async function queryScalar<T = unknown>(
  sql: string,
  params: unknown[] = [],
): Promise<T | null> {
  const db = await getDb();
  const result = await db.db.query(sql, params);
  if (result.length === 0) {
    return null;
  }
  const firstRow = result[0] as Record<string, unknown>;
  const firstValue = Object.values(firstRow)[0];
  return firstValue as T;
}
