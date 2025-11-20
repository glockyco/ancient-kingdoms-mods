import { query, queryOne, queryScalar } from "$lib/db";

export interface Item {
  id: string;
  name: string;
  item_type: string;
  quality: number;
  level_required: number;
  class_required: string; // JSON array
  faction_required_to_buy: number;
  adventuring_level_needed: number;
  is_key: boolean;
  ignore_journal: boolean;
  is_chest_key: boolean;
  has_gather_quest: boolean;
  max_stack: number;
  buy_price: number;
  sell_price: number;
  buy_token_id: string | null;
  sellable: boolean;
  tradable: boolean;
  destroyable: boolean;
  is_quest_item: boolean;
  infinite_charges: boolean;
  cooldown: number;
  cooldown_category: string | null;
  icon_path: string;
  tooltip: string;
  slot: string | null;
  weapon_category: string | null;
  stats: string | null; // JSON
  // Usage effects
  usage_health: number;
  usage_mana: number;
  usage_energy: number;
  usage_experience: number;
  usage_pet_health: number;
  // Buffs
  potion_buff_level: number;
  potion_buff_id: string | null;
  food_buff_level: number;
  food_buff_id: string | null;
  food_type: string | null;
  // Book stat gains
  book_strength_gain: number;
  book_dexterity_gain: number;
  book_constitution_gain: number;
  book_intelligence_gain: number;
  book_wisdom_gain: number;
  book_charisma_gain: number;
  book_text: string | null;
  // Scroll
  scroll_skill_id: string | null;
  // Equipment
  is_repair_kit: boolean;
  // Mount
  mount_speed: number;
  // Backpack
  backpack_slots: number;
  // Travel
  travel_zone_id: number;
  travel_destination: string | null; // JSON
  travel_destination_name: string | null;
  // Pack
  pack_final_amount: number;
  // Chest
  chest_rewards: string | null; // JSON
  chest_num_items: number;
  // Relic
  relic_buff_level: number;
  // Structure
  structure_price: number;
  structure_available_rotations: string | null; // JSON
  // Weapon
  weapon_proc_effect_probability: number;
  weapon_proc_effect_id: string | null;
  weapon_delay: number;
  weapon_required_ammo_id: string | null;
  // Fragment
  fragment_amount_needed: number;
  fragment_result_item_id: string | null;
  // Random items
  random_items: string | null; // JSON
  // Merge
  merge_items_needed_ids: string | null; // JSON
  merge_result_item_id: string | null;
  // Treasure map
  treasure_map_image_location: string | null;
  treasure_map_reward_id: string | null;
  // Augment
  augment_armor_set_item_ids: string | null; // JSON
  augment_armor_set_name: string | null;
  augment_skill_bonuses: string | null; // JSON
  // Pack final
  pack_final_item_id: string | null;
  // Recipe
  recipe_potion_learned_id: string | null;
  // Relic buff
  relic_buff_id: string | null;
  // Denormalized relationships
  dropped_by: string | null; // JSON
  sold_by: string | null; // JSON
  rewarded_by: string | null; // JSON
  crafted_from: string | null; // JSON
  gathered_from: string | null; // JSON
  used_in_recipes: string | null; // JSON
  needed_for_quests: string | null; // JSON
}

export interface ItemFilters {
  search?: string;
  quality?: number[];
  itemType?: string[];
  minLevel?: number;
  maxLevel?: number;
  limit?: number;
  offset?: number;
}

/**
 * Get all items with optional filtering and pagination.
 */
export async function getItems(filters: ItemFilters = {}): Promise<Item[]> {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (filters.search) {
    conditions.push("id IN (SELECT id FROM items_fts WHERE items_fts MATCH ?)");
    params.push(filters.search);
  }

  if (filters.quality && filters.quality.length > 0) {
    const placeholders = filters.quality.map(() => "?").join(", ");
    conditions.push(`quality IN (${placeholders})`);
    params.push(...filters.quality);
  }

  if (filters.itemType && filters.itemType.length > 0) {
    const placeholders = filters.itemType.map(() => "?").join(", ");
    conditions.push(`item_type IN (${placeholders})`);
    params.push(...filters.itemType);
  }

  if (filters.minLevel !== undefined) {
    conditions.push("level_required >= ?");
    params.push(filters.minLevel);
  }

  if (filters.maxLevel !== undefined) {
    conditions.push("level_required <= ?");
    params.push(filters.maxLevel);
  }

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const limit = filters.limit || 100;
  const offset = filters.offset || 0;

  const sql = `
    SELECT * FROM items
    ${whereClause}
    ORDER BY name
    LIMIT ? OFFSET ?
  `;

  params.push(limit, offset);

  return query<Item>(sql, params);
}

