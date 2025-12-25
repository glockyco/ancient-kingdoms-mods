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
  | "gathering_other"
  | "alchemy_table"
  | "crafting_station";

/**
 * Base interface for all map entities
 */
export interface MapEntity {
  id: string;
  type: EntityType;
  name: string;
  position: [number, number] | null; // [x, y] in game coordinates, null for entities without spawns
  zoneId: string | null; // null for entities without spawns
  zoneName: string;
}

/**
 * Spawn type for monsters
 */
export type MonsterSpawnType = "regular" | "summon" | "placeholder" | "altar";

/**
 * Monster-specific entity data
 */
export interface MonsterMapEntity extends MapEntity {
  type: "monster" | "boss" | "elite" | "hunt";
  monsterId: string; // Original monster ID (id field is spawn ID for individual tracking)
  level: number;
  isBoss: boolean;
  isElite: boolean;
  isHunt: boolean;
  isPatrolling: boolean;
  patrolWaypoints: [number, number][] | null;
  // Popup fields
  respawnTime: number;
  respawnProbability: number;
  spawnTimeStart: number;
  spawnTimeEnd: number;
  baseExp: number;
  dropCount: number;
  bestiaryDropCount: number;
  spawnType: MonsterSpawnType;
  // For placeholder spawns
  sourceMonsterName: string | null;
  sourceMonsterId: string | null;
  sourceSpawnProbability: number | null;
  // For summon spawns (blocked while X alive)
  summonKillMonsterName: string | null;
  summonKillMonsterId: string | null;
  summonKillCount: number | null;
  // Specific spawn IDs that block this summon (for arc rendering)
  blockerSpawnIds: string[] | null;
  // Specific spawn IDs of the source monster for placeholders (for arc rendering)
  sourceSpawnIds: string[] | null;
}

/**
 * Bit positions for NPC role bitmask (must match build-pipeline ROLE_BITS)
 */
export const NPC_ROLE_BITS = {
  isVendor: 0,
  isQuestGiver: 1,
  canRepair: 2,
  isBank: 3,
  isInnkeeper: 4,
  isSoulBinder: 5,
  isSkillTrainer: 6,
  isVeteranTrainer: 7,
  isAttributeReset: 8,
  isFactionVendor: 9,
  isEssenceTrader: 10,
  isAugmenter: 11,
  isPriestess: 12,
  isRenewalSage: 13,
  isAdventurerTaskgiver: 14,
  isAdventurerVendor: 15,
  isMercenaryRecruiter: 16,
  isGuard: 17,
} as const;

/**
 * NPC-specific entity data
 */
export interface NpcMapEntity extends MapEntity {
  type: "npc";
  roleBitmask: number;
  renewalDungeonName: string | null;
  renewalDungeonZoneId: string | null;
  isPatrolling: boolean;
  patrolWaypoints: [number, number][] | null;
  // Popup fields
  questCount: number;
  itemsSoldCount: number;
  hasTeleport: boolean;
  teleportDestName: string | null;
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
  requiredItemId: string | null;
  requiredItemName: string | null;
  requiredLevel: number;
  requiredItemLevel: number;
  needMonsterDeadId: string | null;
  needMonsterDeadName: string | null;
  // Specific spawn IDs of the kill requirement monster (for arc rendering)
  killRequirementSpawnIds: string[] | null;
}

/**
 * Chest entity data
 */
export interface ChestMapEntity extends MapEntity {
  type: "chest";
  keyRequiredId: string | null;
  keyRequiredName: string | null;
  // Popup fields
  respawnTime: number;
  dropCount: number;
  randomDropCount: number;
}

/**
 * Altar entity data
 */
export interface AltarMapEntity extends MapEntity {
  type: "altar";
  altarType: "forgotten" | "avatar";
  minLevel: number;
  activationItemId: string | null;
  activationItemName: string | null;
  // Popup fields
  totalWaves: number;
  rewardNormalName: string | null;
  rewardMagicName: string | null;
  rewardEpicName: string | null;
  rewardLegendaryName: string | null;
  finalBossNames: string[];
  finalBossIds: string[];
}

/**
 * Gathering resource entity data
 */
export interface GatheringMapEntity extends MapEntity {
  type:
    | "gathering_plant"
    | "gathering_mineral"
    | "gathering_spark"
    | "gathering_other";
  resourceName: string;
  level: number;
  // Popup fields
  respawnTime: number;
  toolRequiredId: string | null;
  toolRequiredName: string | null;
  dropCount: number;
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
  gatheringOther: boolean;

  // Zones section
  subZones: boolean;
  parentZones: boolean;
  tiles: boolean;
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
  parentZones: ZoneBoundary[];
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
  otherGathering: GatheringMapEntity[];
  alchemyTables: CraftingMapEntity[];
  forges: CraftingMapEntity[];
  cookingOvens: CraftingMapEntity[];
  portalsWithDestinations: PortalMapEntity[];
  parentZones: ZoneBoundary[];
}

/**
 * Zone list item for dropdown selection
 */
export interface ZoneListItem {
  id: string;
  name: string;
}
