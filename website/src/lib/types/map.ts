/**
 * Entity types that can appear on the map
 */
export type EntityType =
  | "monster"
  | "boss"
  | "elite"
  | "npc"
  | "portal"
  | "chest"
  | "altar"
  | "gathering_plant"
  | "gathering_mineral"
  | "gathering_spark"
  | "alchemy_table"
  | "crafting_station";

/**
 * Base interface for all map entities
 */
export interface MapEntity {
  id: string;
  type: EntityType;
  name: string;
  position: [number, number]; // [x, y] in game coordinates
  zoneId: string;
  zoneName: string;
}

/**
 * Monster-specific entity data
 */
export interface MonsterMapEntity extends MapEntity {
  type: "monster" | "boss" | "elite";
  level: number;
  isBoss: boolean;
  isElite: boolean;
}

/**
 * NPC-specific entity data
 */
export interface NpcMapEntity extends MapEntity {
  type: "npc";
  isVendor: boolean;
  isQuestGiver: boolean;
}

/**
 * Portal-specific entity data
 */
export interface PortalMapEntity extends MapEntity {
  type: "portal";
  destination: [number, number] | null;
  destinationZoneId: string | null;
  destinationZoneName: string | null;
  isClosed: boolean;
}

/**
 * Chest entity data
 */
export interface ChestMapEntity extends MapEntity {
  type: "chest";
  keyRequiredId: string | null;
  keyRequiredName: string | null;
}

/**
 * Altar entity data
 */
export interface AltarMapEntity extends MapEntity {
  type: "altar";
  altarType: "forgotten" | "avatar";
  minLevel: number;
}

/**
 * Gathering resource entity data
 */
export interface GatheringMapEntity extends MapEntity {
  type: "gathering_plant" | "gathering_mineral" | "gathering_spark";
  resourceName: string;
  level: number;
}

/**
 * Crafting station entity data
 */
export interface CraftingMapEntity extends MapEntity {
  type: "alchemy_table" | "crafting_station";
}

/**
 * Union of all map entity types
 */
export type AnyMapEntity =
  | MonsterMapEntity
  | NpcMapEntity
  | PortalMapEntity
  | ChestMapEntity
  | AltarMapEntity
  | GatheringMapEntity
  | CraftingMapEntity;

/**
 * Layer visibility toggle state
 */
export interface LayerVisibility {
  monsters: boolean;
  bosses: boolean;
  elites: boolean;
  npcs: boolean;
  portals: boolean;
  chests: boolean;
  altars: boolean;
  gatheringPlants: boolean;
  gatheringMinerals: boolean;
  gatheringSparks: boolean;
  crafting: boolean;
}

/**
 * All entity data for the map
 */
export interface MapEntityData {
  monsters: MonsterMapEntity[];
  npcs: NpcMapEntity[];
  portals: PortalMapEntity[];
  chests: ChestMapEntity[];
  altars: AltarMapEntity[];
  gathering: GatheringMapEntity[];
  crafting: CraftingMapEntity[];
}