/**
 * Get a single item by ID.
 */
export async function getItemById(id: string): Promise<Item | null> {
  return queryOne<Item>("SELECT * FROM items WHERE id = ?", [id]);
}

/**
 * Get total count of items matching filters.
 */
export async function getItemCount(filters: ItemFilters = {}): Promise<number> {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (filters.search) {
    conditions.push("id IN (SELECT id FROM items_fts WHERE items_fts MATCH ?)");
    params.push(filters.search);
  }

  if (filters.quality && filters.quality.length > 0) {
    const placeholders = filters.quality.map(() => "?").join(", ");
    conditions.push(`quality IN (${placeholders})`);
    params.push(...filters.quality);
  }

  if (filters.itemType && filters.itemType.length > 0) {
    const placeholders = filters.itemType.map(() => "?").join(", ");
    conditions.push(`item_type IN (${placeholders})`);
    params.push(...filters.itemType);
  }

  if (filters.minLevel !== undefined) {
    conditions.push("level_required >= ?");
    params.push(filters.minLevel);
  }

  if (filters.maxLevel !== undefined) {
    conditions.push("level_required <= ?");
    params.push(filters.maxLevel);
  }

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const sql = `SELECT COUNT(*) as count FROM items ${whereClause}`;

  return (await queryScalar<number>(sql, params)) || 0;
}

/**
 * Get all available item types.
 */
export async function getItemTypes(): Promise<string[]> {
  const results = await query<{ item_type: string }>(
    "SELECT DISTINCT item_type FROM items WHERE item_type IS NOT NULL AND item_type != '' ORDER BY item_type",
  );
  return results.map((r) => r.item_type);
}

/**
 * Get quality level counts, optionally filtered by item type.
 * Always returns all quality levels (0-4), with count=0 for qualities that don't match the type filter.
 */
export async function getQualityCounts(itemType?: string[]): Promise<Array<{ quality: number; count: number }>> {
  let sql: string;
  const params: unknown[] = [];

  if (itemType && itemType.length > 0) {
    // With type filter: show all qualities, but count only matching items
    const placeholders = itemType.map(() => "?").join(", ");
    sql = `
      WITH all_qualities AS (
        SELECT 0 as quality UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4
      )
      SELECT
        all_qualities.quality as quality,
        COUNT(filtered_items.id) as count
      FROM all_qualities
      LEFT JOIN (
        SELECT id, quality
        FROM items
        WHERE item_type IN (${placeholders})
      ) filtered_items ON all_qualities.quality = filtered_items.quality
      GROUP BY all_qualities.quality
      ORDER BY all_qualities.quality
    `;
    params.push(...itemType);
  } else {
    // No type filter: show all qualities with their total counts
    sql = `
      SELECT quality, COUNT(*) as count
      FROM items
      GROUP BY quality
      ORDER BY quality
    `;
  }

  const results = await query<{ quality: number; count: number }>(sql, params);
  return results;
}

/**
 * Get all available item types with counts, optionally filtered by quality.
 * Always returns all item types, with count=0 for types that don't match the quality filter.
 */
export async function getItemTypesWithCounts(quality?: number[]): Promise<Array<{ type: string; count: number }>> {
  let sql: string;
  const params: unknown[] = [];

  if (quality && quality.length > 0) {
    // With quality filter: show all types, but count only matching items
    const placeholders = quality.map(() => "?").join(", ");
    sql = `
      WITH all_types AS (
        SELECT DISTINCT item_type
        FROM items
        WHERE item_type IS NOT NULL AND item_type != ''
      )
      SELECT
        all_types.item_type as item_type,
        COUNT(filtered_items.id) as count
      FROM all_types
      LEFT JOIN (
        SELECT id, item_type
        FROM items
        WHERE quality IN (${placeholders})
      ) filtered_items ON all_types.item_type = filtered_items.item_type
      GROUP BY all_types.item_type
      ORDER BY all_types.item_type
    `;
    params.push(...quality);
  } else {
    // No quality filter: show all types with their total counts
    sql = `
      SELECT item_type, COUNT(*) as count
      FROM items
      WHERE item_type IS NOT NULL AND item_type != ''
      GROUP BY item_type
      ORDER BY item_type
    `;
  }

  const results = await query<{ item_type: string; count: number }>(sql, params);
  return results.map((r) => ({ type: r.item_type, count: r.count }));
}
