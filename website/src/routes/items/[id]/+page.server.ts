import Database from "better-sqlite3";
import { error } from "@sveltejs/kit";
import type { PageServerLoad, EntryGenerator } from "./$types";
import { DB_STATIC_PATH } from "$lib/constants/constants";
import type { ItemDetailPageData } from "$lib/types/items";
import type { Item } from "$lib/queries/items";
import { itemDescription } from "$lib/server/meta-description";
import { getItemSources } from "$lib/server/item-sources";
import { getItemUsages } from "$lib/server/item-usages";

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

  // Load item sources and usages from normalized junction tables
  const sources = getItemSources(db, params.id);
  const usages = getItemUsages(db, params.id);

  // Load recipe materials for recipes that create this item
  // Materials JSON is pre-enriched with item_name by the build pipeline
  const recipeMaterials: Record<
    string,
    Array<{ item_id: string; item_name: string; amount: number }>
  > = {};

  for (const recipe of sources.recipes) {
    const recipeTable =
      recipe.recipe_type === "crafting"
        ? "crafting_recipes"
        : "alchemy_recipes";
    const recipeData = db
      .prepare(
        `
      SELECT materials
      FROM ${recipeTable}
      WHERE id = ?
    `,
      )
      .get(recipe.recipe_id) as { materials: string } | undefined;

    if (recipeData?.materials) {
      recipeMaterials[recipe.recipe_id] = JSON.parse(
        recipeData.materials,
      ) as Array<{ item_id: string; item_name: string; amount: number }>;
    }
  }

  // Load random item outcomes (what this item produces if it's a random container)
  const randomOutcomes = db
    .prepare(
      `
      SELECT
        isr.item_id,
        i.name as item_name,
        i.quality,
        isr.probability
      FROM item_sources_random isr
      JOIN items i ON isr.item_id = i.id
      WHERE isr.random_item_id = ?
      ORDER BY i.name ASC
    `,
    )
    .all(params.id) as Array<{
    item_id: string;
    item_name: string;
    quality: number;
    probability: number;
  }>;

  // Load treasure location for treasure map items
  let treasureLocation: {
    location_id: string;
    zone_id: string;
    zone_name: string;
    reward_id: string | null;
    reward_name: string | null;
    position_x: number;
    position_y: number;
  } | null = null;

  if (item.item_type === "treasure_map") {
    treasureLocation =
      (db
        .prepare(
          `
        SELECT
          tl.id as location_id,
          tl.zone_id,
          z.name as zone_name,
          tl.reward_id,
          reward.name as reward_name,
          tl.position_x,
          tl.position_y
        FROM treasure_locations tl
        JOIN zones z ON z.id = tl.zone_id
        LEFT JOIN items reward ON reward.id = tl.reward_id
        WHERE tl.required_map_id = ?
      `,
        )
        .get(params.id) as typeof treasureLocation) || null;
  }

  // Load pack contents (what items this pack contains)
  const packContents = db
    .prepare(
      `
      SELECT
        isp.item_id,
        i.name as item_name,
        i.quality,
        isp.amount
      FROM item_sources_pack isp
      JOIN items i ON isp.item_id = i.id
      WHERE isp.pack_item_id = ?
      ORDER BY i.name ASC
    `,
    )
    .all(params.id) as Array<{
    item_id: string;
    item_name: string;
    quality: number;
    amount: number;
  }>;

  db.close();

  const description = itemDescription({
    name: item.name,
    quality: item.quality,
    slot: item.slot,
    item_type: item.item_type,
    level_required: item.level_required,
  });

  return {
    item,
    description,
    sources,
    usages,
    recipeMaterials,
    randomOutcomes,
    packContents,
    treasureLocation,
    essenceTraders,
    veteranMasters,
    augmenters,
    priestesses,
    worldBossRenewalSages,
  };
};
