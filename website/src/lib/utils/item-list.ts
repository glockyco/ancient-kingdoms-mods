import type { ItemListViewClient, ItemZoneInfo } from "$lib/types/items";

/** Rows per page in the item overview. */
export const ITEMS_PAGE_SIZE = 20;

/** The complete overview data, loaded after the first page is shown. */
export interface ItemListPayload {
  items: ItemListViewClient[];
  itemStatKeys: Record<string, string[]>;
  itemStatValues: Record<string, Record<string, number>>;
  itemClassKeys: Record<string, string[]>;
  itemZones: ItemZoneInfo[];
}

/**
 * The rows the default sort (item level, highest first) can place on the first
 * page. Every row tied with the last first-page level is included, so the
 * table's own name ordering picks the same first page as the complete list.
 */
export function firstPageCandidates(payload: ItemListPayload): ItemListPayload {
  const byLevel = [...payload.items].sort(
    (a, b) => b.item_level - a.item_level,
  );
  const boundary = byLevel[Math.min(ITEMS_PAGE_SIZE, byLevel.length) - 1];
  const items = boundary
    ? byLevel.filter((item) => item.item_level >= boundary.item_level)
    : [];
  const ids = new Set(items.map((item) => item.id));
  const pick = <T>(record: Record<string, T>) =>
    Object.fromEntries(Object.entries(record).filter(([id]) => ids.has(id)));
  return {
    items,
    itemStatKeys: pick(payload.itemStatKeys),
    itemStatValues: pick(payload.itemStatValues),
    itemClassKeys: pick(payload.itemClassKeys),
    itemZones: payload.itemZones.filter((zone) => ids.has(zone.item_id)),
  };
}
