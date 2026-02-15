import type { RespawnInfo } from "./respawn";
import type { NpcRoles } from "./npcs";

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
  level_median: number | null;
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
  level_min: number;
  level_max: number;
  health: number;
  health_base: number;
  health_per_level: number;
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
  roles: NpcRoles;
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
 * Chest info for zone detail page
 */
export interface ZoneChest {
  id: string;
  respawn_time: number;
  key_required_id: string | null;
  key_required_name: string | null;
  item_reward_id: string | null;
  item_reward_name: string | null;
  item_reward_amount: number;
  drop_count: number;
  position_x: number | null;
  position_y: number | null;
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
    level_median: number | null;
    discovery_exp: number;
    description: string;
  };
  description: string;
  monsters: ZoneMonster[];
  npcs: ZoneNpc[];
  gatherResources: ZoneGatherResource[];
  chests: ZoneChest[];
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
