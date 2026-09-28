import type Database from "better-sqlite3";

export function getItemIconPaths(
  db: Database.Database,
  ids: Iterable<string>,
): Record<string, string | null> {
  const uniqueIds = [...new Set(ids)];
  if (uniqueIds.length === 0) return {};

  const rows = db
    .prepare(
      `SELECT i.id, va.public_path
       FROM items i
       LEFT JOIN visual_assets va
         ON va.domain = 'item' AND va.entity_id = i.id AND va.kind = 'icon'
       WHERE i.id IN (SELECT value FROM json_each(?))`,
    )
    .all(JSON.stringify(uniqueIds)) as Array<{
    id: string;
    public_path: string | null;
  }>;
  if (rows.length !== uniqueIds.length) {
    const foundIds = new Set(rows.map((row) => row.id));
    throw new Error(
      `Missing items for icon availability: ${uniqueIds.filter((id) => !foundIds.has(id)).join(", ")}`,
    );
  }
  return Object.fromEntries(rows.map((row) => [row.id, row.public_path]));
}
