import { query } from "$lib/db";

const METADATA_FIELDS = `('max_durability', 'has_serenity', 'is_costume', 'augment_bonus_set')`;

/**
 * Get count of items for each stat key.
 * Optionally filter by a list of item IDs (for faceted counts).
 */
export async function getStatCounts(
  itemIds?: string[],
): Promise<Map<string, number>> {
  let sql: string;
  const params: string[] = [];

  if (itemIds && itemIds.length > 0) {
    // Create placeholders for item IDs
    const placeholders = itemIds.map(() => "?").join(",");
    sql = `
      SELECT je.key as stat, COUNT(DISTINCT i.id) as count
      FROM items i, json_each(i.stats) je
      WHERE i.id IN (${placeholders})
        AND je.key NOT IN ${METADATA_FIELDS}
        AND je.value != 0
        AND je.value != 0.0
        AND je.value != 'false'
      GROUP BY je.key
    `;
    params.push(...itemIds);
  } else {
    sql = `
      SELECT je.key as stat, COUNT(DISTINCT i.id) as count
      FROM items i, json_each(i.stats) je
      WHERE je.key NOT IN ${METADATA_FIELDS}
        AND je.value != 0
        AND je.value != 0.0
        AND je.value != 'false'
      GROUP BY je.key
    `;
  }

  const rows = await query<{ stat: string; count: number }>(sql, params);
  return new Map(rows.map((r) => [r.stat, r.count]));
}

/**
 * Get item IDs that match the given stat filter.
 */
export async function getMatchingItemIds(
  stats: string[],
  mode: "any" | "all",
): Promise<Set<string>> {
  if (stats.length === 0) return new Set();

  const placeholders = stats.map(() => "?").join(",");

  let sql: string;
  if (mode === "any") {
    // Any: item has at least one of the selected stats
    sql = `
      SELECT DISTINCT i.id
      FROM items i, json_each(i.stats) je
      WHERE je.key IN (${placeholders})
        AND je.key NOT IN ${METADATA_FIELDS}
        AND je.value != 0
        AND je.value != 0.0
        AND je.value != 'false'
    `;
  } else {
    // All: item has ALL of the selected stats
    sql = `
      SELECT i.id
      FROM items i, json_each(i.stats) je
      WHERE je.key IN (${placeholders})
        AND je.key NOT IN ${METADATA_FIELDS}
        AND je.value != 0
        AND je.value != 0.0
        AND je.value != 'false'
      GROUP BY i.id
      HAVING COUNT(DISTINCT je.key) = ?
    `;
  }

  const params = mode === "all" ? [...stats, stats.length] : stats;
  const rows = await query<{ id: string }>(sql, params);
  return new Set(rows.map((r) => r.id));
}

/**
 * Get the count of items that would match if we added/removed a stat from the current selection.
 * Returns a map of stat -> new match count.
 */
export async function getStatDeltas(
  selectedStats: string[],
  mode: "any" | "all",
  allStats: readonly string[],
): Promise<Map<string, number>> {
  if (selectedStats.length === 0) return new Map();

  const deltaMap = new Map<string, number>();

  // Get current match count
  const currentMatches = await getMatchingItemIds(selectedStats, mode);
  const currentCount = currentMatches.size;

  // For each stat, compute what the count would be
  for (const stat of allStats) {
    let newCount: number;

    if (selectedStats.includes(stat)) {
      // Simulate removing this stat
      const newSelection = selectedStats.filter((s) => s !== stat);
      if (newSelection.length === 0) {
        // Removing last stat = no filter = all items
        const allItems = await query<{ count: number }>(
          "SELECT COUNT(*) as count FROM items",
        );
        newCount = allItems[0]?.count ?? 0;
      } else {
        const matches = await getMatchingItemIds(newSelection, mode);
        newCount = matches.size;
      }
    } else {
      // Simulate adding this stat
      const newSelection = [...selectedStats, stat];
      const matches = await getMatchingItemIds(newSelection, mode);
      newCount = matches.size;
    }

    deltaMap.set(stat, newCount - currentCount);
  }

  return deltaMap;
}
