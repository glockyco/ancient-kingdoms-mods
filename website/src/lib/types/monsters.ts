/**
 * Item drop from a monster
 */
export interface MonsterDrop {
  item_id: string;
  item_name?: string;
  rate: number;
  is_bestiary: boolean;
}

/**
 * Zone where a monster spawns (aggregated by zone and spawn type)
 */
export interface MonsterSpawnZone {
  zone_id: string;
  zone_name: string;
  spawn_count: number;
  spawn_type: "regular" | "placeholder" | "altar" | "summon";
  // Placeholder spawn source
  source_monster_id?: string;
  source_monster_name?: string;
  source_spawn_probability?: number;
  // Altar spawn source
  source_altar_id?: string;
  source_altar_name?: string;
  source_altar_waves?: number[]; // Which waves this monster appears in
  source_altar_activation_item_id?: string;
  source_altar_activation_item_name?: string;
  // Summon spawn source
  source_summon_kill_monster_id?: string;
  source_summon_kill_monster_name?: string;
  source_summon_kill_count?: number;
}

/**
 * Grouped spawn data for monster detail page
 */
export interface MonsterSpawnData {
  regular: MonsterSpawnZone[];
  summon: SummonSpawnInfo[];
  altar: AltarSpawnInfo[];
  placeholder: PlaceholderSpawnInfo | null;
}

/**
 * Summon spawn info (kill X monsters to summon)
 */
export interface SummonSpawnInfo {
  zone_id: string;
  zone_name: string;
  kill_monster_id: string;
  kill_monster_name: string;
  kill_count: number;
}

/**
 * Altar spawn info (aggregated by altar)
 */
export interface AltarSpawnInfo {
  altar_id: string;
  altar_name: string;
  zone_id: string;
  zone_name: string;
  waves: number[];
  activation_item_id: string | null;
  activation_item_name: string | null;
}

/**
 * Placeholder spawn info (spawned on parent death)
 */
export interface PlaceholderSpawnInfo {
  zone_id: string;
  zone_name: string;
  source_monster_id: string;
  source_monster_name: string;
  spawn_probability: number;
}

/**
 * Quest that requires killing this monster
 */
export interface MonsterQuest {
  id: string;
  name: string;
  level_required: number;
  level_recommended: number;
  kill_amount: number;
}

/**
 * Placeholder monster requirement for a summon trigger
 */
export interface SummonPlaceholder {
  monster_id: string;
  monster_name: string;
  count: number;
}

/**
 * Summon trigger that spawns this monster
 */
export interface MonsterSummonTrigger {
  id: string;
  summon_message: string | null;
  zone_id: string | null;
  zone_name: string | null;
  placeholders: SummonPlaceholder[];
}

/**
 * Monster basic info
 */
export interface MonsterInfo {
  id: string;
  name: string;
  level: number;
  health: number;
  type_name: string | null;
  class_name: string | null;
  is_boss: boolean;
  is_elite: boolean;
  is_hunt: boolean;
  is_summonable: boolean;

  // Combat stats
  damage: number;
  magic_damage: number;
  defense: number;
  magic_resist: number;
  poison_resist: number;
  fire_resist: number;
  cold_resist: number;
  disease_resist: number;
  block_chance: number;
  critical_chance: number;

  // Loot
  gold_min: number | null;
  gold_max: number | null;
  probability_drop_gold: number;
  exp_multiplier: number;

  // Spawning
  does_respawn: boolean;
  death_time: number;
  respawn_time: number;
  respawn_probability: number;
  spawn_time_start: number;
  spawn_time_end: number;
  placeholder_monster_id: string | null;
  placeholder_monster_name: string | null;
  placeholder_spawn_probability: number;

  // Combat flags
  see_invisibility: boolean;
  is_immune_debuffs: boolean;
  yell_friends: boolean;
  flee_on_low_hp: boolean;
  no_aggro_monster: boolean;
  has_aura: boolean;

  // Messages
  aggro_messages: string[];
  aggro_message_probability: number;
  lore_boss: string | null;

  // Factions
  improve_faction: string[];
  decrease_faction: string[];
}

/**
 * Monster that spawns this monster on death
 */
export interface SpawnedFromInfo {
  id: string;
  name: string;
  probability: number;
}

/**
 * What killing this monster can summon (reverse of SummonSpawnInfo)
 */
export interface SummonsInfo {
  summoned_monster_id: string;
  summoned_monster_name: string;
  kill_count: number;
  zone_id: string;
  zone_name: string;
}

/**
 * Full monster detail page data
 */
export interface MonsterDetailData {
  monster: MonsterInfo;
  drops: MonsterDrop[];
  spawns: MonsterSpawnData;
  quests: MonsterQuest[];
  summons: SummonsInfo[];
}
