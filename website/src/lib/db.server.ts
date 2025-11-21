import Database from "better-sqlite3";
import { resolve } from "path";

let db: Database.Database | null = null;

/**
 * Get the server-side database connection.
 * Used during build/prerendering.
 */
function getDb(): Database.Database {
  if (!db) {
    const dbPath = resolve("static/compendium.db");
    db = new Database(dbPath, { readonly: true });
  }
  return db;
}

/**
 * Execute a SELECT query and return all rows.
 */
export function query<T = unknown>(
  sql: string,
  params: unknown[] = [],
): T[] {
  const db = getDb();
  const stmt = db.prepare(sql);
  const result = stmt.all(...params);
  return result as T[];
}

/**
 * Execute a SELECT query and return the first row.
 */
export function queryOne<T = unknown>(
  sql: string,
  params: unknown[] = [],
): T | null {
  const rows = query<T>(sql, params);
  return rows[0] || null;
}

/**
 * Execute a SELECT query and return a single value.
 */
export function queryScalar<T = unknown>(
  sql: string,
  params: unknown[] = [],
): T | null {
  const db = getDb();
  const stmt = db.prepare(sql);
  const result = stmt.get(...params) as Record<string, unknown> | undefined;
  if (!result) {
    return null;
  }
  const firstValue = Object.values(result)[0];
  return firstValue as T;
}
