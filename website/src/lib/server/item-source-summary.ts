import type Database from "better-sqlite3";
import type { ItemSourceType } from "$lib/constants/source-types";

export interface ItemSourceSummary {
  item_id: string;
  type: ItemSourceType;
  id: string;
  name: string;
  source_level: number | null;
}

export function getItemSourceSummaries(
  db: Database.Database,
  itemIds: string[],
): ItemSourceSummary[] {
  if (itemIds.length === 0) return [];

  const placeholders = itemIds.map(() => "?").join(",");
  return db
    .prepare(
      `
      SELECT
        item_id,
        source_type as type,
        source_id as id,
        source_name as name,
        source_level
      FROM item_source_entries
      WHERE item_id IN (${placeholders})
      ORDER BY
        item_id ASC,
        source_level IS NULL ASC,
        source_level ASC,
        source_sort_name ASC
      `,
    )
    .all(...itemIds) as ItemSourceSummary[];
}

export function groupItemSourceSummaries(
  rows: ItemSourceSummary[],
): Map<string, ItemSourceSummary[]> {
  const grouped = new Map<string, ItemSourceSummary[]>();
  for (const row of rows) {
    const existing = grouped.get(row.item_id);
    if (existing) existing.push(row);
    else grouped.set(row.item_id, [row]);
  }
  return grouped;
}

export function getMinimumSourceLevel(
  sources: Pick<ItemSourceSummary, "source_level">[],
): number | null {
  const levels = sources
    .map((source) => source.source_level)
    .filter((level): level is number => level !== null);
  return levels.length > 0 ? Math.min(...levels) : null;
}
