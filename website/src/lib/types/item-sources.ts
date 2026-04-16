/**
 * Item source and usage type definitions
 *
 * These types match the database schema for item obtainability and usage.
 * They represent normalized data from junction tables, replacing the old
 * JSON-based denormalized fields.
 */

// ============================================================================
// SOURCE TYPE UNIONS
// ============================================================================

/**
 * All possible item source types (matches schema CHECK constraint)
 */
export type ItemSourceType =
  | "monster"
  | "vendor"
  | "quest"
  | "altar"
  | "recipe"
  | "gather"
  | "chest"
  | "pack"
  | "random"
  | "merge"
  | "treasure_map";

/**
 * Source types that have zone associations
 */
export type ZoneSourceType = Extract<
  ItemSourceType,
  | "monster"
  | "vendor"
  | "altar"
  | "gather"
  | "chest"
  | "treasure_map"
  | "recipe"
>;

/**
 * All possible item usage types (matches schema CHECK constraint)
 */
export type ItemUsageType =
  | "recipe"
  | "quest"
  | "currency"
  | "altar"
  | "portal"
  | "chest";

/**
 * Usage types that have zone associations
 */
export type ZoneUsageType = ItemUsageType;

// ============================================================================
// ITEM SOURCE RECORD INTERFACES
// ============================================================================

/**
 * Item dropped by monster
 */
export interface MonsterSource {
  item_id: string;
  monster_id: string;
  monster_name: string;
  monster_level: number;
  monster_level_min: number;
  monster_level_max: number;
  is_boss: boolean;
  is_fabled: boolean;
  is_elite: boolean;
  drop_rate: number;
}

/**
 * Item sold by NPC vendor
 */
export interface VendorSource {
  item_id: string;
  npc_id: string;
  npc_name: string;
  npc_faction: string | null;
  is_faction_vendor: boolean;
  price: number;
  currency_item_id: string | null;
  currency_item_name: string | null;
  required_faction: string | null;
  required_reputation_tier: number | null;
}

/**
 * Item obtained from quest (reward or provided on start)
 */
export interface QuestSource {
  item_id: string;
  quest_id: string;
  quest_name: string;
  quest_level_required: number;
  quest_level_recommended: number;
  source_type: "reward" | "provided";
  class_restriction: string | null; // JSON array of class names
  is_repeatable: boolean;
}

/**
 * Item rewarded by altar event
 */
export interface AltarSource {
  item_id: string;
  altar_id: string;
  altar_name: string;
  altar_type: string;
  zone_id: string;
  zone_name: string;
  reward_tier: "common" | "magic" | "epic" | "legendary";
  drop_rate: number;
  min_effective_level: number;
  final_wave_boss_id: string | null;
  final_wave_boss_name: string | null;
}

/**
 * Item created from recipe (crafting or alchemy)
 */
export interface RecipeSource {
  item_id: string;
  recipe_id: string;
  recipe_type: "crafting" | "alchemy" | "scribing";
  result_amount: number;
  tier: number;
  station_type: string | null;
}

/**
 * Item gathered from resource or found in chest
 */
export interface GatherSource {
  item_id: string;
  resource_id: string;
  resource_name: string;
  drop_rate: number;
  actual_drop_chance: number;
  is_guaranteed: boolean;
  is_radiant_spark: boolean;
  amount_min: number | null;
  amount_max: number | null;
}

/**
 * Item found in chest
 */
export interface ChestSource {
  item_id: string;
  chest_id: string;
  chest_name: string;
  drop_rate: number;
  actual_drop_chance: number;
  zone_id: string;
  zone_name: string;
  key_required_id: string | null;
  key_name: string | null;
  position_x: number;
  position_y: number;
}

/**
 * Item found in pack (container item)
 */
export interface PackSource {
  item_id: string;
  pack_item_id: string;
  pack_item_name: string;
  pack_quality: number;
  amount: number;
}

