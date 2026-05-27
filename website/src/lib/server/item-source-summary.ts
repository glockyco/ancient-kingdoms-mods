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
  const rows = db
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

  const virtualRows = db
    .prepare(
      `
      SELECT
        f.item_id,
        'fishing' as type,
        'fishing' as id,
        'Fishing' as name,
        NULL as source_level
      FROM fish f
      WHERE f.item_id IN (${placeholders})
        AND f.is_trash = 1
        AND NOT EXISTS (
          SELECT 1
          FROM item_source_entries ise
          WHERE ise.item_id = f.item_id
            AND ise.source_type = 'gather'
        )

      UNION ALL

      SELECT
        i.id as item_id,
        'starter' as type,
        i.id as id,
        'New character' as name,
        NULL as source_level
      FROM items i
      WHERE i.id IN (${placeholders})
        AND i.comments LIKE 'Starter backpack%'
        AND NOT EXISTS (
          SELECT 1
          FROM item_source_entries ise
          WHERE ise.item_id = i.id
        )
      ORDER BY item_id ASC, name ASC
      `,
    )
    .all(...itemIds, ...itemIds) as ItemSourceSummary[];

  return [...rows, ...virtualRows];
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
