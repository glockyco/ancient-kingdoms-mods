import { browser } from "$app/environment";
import initSqlJs, { type Database, type SqlValue } from "sql.js";

let db: Database | null = null;
let dbPromise: Promise<Database> | null = null;

/**
 * Initialize and return the database.
 * Downloads full DB on first call, then cached in memory.
 */
export async function getDb(): Promise<Database> {
  if (!browser) {
    throw new Error("Database can only be accessed in the browser");
  }

  if (db) return db;
  if (dbPromise) return dbPromise;

  dbPromise = (async () => {
    const [SQL, response] = await Promise.all([
      initSqlJs({
        locateFile: (file) => `https://sql.js.org/dist/${file}`,
      }),
      fetch("/compendium.db"),
    ]);

    const buffer = await response.arrayBuffer();
    db = new SQL.Database(new Uint8Array(buffer));
    return db;
  })();

  return dbPromise;
}

/**
 * Execute a SELECT query and return all rows.
 */
export async function query<T = unknown>(
  sql: string,
  params: SqlValue[] = [],
): Promise<T[]> {
  const database = await getDb();
  const stmt = database.prepare(sql);
  stmt.bind(params);

  const results: T[] = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject() as T);
  }
  stmt.free();
  return results;
}

/**
 * Execute a SELECT query and return the first row.
 */
export async function queryOne<T = unknown>(
  sql: string,
  params: SqlValue[] = [],
): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows[0] || null;
}

/**
 * Execute a SELECT query and return a single value.
 */
export async function queryScalar<T = unknown>(
  sql: string,
  params: SqlValue[] = [],
): Promise<T | null> {
  const row = await queryOne<Record<string, unknown>>(sql, params);
  if (!row) return null;
  return Object.values(row)[0] as T;
}

/**
 * Preload the database (call on map page mount).
 * Returns immediately if already loaded.
 */
export function preloadDb(): void {
  if (browser) {
    getDb().catch(console.error);
  }
}
