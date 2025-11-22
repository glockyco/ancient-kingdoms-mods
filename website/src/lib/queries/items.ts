import { query, queryOne } from "$lib/db";

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
  primal_essence_value: number | null;
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
  food_buff_level: number;
  food_buff_id: string | null;
  food_buff_name: string | null;
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
  fragment_result_item_name: string | null;
  // Luck tokens
  luck_token_zone_id: string | null;
  luck_token_zone_name: string | null;
  luck_token_drop_chance: number | null;
  luck_token_bonus: number | null;
  luck_token_fragment_id: string | null;
  luck_token_fragment_name: string | null;
  luck_token_fragments_needed: number | null;
  // Random items
  random_items: string | null; // JSON
  random_items_with_names: string | null; // JSON: [{"item_id": "agate", "item_name": "Agate", "probability": 0.25}, ...]
  // Merge
  merge_items_needed: string | null; // JSON
  merge_result_item_id: string | null;
  merge_result_item_name: string | null;
  // Treasure map
  treasure_map_image_location: string | null;
  treasure_map_reward_id: string | null;
  // Augment
  augment_armor_set_id: string | null;
  augment_armor_set_item_ids: string | null; // JSON
  augment_armor_set_members: string | null; // JSON
  augment_armor_set_name: string | null;
  augment_skill_bonuses: string | null; // JSON
  augment_skill_bonuses_with_names: string | null; // JSON
  augment_attribute_bonuses: string | null; // JSON
  // Pack final
  pack_final_item_id: string | null;
  pack_final_item_name: string | null;
  // Recipe
  recipe_potion_learned_id: string | null;
  recipe_potion_learned_name: string | null;
  alchemy_recipe_level_required: number | null;
  alchemy_recipe_materials: string | null; // JSON
  // Relic buff
  relic_buff_id: string | null;
  relic_buff_name: string | null;
  // Denormalized relationships
  dropped_by: string | null; // JSON
  sold_by: string | null; // JSON
  rewarded_by: string | null; // JSON
  rewarded_by_altars: string | null; // JSON
  required_for_altars: string | null; // JSON
  crafted_from: string | null; // JSON
  gathered_from: string | null; // JSON
  created_from_merge: string | null; // JSON
  found_in_chests: string | null; // JSON
  found_in_packs: string | null; // JSON
  found_in_random_items: string | null; // JSON: [{"random_item_id": "random_gem_1", "random_item_name": "Random Gem 1", "probability": 0.2}, ...]
  used_in_recipes: string | null; // JSON
  needed_for_quests: string | null; // JSON
  used_as_currency_for: string | null; // JSON
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
