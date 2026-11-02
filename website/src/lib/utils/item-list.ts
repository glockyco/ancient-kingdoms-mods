import {
  getCoreRowModel,
  getSortedRowModel,
  type SortingState,
} from "@tanstack/table-core";
import { createSvelteTable } from "$lib/components/ui/data-table/create-table";
import type { ItemListViewClient, ItemZoneInfo } from "$lib/types/items";
import type { Season } from "$lib/data/seasonal-events";

/** Rows per page in the item overview. */
export const ITEMS_PAGE_SIZE = 20;

/** The item overview's default order: highest item level first, then name. */
export const ITEMS_INITIAL_SORTING: SortingState = [
  { id: "item_level", desc: true },
  { id: "name", desc: false },
];

/**
 * The name column's comparator. Without it, TanStack picks one from the rows
 * it holds, and a single page of items can pick another one than the full list.
 */
export const ITEMS_NAME_SORTING_FN = "alphanumeric";

/** The complete overview data, loaded after the requested page is shown. */
export interface ItemListPayload {
  items: ItemListViewClient[];
  itemStatKeys: Record<string, string[]>;
  itemStatValues: Record<string, Record<string, number>>;
  itemClassKeys: Record<string, string[]>;
  itemZones: ItemZoneInfo[];
  /** Sparse entries for items whose every acquisition depends on a season. */
  itemSeasons: Record<string, readonly Season[]>;
}

/**
 * One page of the overview's default order, sorted by the same table the
 * overview uses, so its rows are the ones the full list shows on that page.
 */
export function pageItems(
  payload: ItemListPayload,
  page: number,
): ItemListPayload {
  const table = createSvelteTable({
    data: payload.items,
    columns: [
      { accessorKey: "item_level" },
      { accessorKey: "name", sortingFn: ITEMS_NAME_SORTING_FN },
    ],
    state: { sorting: ITEMS_INITIAL_SORTING },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });
  const items = table
    .getSortedRowModel()
    .rows.slice((page - 1) * ITEMS_PAGE_SIZE, page * ITEMS_PAGE_SIZE)
    .map((row) => row.original);
  const ids = new Set(items.map((item) => item.id));
  const pick = <T>(record: Record<string, T>) =>
    Object.fromEntries(Object.entries(record).filter(([id]) => ids.has(id)));
  return {
    items,
    itemStatKeys: pick(payload.itemStatKeys),
    itemStatValues: pick(payload.itemStatValues),
    itemClassKeys: pick(payload.itemClassKeys),
    itemZones: payload.itemZones.filter((zone) => ids.has(zone.item_id)),
    itemSeasons: pick(payload.itemSeasons),
  };
}
