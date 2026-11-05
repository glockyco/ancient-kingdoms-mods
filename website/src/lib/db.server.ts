import Database from "better-sqlite3";
import { statSync } from "node:fs";
import { resolve } from "node:path";
import { DB_SOURCE_PATH } from "$lib/constants/constants";

let shared: { db: Database.Database; file: string } | null = null;

/**
 * The server's read-only connection to the compendium database, shared by
 * every page a build prerenders.
 *
 * It compiles each SQL text once and hands the same statement to every caller,
 * because every prerendered page runs the same few thousand statements. That
 * is safe while server code only reads statements with `get` and `all` and
 * never switches one to raw or pluck mode or binds it. A rebuilt database file
 * gets a new connection, so the dev server shows the new data without a
 * restart.
 */
export function getDb(): Database.Database {
  const path = resolve(DB_SOURCE_PATH);
  const stat = statSync(path);
  const file = `${stat.ino}:${stat.mtimeMs}:${stat.size}`;
  if (shared?.file !== file) shared = { db: openCached(path), file };
  return shared.db;
}

function openCached(path: string): Database.Database {
  const db = new Database(path, { readonly: true });
  const prepare = db.prepare.bind(db);
  const statements = new Map<string, Database.Statement>();
  db.prepare = ((sql: string) => {
    let statement = statements.get(sql);
    if (!statement) {
      statement = prepare(sql);
      statements.set(sql, statement);
    }
    return statement;
  }) as Database.Database["prepare"];
  return db;
}

/**
 * Execute a SELECT query and return all rows.
 */
export function query<T = unknown>(sql: string, params: unknown[] = []): T[] {
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
