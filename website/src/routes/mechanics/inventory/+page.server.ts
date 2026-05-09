import Database from "better-sqlite3";
import { DB_STATIC_PATH } from "$lib/constants/constants";
import type { ItemSourceType } from "$lib/constants/source-types";
import {
  getItemSourceSummaries,
  getMinimumSourceLevel,
  groupItemSourceSummaries,
} from "$lib/server/item-source-summary";
import type { PageServerLoad } from "./$types";

export const prerender = true;

export interface BackpackSource {
  type: ItemSourceType;
  id: string;
  name: string;
  source_level: number | null;
}

export interface BackpackListItem {
  id: string;
  name: string;
  quality: number;
  backpack_slots: number;
  tooltip_html: string | null;
  min_source_level: number | null;
  sources: BackpackSource[];
}

export interface HouseStorageLocation {
  id: string;
  name: string;
  base_price: number;
  faction_id: string | null;
  faction_required: number;
  zone_id: string | null;
  zone_name: string | null;
}

export interface HouseChestStructure {
  id: string;
  name: string;
  structure_price: number;
  tooltip_html: string | null;
  slot_start: number;
  slot_end: number;
}

interface BackpackRow {
  id: string;
  name: string;
  quality: number;
  backpack_slots: number;
  tooltip_html: string | null;
}

export interface InventoryMechanicsPageData {
  backpacks: BackpackListItem[];
  houses: HouseStorageLocation[];
  houseChests: HouseChestStructure[];
}

// Source: server-scripts/PlayerChest.cs:28-68 — chest object names map to fixed 30-slot account chest sections.
// Source: server-scripts/UIChest.cs:44-82 — UI displays the same fixed chest sections.
const HOUSE_CHEST_SLOT_RANGES = new Map<string, [number, number]>([
  ["wooden_chest", [0, 29]],
  ["red_chest", [30, 59]],
  ["blue_chest", [60, 89]],
  ["stone_chest", [90, 119]],
  ["granite_chest", [120, 149]],
  ["sturdy_chest", [150, 179]],
  ["rustic_chest", [180, 209]],
  ["guardian_box", [210, 239]],
]);

function getBackpackRows(db: Database.Database): BackpackRow[] {
  // Source: mods/DataExporter/Exporters/ItemExporter.cs:120 — BackpackItem assets export as item_type='backpack'
  // Source: mods/DataExporter/Exporters/ItemExporter.cs:268-274 — backpack_slots exports from BackpackItem.numSlots
  // Source: server-scripts/BackpackItem.cs:7 — BackpackItem.numSlots is the in-game storage grant
  return db
    .prepare(
      `
      SELECT id, name, quality, backpack_slots, tooltip_html
      FROM items
      WHERE item_type = 'backpack'
        AND backpack_slots > 0
      ORDER BY backpack_slots ASC, quality ASC, name ASC
    `,
    )
    .all() as BackpackRow[];
}

function getHouseLocations(db: Database.Database): HouseStorageLocation[] {
  return db
    .prepare(
      `
      SELECT
        h.id,
        h.name,
        h.base_price,
        h.faction_id,
        h.faction_required,
        h.zone_id,
        COALESCE(h.zone_name, z.name) as zone_name
      FROM houses h
      LEFT JOIN zones z ON z.id = h.zone_id
      ORDER BY h.base_price ASC, h.name ASC
      `,
    )
    .all() as HouseStorageLocation[];
}

function getHouseChests(db: Database.Database): HouseChestStructure[] {
  const ids = Array.from(HOUSE_CHEST_SLOT_RANGES.keys());
  const placeholders = ids.map(() => "?").join(",");
  const rows = db
    .prepare(
      `
      SELECT id, name, structure_price, tooltip_html
      FROM items
      WHERE item_type = 'structure'
        AND id IN (${placeholders})
      ORDER BY structure_price ASC, name ASC
      `,
    )
    .all(...ids) as Array<{
    id: string;
    name: string;
    structure_price: number;
    tooltip_html: string | null;
  }>;

  return rows.map((row) => {
    const [slot_start, slot_end] = HOUSE_CHEST_SLOT_RANGES.get(row.id)!;
    return { ...row, slot_start, slot_end };
  });
}

function compareOptionalLevels(a: number | null, b: number | null): number {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return a - b;
}

function compareBackpacks(a: BackpackListItem, b: BackpackListItem): number {
  return (
    a.backpack_slots - b.backpack_slots ||
    a.quality - b.quality ||
    compareOptionalLevels(a.min_source_level, b.min_source_level) ||
    a.name.localeCompare(b.name)
  );
}

export const load: PageServerLoad = (): InventoryMechanicsPageData => {
  const db = new Database(DB_STATIC_PATH, { readonly: true });

  try {
    const rows = getBackpackRows(db);
    const sourcesByItemId = groupItemSourceSummaries(
      getItemSourceSummaries(
        db,
        rows.map((row) => row.id),
      ),
    );

    const backpacks = rows
      .map((row) => {
        const sources = sourcesByItemId.get(row.id) ?? [];

        return {
          ...row,
          min_source_level: getMinimumSourceLevel(sources),
          sources,
        };
      })
      .sort(compareBackpacks);

    return {
      backpacks,
      houses: getHouseLocations(db),
      houseChests: getHouseChests(db),
    };
  } finally {
    db.close();
  }
};
