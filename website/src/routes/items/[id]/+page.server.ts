import Database from "better-sqlite3";
import { error } from "@sveltejs/kit";
import type { PageServerLoad, EntryGenerator } from "./$types";
import { DB_STATIC_PATH } from "$lib/constants/constants";
import type { ItemDetailPageData } from "$lib/types/items";
import type { Item } from "$lib/queries/items";

export const prerender = true;

// Generate entries for all items at build time
export const entries: EntryGenerator = () => {
  const db = new Database(DB_STATIC_PATH, { readonly: true });
  const items = db.prepare("SELECT id FROM items").all() as Array<{
    id: string;
  }>;
  db.close();

  return items.map((item) => ({ id: item.id }));
};

// Load item data at build time (for SSR/prerendering)
export const load: PageServerLoad = ({ params }): ItemDetailPageData => {
  const db = new Database(DB_STATIC_PATH, { readonly: true });

  const item = db.prepare("SELECT * FROM items WHERE id = ?").get(params.id) as
    | Item
    | undefined;

  if (!item) {
    db.close();
    throw error(404, `Item not found: ${params.id}`);
  }

  // For primal essence, get all essence trader NPCs
  let essenceTraders: Array<{ id: string; name: string }> = [];
  if (params.id === "primal_essence") {
    essenceTraders = db
      .prepare(
        `SELECT id, name FROM npcs WHERE json_extract(roles, '$.is_essence_trader') = 1`,
      )
      .all() as Array<{ id: string; name: string }>;
  }

  // For token of redemption, get all veteran master NPCs
  let veteranMasters: Array<{ id: string; name: string }> = [];
  if (params.id === "token_of_redemption") {
    veteranMasters = db
      .prepare(
        `SELECT id, name FROM npcs WHERE json_extract(roles, '$.is_veteran_master') = 1`,
      )
      .all() as Array<{ id: string; name: string }>;
  }

  // For non-set augments (gems that add stats to equipment), get augmenter NPCs
  let augmenters: Array<{ id: string; name: string }> = [];
  if (item.item_type === "augment" && !item.augment_armor_set_name) {
    augmenters = db
      .prepare(
        `SELECT id, name FROM npcs WHERE json_extract(roles, '$.is_augmenter') = 1`,
      )
      .all() as Array<{ id: string; name: string }>;
  }

  // For cursed/blessed runes, get priestess NPCs who can bless cursed runes
  let priestesses: Array<{ id: string; name: string }> = [];
  if (params.id === "cursed_rune" || params.id === "blessed_rune") {
    priestesses = db
      .prepare(
        `SELECT id, name FROM npcs WHERE json_extract(roles, '$.is_priestess') = 1`,
      )
      .all() as Array<{ id: string; name: string }>;
  }

  // For adventurer's essence, get World Boss Renewal Sage NPCs
  let worldBossRenewalSages: Array<{
    id: string;
    name: string;
    gold_required: number;
  }> = [];
  if (params.id === "adventurers_essence") {
    worldBossRenewalSages = db
      .prepare(
        `SELECT id, name, gold_required_respawn_dungeon as gold_required
         FROM npcs
         WHERE json_extract(roles, '$.is_renewal_sage') = 1
           AND respawn_dungeon_id = 100`,
      )
      .all() as Array<{ id: string; name: string; gold_required: number }>;
  }

  db.close();

  return {
    item,
    essenceTraders,
    veteranMasters,
    augmenters,
    priestesses,
    worldBossRenewalSages,
  };
};
