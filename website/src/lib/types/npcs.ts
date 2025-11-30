export interface NpcRoles {
  is_merchant: boolean;
  is_quest_giver: boolean;
  can_repair_equipment: boolean;
  is_bank: boolean;
  is_skill_master: boolean;
  is_veteran_master: boolean;
  is_reset_attributes: boolean;
  is_soul_binder: boolean;
  is_inkeeper: boolean;
  is_taskgiver_adventurer: boolean;
  is_merchant_adventurer: boolean;
  is_recruiter_mercenaries: boolean;
  is_guard: boolean;
  is_faction_vendor: boolean;
  is_essence_trader: boolean;
  is_priestess: boolean;
  is_augmenter: boolean;
}

export interface NpcInfo {
  id: string;
  name: string;
  faction: string | null;
  race: string | null;
  roles: NpcRoles;
  respawn_time: number;
  respawn_probability: number;
  respawn_dungeon_id: number;
  gold_required_respawn_dungeon: number;
  can_hide_after_spawn: boolean;
  gold_min: number;
  gold_max: number;
  probability_drop_gold: number;
  see_invisibility: boolean;
  is_summonable: boolean;
  flee_on_low_hp: boolean;
  welcome_messages: string[];
  shout_messages: string[];
  aggro_messages: string[];
  aggro_message_probability: number;
  summon_message: string;
}

export interface NpcQuestFactionRequirement {
  faction: string;
  faction_value: number;
  tier_name: string;
}

export interface NpcQuestOffered {
  id: string;
  name: string;
  level_required: number;
  level_recommended: number;
  is_adventurer_quest: boolean;
  race_requirements?: string[];
  class_requirements?: string[];
  faction_requirements?: NpcQuestFactionRequirement[];
}

export interface NpcItemSold {
  item_id: string;
  item_name: string;
  quality: number;
  price: number;
  currency_item_id: string | null;
  currency_item_name: string | null;
  tooltip_html: string | null;
  faction_required: number;
  faction_tier_name: string | null;
}

export interface NpcDrop {
  item_id: string;
  item_name: string;
  quality: number;
  rate: number;
  tooltip_html: string | null;
}

export interface NpcSkill {
  id: string;
  name: string;
}

export interface NpcSpawnLocation {
  zone_id: string;
  zone_name: string;
  sub_zone_id: string | null;
  sub_zone_name: string | null;
}

export interface NpcDetailPageData {
  npc: NpcInfo;
  questsOffered: NpcQuestOffered[];
  questsCompletedHere: NpcQuestOffered[];
  itemsSold: NpcItemSold[];
  spawns: NpcSpawnLocation[];
  drops: NpcDrop[];
  skills: NpcSkill[];
  respawnDungeonName: string | null;
}

// List page types
export interface NpcListView {
  id: string;
  name: string;
  faction: string | null;
  race: string | null;
  roles: NpcRoles;
}

export interface NpcZoneInfo {
  npc_id: string;
  zone_id: string;
  zone_name: string;
  is_dungeon: boolean;
}

export interface NpcsPageData {
  npcs: NpcListView[];
  npcZones: NpcZoneInfo[];
}