/**
 * Item found in random item container
 */
export interface RandomSource {
  item_id: string;
  random_item_id: string;
  random_item_name: string;
  random_quality: number;
  probability: number;
}

/**
 * Item created from merge recipe
 */
export interface MergeSource {
  item_id: string;
  component_item_ids: string[]; // Array of all component IDs
  component_item_names: string[]; // Parallel array of names
}

/**
 * Item obtained from treasure map location
 */
export interface TreasureMapSource {
  item_id: string;
  map_item_id: string;
  map_item_name: string;
  treasure_location_id: string;
  zone_id: string;
  zone_name: string;
  position_x: number;
  position_y: number;
}

// ============================================================================
// ITEM USAGE RECORD INTERFACES
// ============================================================================

/**
 * Item used as material in recipe
 */
export interface RecipeUsage {
  item_id: string;
  recipe_id: string;
  recipe_type: "crafting" | "alchemy" | "scribing";
  amount: number;
  result_item_id: string;
  result_item_name: string;
  result_amount: number;
  tier: number;
}

/**
 * Item required for quest
 */
export interface QuestUsage {
  item_id: string;
  quest_id: string;
  quest_name: string;
  quest_level_required: number;
  quest_level_recommended: number;
  purpose: string; // "gather", "required", "equip", "have"
  amount: number;
  is_repeatable: boolean;
  class_restrictions: string | null; // JSON array
}

/**
 * Item used as currency to purchase other items
 */
export interface CurrencyUsage {
  currency_item_id: string;
  purchasable_item_id: string;
  purchasable_item_name: string;
  purchasable_quality: number;
  npc_id: string;
  npc_name: string;
  price: number; // Amount of currency needed
}

/**
 * Item required to activate altar
 */
export interface AltarUsage {
  item_id: string;
  altar_id: string;
  altar_name: string;
  altar_type: string;
  zone_id: string;
  zone_name: string;
}

/**
 * Item required to access portal
 */
export interface PortalUsage {
  item_id: string;
  portal_id: string;
  from_zone_id: string;
  from_zone_name: string;
  to_zone_id: string;
  to_zone_name: string;
  position_x: number;
  position_y: number;
}

/**
 * Item used to open chest (key)
 */
export interface ChestUsage {
  item_id: string;
  chest_id: string;
  chest_name: string;
  zone_id: string;
  zone_name: string;
  position_x: number;
  position_y: number;
}

/**
 * Item used as component in merge recipe.
 * Includes all components needed for the merge (not just this item).
 */
export interface MergeUsage {
  item_id: string;
  result_item_id: string;
  result_item_name: string;
  result_quality: number;
  all_components: Array<{ item_id: string; item_name: string }>;
}

// ============================================================================
// AGGREGATED INTERFACES
// ============================================================================

/**
 * All sources for a single item, grouped by type
 */
export interface ItemSources {
  monsters: MonsterSource[];
  vendors: VendorSource[];
  quests: QuestSource[];
  altars: AltarSource[];
  recipes: RecipeSource[];
  gathers: GatherSource[];
  chests: ChestSource[];
  packs: PackSource[];
  randoms: RandomSource[];
  merges: MergeSource[];
  treasureMaps: TreasureMapSource[];
}

/**
 * All usages for a single item, grouped by type
 */
export interface ItemUsages {
  recipes: RecipeUsage[];
  quests: QuestUsage[];
  currency: CurrencyUsage[];
  altars: AltarUsage[];
  portals: PortalUsage[];
  chests: ChestUsage[];
  merges: MergeUsage[];
}

// ============================================================================
// HELPER TYPES
// ============================================================================

/**
 * Zone information for item filtering
 */
export interface ZoneInfo {
  zone_id: string;
  zone_name: string;
}

/**
 * Basic item info for zone-based queries
 */
export interface ItemInfo {
  item_id: string;
  item_name: string;
  quality: number;
  item_type: string;
}
