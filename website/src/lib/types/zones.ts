import type { RespawnInfo } from "./respawn";

/**
 * Zone data as displayed in the zones overview table
 */
export interface ZoneListView {
  id: string;
  name: string;
  is_dungeon: boolean;
  weather_type: string | null;
  level_min: number | null;
  level_max: number | null;
  boss_count: number;
  elite_count: number;
  altar_count: number;
  npc_count: number;
  gather_count: number;
}

/**
 * Monster info for zone detail page
 */
export interface ZoneMonster extends RespawnInfo {
  id: string;
  name: string;
  level: number;
  health: number;
  is_boss: boolean;
  is_elite: boolean;
  type_name: string | null;
  gold_min: number | null;
  gold_max: number | null;
  spawn_count: number;
  position_x: number | null;
  position_y: number | null;
  position_z: number | null;
}

/**
 * NPC info for zone detail page
 */
export interface ZoneNpc {
  id: string;
  name: string;
  roles: {
    is_merchant?: boolean;
    is_quest_giver?: boolean;
    can_repair_equipment?: boolean;
    is_bank?: boolean;
    is_skill_master?: boolean;
    is_veteran_master?: boolean;
    is_reset_attributes?: boolean;
    is_soul_binder?: boolean;
    is_inkeeper?: boolean;
    is_taskgiver_adventurer?: boolean;
    is_merchant_adventurer?: boolean;
    is_recruiter_mercenaries?: boolean;
    is_guard?: boolean;
    is_faction_vendor?: boolean;
    is_essence_trader?: boolean;
    is_priestess?: boolean;
    is_augmenter?: boolean;
    is_renewal_sage?: boolean;
  };
  position_x: number | null;
  position_y: number | null;
  position_z: number | null;
}

/**
 * Gathering resource info for zone detail page
 */
export interface ZoneGatherResource {
  id: string;
  name: string;
  spawn_count: number;
  is_plant: boolean;
  is_mineral: boolean;
  is_radiant_spark: boolean;
}

/**
 * Connected zone info for zone detail page
 */
export interface ZoneConnection {
  id: string;
  name: string;
  is_dungeon: boolean;
}

/**
 * Sub-zone (zone trigger) info for zone detail page
 */
export interface ZoneSubZone {
  id: string;
  name: string;
  is_outdoor: boolean;
  position_x: number | null;
  position_y: number | null;
}

/**
 * Altar info for zone detail page
 */
export interface ZoneAltar {
  id: string;
  name: string;
  type: string;
  min_level_required: number;
  required_activation_item_id: string | null;
  required_activation_item_name: string | null;
  total_waves: number;
  position_x: number | null;
  position_y: number | null;
  position_z: number | null;
}

/**
 * Renewal Sage NPC that can reset all spawns in a dungeon
 */
export interface ZoneRenewalSage {
  id: string;
  name: string;
  gold_cost: number;
  zone_id: string;
  zone_name: string;
}

/**
 * Full zone detail data
 */
export interface ZoneDetailData {
  zone: {
    id: string;
    name: string;
    is_dungeon: boolean;
    weather_type: string | null;
    level_min: number | null;
    level_max: number | null;
    discovery_exp: number;
  };
  monsters: ZoneMonster[];
  npcs: ZoneNpc[];
  gatherResources: ZoneGatherResource[];
  altars: ZoneAltar[];
  connectedZones: ZoneConnection[];
  subZones: ZoneSubZone[];
  renewalSage: ZoneRenewalSage | null;
}

/**
 * Data for zones overview page
 */
export interface ZonesPageData {
  zones: ZoneListView[];
}
