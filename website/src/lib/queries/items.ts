import { query, queryOne } from "$lib/db";

export interface Item {
  id: string;
  name: string;
  item_type: string;
  quality: number;
  level_required: number;
  class_required: string; // JSON array
  faction_required_to_buy: number;
  faction_required_tier_name: string | null;
  adventuring_level_needed: number;
  is_key: boolean;
  ignore_journal: boolean;
  is_chest_key: boolean;
  has_gather_quest: boolean;
  max_stack: number;
  buy_price: number;
  sell_price: number;
  primal_essence_value: number | null;
  buy_token_id: string | null;
  sellable: boolean;
  tradable: boolean;
  destroyable: boolean;
  is_quest_item: boolean;
  is_bestiary_drop: boolean;
  infinite_charges: boolean;
  cooldown: number;
  cooldown_category: string | null;
  icon_path: string;
  tooltip: string;
  tooltip_html: string;
  slot: string | null;
  weapon_category: string | null;
  stats: string | null; // JSON
  item_level: number;
  // Usage effects
  usage_health: number;
  usage_mana: number;
  usage_energy: number;
  usage_experience: number;
  usage_pet_health: number;
  // Buffs
  potion_buff_level: number;
  potion_buff_id: string | null;
  potion_buff_name: string | null;
  food_buff_level: number;
  food_buff_id: string | null;
  food_buff_name: string | null;
  food_type: string | null;
  potion_buff_allow_dungeon: boolean;
  food_buff_allow_dungeon: boolean;
  scroll_skill_allow_dungeon: boolean;
  relic_buff_allow_dungeon: boolean;
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
  scroll_skill_name: string | null;
  // Equipment
  is_repair_kit: boolean;
  // Mount
  mount_speed: number;
  // Backpack
  backpack_slots: number;
  // Travel
  travel_zone_id: number;
  travel_destination_x: number | null;
  travel_destination_y: number | null;
  travel_destination_z: number | null;
  travel_destination_name: string | null;
  // Chest-type items (random containers like "Random Gem 1")
  chest_rewards: string | null; // JSON
  chest_num_items: number;
  // Relic
  relic_buff_level: number;
  // Structure
  structure_price: number;
  // Weapon
  weapon_proc_effect_probability: number;
  weapon_proc_effect_id: string | null;
  weapon_proc_effect_name: string | null;
  weapon_delay: number;
  weapon_required_ammo_id: string | null;
  // Fragment
  fragment_amount_needed: number;
  fragment_result_item_id: string | null;
  fragment_result_item_name: string | null;
  // Luck tokens
  luck_token_zone_id: string | null;
  luck_token_zone_name: string | null;
  luck_token_drop_chance: number | null;
  luck_token_bonus: number | null;
  luck_token_fragment_id: string | null;
  luck_token_fragment_name: string | null;
  luck_token_fragments_needed: number | null;
  // Treasure map (only image_location remains on item; other data in treasure_locations table)
  treasure_map_image_location: string | null;
  // Augment
  augment_armor_set_id: string | null;
  augment_armor_set_item_ids: string | null; // JSON
  augment_armor_set_members: string | null; // JSON
  augment_armor_set_name: string | null;
  augment_skill_bonuses: string | null; // JSON
  augment_skill_bonuses_with_names: string | null; // JSON
  augment_attribute_bonuses: string | null; // JSON
  // Alchemy recipe (for recipe items)
  recipe_potion_learned_id: string | null;
  recipe_potion_learned_name: string | null;
  alchemy_recipe_level_required: number | null;
  alchemy_recipe_materials: string | null; // JSON
  // Alchemy recipe (for potion items)
  taught_by_recipe_id: string | null;
  taught_by_recipe_name: string | null;
  alchemy_exp: number;
  // Relic buff
  relic_buff_id: string | null;
  relic_buff_name: string | null;
}

/**
 * Get all items.
 */
export async function getItems(): Promise<Item[]> {
  return query<Item>("SELECT * FROM items ORDER BY name");
}

/**
 * Get a single item by ID.
 */
export async function getItemById(id: string): Promise<Item | null> {
  return queryOne<Item>("SELECT * FROM items WHERE id = ?", [id]);
}

/**
 * Get tooltip HTML for a batch of item IDs.
 * Returns a Map of item ID to tooltip HTML.
 */
export async function getItemTooltips(
  ids: string[],
): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map();

  // Use json_each to safely pass array as a single JSON parameter
  const rows = await query<{ id: string; tooltip_html: string | null }>(
    `SELECT id, tooltip_html 
     FROM items 
     WHERE id IN (SELECT value FROM json_each(?))`,
    [JSON.stringify(ids)],
  );

  const result = new Map<string, string>();
  for (const row of rows) {
    if (row.tooltip_html) {
      result.set(row.id, row.tooltip_html);
    }
  }
  return result;
}
