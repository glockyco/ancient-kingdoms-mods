/**
 * Entity types that can appear on the map
 */
export type EntityType =
  | "monster"
  | "boss"
  | "elite"
  | "hunt"
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
  type: "monster" | "boss" | "elite" | "hunt";
  level: number;
  isBoss: boolean;
  isElite: boolean;
  isHunt: boolean;
  isPatrolling: boolean;
  patrolWaypoints: [number, number][] | null;
}

/**
 * NPC-specific entity data
 */
export interface NpcMapEntity extends MapEntity {
  type: "npc";
  // Service roles
  isVendor: boolean;
  isQuestGiver: boolean;
  canRepair: boolean;
  isBank: boolean;
  isInnkeeper: boolean;
  isSoulBinder: boolean;
  // Training roles
  isSkillTrainer: boolean;
  isVeteranTrainer: boolean;
  isAttributeReset: boolean;
  // Specialized roles
  isFactionVendor: boolean;
  isEssenceTrader: boolean;
  isAugmenter: boolean;
  isPriestess: boolean;
  isRenewalSage: boolean;
  // Adventuring roles
  isAdventurerTaskgiver: boolean;
  isAdventurerVendor: boolean;
  isMercenaryRecruiter: boolean;
  // Other
  isGuard: boolean;
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
  isCookingOven: boolean;
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
  // Monsters section
  bosses: boolean;
  elites: boolean;
  creatures: boolean; // renamed from "monsters"
  hunts: boolean;

  // NPCs section (all 18 types as separate toggles)
  npcVendors: boolean;
  npcQuestGivers: boolean;
  npcRepair: boolean;
  npcBanks: boolean;
  npcInnkeepers: boolean;
  npcSoulBinders: boolean;
  npcSkillTrainers: boolean;
  npcVeteranTrainers: boolean;
  npcAttributeReset: boolean;
  npcFactionVendors: boolean;
  npcEssenceTraders: boolean;
  npcAugmenters: boolean;
  npcPriestesses: boolean;
  npcRenewalSages: boolean;
  npcAdventurerTasks: boolean;
  npcAdventurerVendors: boolean;
  npcMercenaryRecruiters: boolean;
  npcGuards: boolean;

  // Interactables section
  portals: boolean;
  portalArcs: boolean;
  chests: boolean;
  altars: boolean;
  alchemyTables: boolean;
  forges: boolean;
  cookingOvens: boolean;

  // Resources section
  gatheringPlants: boolean;
  gatheringMinerals: boolean;
  gatheringSparks: boolean;

  // Zones section
  subZones: boolean;
  parentZones: boolean;
}

/**
 * Level filter ranges
 */
export interface LevelFilter {
  monsterMin: number;
  monsterMax: number;
  gatheringMin: number;
  gatheringMax: number;
}

/**
 * Zone boundary polygon for visualization
 */
export interface ZoneBoundary {
  id: string;
  name: string;
  zoneId: string;
  zoneName: string;
  polygon: [number, number][];
}

/**
 * Level ranges derived from actual data
 */
export interface LevelRanges {
  monsterMin: number;
  monsterMax: number;
  gatheringMin: number;
  gatheringMax: number;
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
  subZones: ZoneBoundary[];
  levelRanges: LevelRanges;
}

/**
 * Pre-filtered entity data (computed once, not on every render)
 */
export interface FilteredMapData {
  creatures: MonsterMapEntity[]; // renamed from regularMonsters
  elites: MonsterMapEntity[];
  bosses: MonsterMapEntity[];
  hunts: MonsterMapEntity[];
  plants: GatheringMapEntity[];
  minerals: GatheringMapEntity[];
  sparks: GatheringMapEntity[];
  alchemyTables: CraftingMapEntity[];
  forges: CraftingMapEntity[];
  cookingOvens: CraftingMapEntity[];
  portalsWithDestinations: PortalMapEntity[];
  parentZones: ZoneBoundary[];
}
