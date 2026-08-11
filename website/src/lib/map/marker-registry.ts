import {
  Box,
  ChefHat,
  CircleDot,
  Crown,
  Crosshair,
  Fish,
  Flame,
  FlaskConical,
  Hammer,
  Home,
  Leaf,
  Package,
  Pickaxe,
  Shield,
  Shovel,
  Sparkles,
  Star,
  Sword,
  Scroll,
  TriangleAlert,
  User,
  type IconNode,
} from "lucide";
import { type EntityId } from "$lib/entities/registry";
import {
  NPC_ROLE_BITS,
  type AltarMapEntity,
  type AnyMapEntity,
  type ChestMapEntity,
  type CraftingMapEntity,
  type GatheringMapEntity,
  type HouseMapEntity,
  type FilteredMapData,
  type MonsterMapEntity,
  type NpcMapEntity,
  type PortalMapEntity,
  type TrapMapEntity,
  type TreasureMapEntity,
  type LayerVisibility,
} from "$lib/types/map";

export type MarkerSource =
  "monsters" | "npcs" | "portals" | "interactables" | "resources";
export type MarkerRow = AnyMapEntity;
export type RGB = readonly [number, number, number];

export interface IconSize {
  base: number;
  min: number;
  max: number;
}

export interface SelectionTarget {
  entityId: string;
  entityType: string;
}

export type SelectionStrategy<TRow extends MarkerRow> =
  | { kind: "by-field"; field: (row: TRow) => string }
  | { kind: "delegated"; resolve: (row: TRow) => SelectionTarget };

export interface MarkerDecoration {
  id: string;
  kind: "arc" | "path" | "radius";
}

export interface DecorationContext<TRow extends MarkerRow> {
  row: TRow;
  markerId: string;
}

export interface FacetDef<TRow extends MarkerRow> {
  id: string;
  visibilityKey: keyof LayerVisibility;
  label: string;
  mask: number;
  matches: (row: TRow) => boolean;
}

export type MarkerLayerFilter =
  "zone" | "monster-level" | "gathering-level" | "npc" | "portal";

export type MarkerSidebarSection =
  "monsters" | "npcs" | "interactables" | "crafting" | "gathering";

export interface MarkerLayerOptions {
  /** Stable deck.gl ID for the primary point layer. */
  id: string;
  /** Null for facet-controlled markers such as NPCs. */
  visibilityKey: keyof LayerVisibility | null;
  filter: MarkerLayerFilter;
  sidebarSection: MarkerSidebarSection;
  quickToggle?: boolean;
}

export interface MarkerDef<TRow extends MarkerRow = MarkerRow> {
  id: string;
  entity: EntityId;
  source: MarkerSource;
  /** Partition precedence is distinct from paint order. Source rows can overlap. */
  precedence: number;
  match: (row: TRow) => boolean;
  label: string;
  pluralLabel: string;
  color: RGB;
  icon: IconNode;
  iconType: string;
  iconSize: IconSize;
  fallbackRadius: number;
  borderClass: string;
  selection: SelectionStrategy<TRow>;
  defaultVisible: boolean;
  z: number;
  /** Key used by FilteredMapData for this marker's render rows. */
  filteredDataKey: keyof FilteredMapData;
  layer: MarkerLayerOptions;
  displayName?: (row: TRow) => string;
  decorations?: (context: DecorationContext<TRow>) => MarkerDecoration[];
  facets?: FacetDef<TRow>[];
}

const monsterSelection = {
  kind: "by-field",
  field: (row: MonsterMapEntity) => row.monsterId,
} satisfies SelectionStrategy<MonsterMapEntity>;

const altarSelection = {
  kind: "delegated",
  resolve: (row: MonsterMapEntity): SelectionTarget => ({
    entityId: row.altarIds?.[0] ?? row.id,
    entityType: row.altarIds?.length ? "altar" : row.type,
  }),
} satisfies SelectionStrategy<MonsterMapEntity>;

const monsterDecorations = ({
  row,
  markerId,
}: DecorationContext<MonsterMapEntity>): MarkerDecoration[] => [
  ...(row.isPatrolling
    ? [{ id: `${markerId}:patrol`, kind: "path" as const }]
    : []),
  ...(row.moveDistance > 0
    ? [{ id: `${markerId}:wander`, kind: "radius" as const }]
    : []),
  ...(row.blockerSpawnIds?.length || row.sourceSpawnIds?.length
    ? [{ id: `${markerId}:relation`, kind: "arc" as const }]
    : []),
];

const MONSTER_ICON_TYPES = {
  creatures: "monster",
  bosses: "boss",
  fabled: "fabled",
  elites: "elite",
  hunts: "hunt",
} as const;

const MONSTER_PRESENTATION = {
  creatures: {
    borderClass: "border-l-red-500",
    iconSize: { base: 18, min: 16, max: 40 },
    fallbackRadius: 4,
    precedence: 100,
    z: 100,
  },
  bosses: {
    borderClass: "border-l-cyan-500",
    iconSize: { base: 32, min: 28, max: 64 },
    fallbackRadius: 10,
    precedence: 400,
    z: 2100,
  },
  fabled: {
    borderClass: "border-l-emerald-500",
    iconSize: { base: 28, min: 26, max: 60 },
    fallbackRadius: 7,
    precedence: 500,
    z: 2000,
  },
  elites: {
    borderClass: "border-l-purple-500",
    iconSize: { base: 26, min: 24, max: 56 },
    fallbackRadius: 6,
    precedence: 300,
    z: 1900,
  },
  hunts: {
    borderClass: "border-l-yellow-500",
    iconSize: { base: 18, min: 16, max: 40 },
    fallbackRadius: 4,
    precedence: 200,
    z: 1100,
  },
} as const;

const monsterMarker = (
  id: "creatures" | "bosses" | "fabled" | "elites" | "hunts",
  label: string,
  pluralLabel: string,
  precedence: number,
  match: (row: MonsterMapEntity) => boolean,
  icon: IconNode,
  color: RGB,
  selection: SelectionStrategy<MonsterMapEntity> = monsterSelection,
): MarkerDef<MonsterMapEntity> => ({
  id,
  entity: "monster",
  source: "monsters",
  precedence,
  match: (row) =>
    (row.type === "monster" ||
      row.type === "boss" ||
      row.type === "fabled" ||
      row.type === "elite" ||
      row.type === "hunt") &&
    match(row),
  label,
  pluralLabel,
  color,
  icon,
  iconType: MONSTER_ICON_TYPES[id],
  iconSize: MONSTER_PRESENTATION[id].iconSize,
  fallbackRadius: MONSTER_PRESENTATION[id].fallbackRadius,
  borderClass: MONSTER_PRESENTATION[id].borderClass,
  selection,
  defaultVisible: id === "bosses" || id === "fabled" || id === "elites",
  z: MONSTER_PRESENTATION[id].z,
  filteredDataKey: id,
  layer: {
    id,
    visibilityKey: id,
    filter: "monster-level",
    sidebarSection: "monsters",
    quickToggle: id !== "fabled",
  },
  decorations: monsterDecorations,
});

const NPC_FACET_METADATA = {
  isVendor: { visibilityKey: "npcVendors", label: "Vendors" },
  isQuestGiver: { visibilityKey: "npcQuestGivers", label: "Quest Givers" },
  canRepair: { visibilityKey: "npcRepair", label: "Repair" },
  isBank: { visibilityKey: "npcBanks", label: "Banks" },
  isInnkeeper: { visibilityKey: "npcInnkeepers", label: "Innkeepers" },
  isSoulBinder: { visibilityKey: "npcSoulBinders", label: "Soul Binders" },
  isSkillTrainer: {
    visibilityKey: "npcSkillTrainers",
    label: "Skill Trainers",
  },
  isVeteranTrainer: {
    visibilityKey: "npcVeteranTrainers",
    label: "Veteran Trainers",
  },
  isAttributeReset: {
    visibilityKey: "npcAttributeReset",
    label: "Attribute Reset",
  },
  isFactionVendor: {
    visibilityKey: "npcFactionVendors",
    label: "Faction Vendors",
  },
  isEssenceTrader: {
    visibilityKey: "npcEssenceTraders",
    label: "Essence Traders",
  },
  isAugmenter: { visibilityKey: "npcAugmenters", label: "Augmenters" },
  isPriestess: { visibilityKey: "npcPriestesses", label: "Priestesses" },
  isRenewalSage: { visibilityKey: "npcRenewalSages", label: "Renewal Sages" },
  isAdventurerTaskgiver: {
    visibilityKey: "npcAdventurerTasks",
    label: "Adventurer Tasks",
  },
  isAdventurerVendor: {
    visibilityKey: "npcAdventurerVendors",
    label: "Adventurer Vendors",
  },
  isMercenaryRecruiter: {
    visibilityKey: "npcMercenaryRecruiters",
    label: "Mercenary Recruiters",
  },
  isGuard: { visibilityKey: "npcGuards", label: "Guards" },
  isTeleporter: { visibilityKey: "npcTeleporters", label: "Teleporters" },
  isVillager: { visibilityKey: "npcVillagers", label: "Villagers" },
  isGuildManagement: {
    visibilityKey: "npcGuildManagers",
    label: "Guild Managers",
  },
  isBarber: { visibilityKey: "npcBarbers", label: "Barbers" },
} as const satisfies Record<
  keyof typeof NPC_ROLE_BITS,
  { visibilityKey: keyof LayerVisibility; label: string }
>;

const npcFacets: FacetDef<NpcMapEntity>[] = Object.entries(NPC_ROLE_BITS).map(
  ([id, bit]) => {
    const metadata = NPC_FACET_METADATA[id as keyof typeof NPC_ROLE_BITS];
    return {
      id,
      visibilityKey: metadata.visibilityKey,
      label: metadata.label,
      mask: 1 << bit,
      matches: (row) => (row.roleBitmask & (1 << bit)) !== 0,
    };
  },
);

export const NPC_FACETS = npcFacets;

const npcDecorations = ({
  row,
  markerId,
}: DecorationContext<NpcMapEntity>): MarkerDecoration[] => [
  ...(row.isPatrolling
    ? [{ id: `${markerId}:patrol`, kind: "path" as const }]
    : []),
  ...(row.hasTeleport && row.teleportDestination
    ? [{ id: `${markerId}:teleporter`, kind: "arc" as const }]
    : []),
];

interface SimpleMarkerOptions<TRow extends MarkerRow> {
  id: string;
  entity: EntityId;
  source: MarkerSource;
  label: string;
  pluralLabel: string;
  color: RGB;
  icon: IconNode;
  iconType: string;
  fallbackRadius: number;
  borderClass: string;
  iconSize: IconSize;
  defaultVisible?: boolean;
  z: number;
  filteredDataKey?: keyof FilteredMapData;
  layer: MarkerLayerOptions;
  match: (row: TRow) => boolean;
  selection?: SelectionStrategy<TRow>;
}

const simpleMarker = <TRow extends MarkerRow>({
  id,
  source,
  label,
  pluralLabel,
  color,
  icon,
  iconType,
  fallbackRadius,
  borderClass,
  iconSize = { base: 20, min: 18, max: 44 },
  defaultVisible = false,
  z,
  filteredDataKey = id as keyof FilteredMapData,
  layer,
  match,
  selection = {
    kind: "by-field",
    field: (row: TRow) => row.id,
  },
  entity,
}: SimpleMarkerOptions<TRow>): MarkerDef<TRow> => ({
  id,
  entity,
  source,
  precedence: 100,
  match,
  label,
  pluralLabel,
  color,
  icon,
  iconType,
  iconSize,
  fallbackRadius,
  borderClass,
  selection,
  defaultVisible,
  z,
  filteredDataKey,
  layer,
});

type AnyMarkerDef =
  | MarkerDef<MonsterMapEntity>
  | MarkerDef<NpcMapEntity>
  | MarkerDef<PortalMapEntity>
  | MarkerDef<ChestMapEntity>
  | MarkerDef<TreasureMapEntity>
  | MarkerDef<AltarMapEntity>
  | MarkerDef<TrapMapEntity>
  | MarkerDef<GatheringMapEntity>
  | MarkerDef<CraftingMapEntity>
  | MarkerDef<HouseMapEntity>;

export const markerRegistry = {
  creatures: monsterMarker(
    "creatures",
    "Creature",
    "Creatures",
    100,
    (row) => !row.isBoss && !row.isFabled && !row.isElite && !row.isHunt,
    Sword,
    [239, 68, 68],
    altarSelection,
  ),
  hunts: monsterMarker(
    "hunts",
    "Hunt",
    "Hunts",
    200,
    (row) => row.isHunt,
    Crosshair,
    [234, 179, 8],
  ),
  elites: monsterMarker(
    "elites",
    "Elite",
    "Elites",
    300,
    (row) => row.isElite,
    Shield,
    [168, 85, 247],
  ),
  fabled: monsterMarker(
    "fabled",
    "Fabled",
    "Fabled",
    500,
    (row) => row.isFabled,
    Star,
    [16, 185, 129],
  ),
  bosses: monsterMarker(
    "bosses",
    "Boss",
    "Bosses",
    400,
    (row) => row.isBoss,
    Crown,
    [6, 182, 212],
  ),
  npc: {
    id: "npc",
    entity: "npc",
    source: "npcs",
    precedence: 100,
    match: (row: NpcMapEntity) => row.type === "npc",
    label: "NPC",
    pluralLabel: "NPCs",
    color: [59, 130, 246],
    icon: User,
    iconType: "npc",
    iconSize: { base: 18, min: 16, max: 40 },
    fallbackRadius: 5,
    borderClass: "border-l-blue-500",
    selection: {
      kind: "by-field",
      field: (row: NpcMapEntity) => row.id,
    },
    defaultVisible: false,
    z: 1600,
    filteredDataKey: "npcs",
    layer: {
      id: "npcs",
      visibilityKey: null,
      filter: "npc",
      sidebarSection: "npcs",
    },
    facets: npcFacets,
    decorations: npcDecorations,
  } satisfies MarkerDef<NpcMapEntity>,
  portals: {
    id: "portals",
    entity: "portal",
    source: "portals",
    precedence: 100,
    match: (row: PortalMapEntity) => row.type === "portal",
    label: "Portal",
    pluralLabel: "Portals",
    color: [34, 197, 94],
    icon: CircleDot,
    iconType: "portal",
    iconSize: { base: 22, min: 20, max: 48 },
    fallbackRadius: 6,
    borderClass: "border-l-green-500",
    selection: {
      kind: "by-field",
      field: (row: PortalMapEntity) => row.id,
    },
    defaultVisible: false,
    z: 1500,
    filteredDataKey: "portals",
    layer: {
      id: "portals",
      visibilityKey: "portals",
      filter: "portal",
      sidebarSection: "interactables",
      quickToggle: true,
    },
    decorations: ({ row, markerId }) => [
      ...(row.destination
        ? [{ id: `${markerId}:destination`, kind: "arc" as const }]
        : []),
      ...(row.requiredItemId || row.requiredLevel > 0 || row.needMonsterDeadId
        ? [{ id: `${markerId}:requirements`, kind: "radius" as const }]
        : []),
    ],
    displayName: (row: PortalMapEntity) =>
      `${row.fromSubZoneName ?? "Unknown source"} → ${row.destinationSubZoneName ?? "Unknown destination"}`,
  } satisfies MarkerDef<PortalMapEntity>,
  chests: simpleMarker<ChestMapEntity>({
    id: "chests",
    entity: "chest",
    source: "interactables",
    label: "Chest",
    pluralLabel: "Chests",
    color: [14, 165, 233],
    icon: Box,
    iconType: "chest",
    iconSize: { base: 20, min: 18, max: 44 },
    fallbackRadius: 5,
    borderClass: "border-l-sky-500",
    z: 1200,
    layer: {
      id: "chests",
      visibilityKey: "chests",
      filter: "zone",
      sidebarSection: "interactables",
      quickToggle: true,
    },
    match: (row) => row.type === "chest",
  }),
  treasure: simpleMarker<TreasureMapEntity>({
    id: "treasure",
    entity: "treasure",
    source: "interactables",
    label: "Treasure",
    pluralLabel: "Treasure",
    color: [20, 184, 166],
    icon: Shovel,
    iconType: "treasure",
    iconSize: { base: 20, min: 18, max: 44 },
    fallbackRadius: 5,
    borderClass: "border-l-teal-500",
    z: 1400,
    layer: {
      id: "treasure",
      visibilityKey: "treasure",
      filter: "zone",
      sidebarSection: "interactables",
    },
    match: (row) => row.type === "treasure",
  }),
  altars: simpleMarker<AltarMapEntity>({
    id: "altars",
    entity: "altar",
    source: "interactables",
    label: "Altar",
    pluralLabel: "Altars",
    color: [249, 115, 22],
    icon: Flame,
    iconType: "altar",
    iconSize: { base: 26, min: 24, max: 56 },
    fallbackRadius: 7,
    borderClass: "border-l-orange-500",
    defaultVisible: true,
    z: 1700,
    layer: {
      id: "altars",
      visibilityKey: "altars",
      filter: "zone",
      sidebarSection: "interactables",
      quickToggle: true,
    },
    match: (row) => row.type === "altar",
  }),
  traps: simpleMarker<TrapMapEntity>({
    id: "traps",
    entity: "trap",
    source: "interactables",
    label: "Trap",
    pluralLabel: "Traps",
    color: [225, 29, 72],
    icon: TriangleAlert,
    iconType: "trap",
    iconSize: { base: 20, min: 18, max: 44 },
    fallbackRadius: 5,
    borderClass: "border-l-rose-600",
    defaultVisible: true,
    z: 1800,
    layer: {
      id: "traps",
      visibilityKey: "traps",
      filter: "zone",
      sidebarSection: "interactables",
    },
    match: (row) => row.type === "trap",
  }),
  houses: simpleMarker<HouseMapEntity>({
    id: "houses",
    entity: "house",
    source: "interactables",
    label: "House",
    pluralLabel: "Houses",
    color: [245, 158, 11],
    icon: Home,
    iconType: "house",
    iconSize: { base: 22, min: 20, max: 48 },
    fallbackRadius: 6,
    borderClass: "border-l-amber-500",
    z: 1300,
    layer: {
      id: "houses",
      visibilityKey: "houses",
      filter: "zone",
      sidebarSection: "interactables",
    },
    match: (row) => row.type === "house",
  }),
  gatheringPlants: simpleMarker<GatheringMapEntity>({
    id: "gatheringPlants",
    entity: "gathering_resource",
    source: "resources",
    label: "Plant",
    pluralLabel: "Plants",
    color: [132, 204, 22],
    icon: Leaf,
    iconType: "gathering_plant",
    filteredDataKey: "plants",
    iconSize: { base: 16, min: 14, max: 36 },
    fallbackRadius: 3,
    borderClass: "border-l-lime-500",
    z: 200,
    layer: {
      id: "gathering-plants",
      visibilityKey: "gatheringPlants",
      filter: "gathering-level",
      sidebarSection: "gathering",
      quickToggle: true,
    },
    match: (row) => row.type === "gathering_plant",
  }),
  gatheringMinerals: simpleMarker<GatheringMapEntity>({
    id: "gatheringMinerals",
    entity: "gathering_resource",
    source: "resources",
    label: "Mineral",
    pluralLabel: "Minerals",
    color: [23, 37, 84],
    icon: Pickaxe,
    iconType: "gathering_mineral",
    filteredDataKey: "minerals",
    iconSize: { base: 16, min: 14, max: 36 },
    fallbackRadius: 3,
    borderClass: "border-l-blue-950",
    z: 300,
    layer: {
      id: "gathering-minerals",
      visibilityKey: "gatheringMinerals",
      filter: "gathering-level",
      sidebarSection: "gathering",
      quickToggle: true,
    },
    match: (row) => row.type === "gathering_mineral",
  }),
  gatheringSparks: simpleMarker<GatheringMapEntity>({
    id: "gatheringSparks",
    entity: "gathering_resource",
    source: "resources",
    label: "Spark",
    pluralLabel: "Sparks",
    color: [168, 85, 247],
    icon: Sparkles,
    iconType: "gathering_spark",
    filteredDataKey: "sparks",
    iconSize: { base: 16, min: 14, max: 36 },
    fallbackRadius: 3,
    borderClass: "border-l-purple-500",
    z: 500,
    layer: {
      id: "gathering-sparks",
      visibilityKey: "gatheringSparks",
      filter: "zone",
      sidebarSection: "gathering",
      quickToggle: true,
    },
    match: (row) => row.type === "gathering_spark",
  }),
  gatheringFishing: simpleMarker<GatheringMapEntity>({
    id: "gatheringFishing",
    entity: "gathering_resource",
    source: "resources",
    label: "Fishing Spot",
    pluralLabel: "Fishing Spots",
    color: [6, 182, 212],
    icon: Fish,
    iconType: "gathering_fish",
    filteredDataKey: "fishingSpots",
    iconSize: { base: 16, min: 14, max: 36 },
    fallbackRadius: 3,
    borderClass: "border-l-cyan-500",
    z: 400,
    layer: {
      id: "gathering-fishing",
      visibilityKey: "gatheringFishing",
      filter: "gathering-level",
      sidebarSection: "gathering",
      quickToggle: true,
    },
    match: (row) => row.type === "gathering_fish",
    selection: {
      kind: "by-field",
      field: (row) => row.selectionGroupId,
    },
  }),
  gatheringOther: simpleMarker<GatheringMapEntity>({
    id: "gatheringOther",
    entity: "gathering_resource",
    source: "resources",
    label: "Resource",
    pluralLabel: "Resources",
    color: [156, 163, 175],
    icon: Package,
    iconType: "gathering_other",
    filteredDataKey: "otherGathering",
    iconSize: { base: 16, min: 14, max: 36 },
    fallbackRadius: 3,
    borderClass: "border-l-gray-400",
    z: 600,
    layer: {
      id: "gathering-other",
      visibilityKey: "gatheringOther",
      filter: "zone",
      sidebarSection: "gathering",
      quickToggle: true,
    },
    match: (row) => row.type === "gathering_other",
  }),
  alchemyTables: simpleMarker<CraftingMapEntity>({
    id: "alchemyTables",
    entity: "alchemy_table",
    source: "interactables",
    label: "Alchemy Table",
    pluralLabel: "Alchemy Tables",
    color: [139, 92, 246],
    icon: FlaskConical,
    iconType: "alchemy_table",
    iconSize: { base: 20, min: 18, max: 44 },
    fallbackRadius: 5,
    borderClass: "border-l-violet-500",
    z: 700,
    layer: {
      id: "alchemy-tables",
      visibilityKey: "alchemyTables",
      filter: "zone",
      sidebarSection: "crafting",
    },
    match: (row) => row.type === "alchemy_table",
  }),
  forges: simpleMarker<CraftingMapEntity>({
    id: "forges",
    entity: "crafting_station",
    source: "interactables",
    label: "Forge",
    pluralLabel: "Forges",
    color: [139, 92, 246],
    icon: Hammer,
    iconType: "crafting_station",
    iconSize: { base: 20, min: 18, max: 44 },
    fallbackRadius: 5,
    borderClass: "border-l-violet-500",
    z: 800,
    layer: {
      id: "forges",
      visibilityKey: "forges",
      filter: "zone",
      sidebarSection: "crafting",
    },
    match: (row) => row.type === "crafting_station" && !row.isCookingOven,
  }),
  cookingOvens: simpleMarker<CraftingMapEntity>({
    id: "cookingOvens",
    entity: "crafting_station",
    source: "interactables",
    label: "Cooking Oven",
    pluralLabel: "Cooking Ovens",
    color: [139, 92, 246],
    icon: ChefHat,
    iconType: "cooking_oven",
    iconSize: { base: 20, min: 18, max: 44 },
    fallbackRadius: 5,
    borderClass: "border-l-violet-500",
    z: 900,
    layer: {
      id: "cooking-ovens",
      visibilityKey: "cookingOvens",
      filter: "zone",
      sidebarSection: "crafting",
    },
    match: (row) => row.type === "crafting_station" && row.isCookingOven,
  }),
  scribingTables: simpleMarker<CraftingMapEntity>({
    id: "scribingTables",
    entity: "scribing_table",
    source: "interactables",
    label: "Scribing Table",
    pluralLabel: "Scribing Tables",
    color: [139, 92, 246],
    icon: Scroll,
    iconType: "scribing_table",
    iconSize: { base: 20, min: 18, max: 44 },
    fallbackRadius: 5,
    borderClass: "border-l-purple-500",
    z: 1000,
    layer: {
      id: "scribing-tables",
      visibilityKey: "scribingTables",
      filter: "zone",
      sidebarSection: "crafting",
    },
    match: (row) => row.type === "scribing_table",
  }),
} as const satisfies Record<string, AnyMarkerDef>;

export type MarkerId = keyof typeof markerRegistry;

/** All marker presentations that can reveal a registered entity family. */
export const MARKERS_BY_ENTITY = Object.entries(markerRegistry).reduce(
  (index, [markerId, marker]) => {
    const ids = index[marker.entity] ?? [];
    index[marker.entity] = [...ids, markerId as MarkerId];
    return index;
  },
  {} as Partial<Record<EntityId, MarkerId[]>>,
);

export type MarkerPresentation = Pick<
  MarkerDef,
  | "color"
  | "icon"
  | "iconSize"
  | "fallbackRadius"
  | "borderClass"
  | "label"
  | "pluralLabel"
  | "defaultVisible"
  | "z"
>;

function deriveMarkerRecord<T>(
  select: (marker: AnyMarkerDef) => T,
): Record<MarkerId, T> {
  const record = {} as Record<MarkerId, T>;
  for (const [id, marker] of Object.entries(markerRegistry) as [
    MarkerId,
    AnyMarkerDef,
  ][]) {
    record[id] = select(marker);
  }
  return record;
}

export const MARKER_COLORS = deriveMarkerRecord((marker) => marker.color);
export const MARKER_ICONS = deriveMarkerRecord((marker) => marker.icon);
export const MARKER_ICON_TYPES = deriveMarkerRecord(
  (marker) => marker.iconType,
);
export const MARKER_ICON_SIZES = deriveMarkerRecord(
  (marker) => marker.iconSize,
);
export const MARKER_RADII = deriveMarkerRecord(
  (marker) => marker.fallbackRadius,
);
export const MARKER_BORDER_CLASSES = deriveMarkerRecord(
  (marker) => marker.borderClass,
);
export const MARKER_LABELS = deriveMarkerRecord((marker) => marker.label);
export const MARKER_PLURAL_LABELS = deriveMarkerRecord(
  (marker) => marker.pluralLabel,
);
export const MARKER_DEFAULT_VISIBILITY = deriveMarkerRecord(
  (marker) => marker.defaultVisible,
);
export const MARKER_Z_ORDER = deriveMarkerRecord((marker) => marker.z);
export const MARKER_FILTERED_DATA_KEYS = deriveMarkerRecord(
  (marker) => marker.filteredDataKey,
);

function chooseMarker<TRow extends MarkerRow>(
  markers: readonly MarkerDef<TRow>[],
  row: TRow,
): MarkerId | null {
  const matches = markers
    .filter((marker) => marker.match(row))
    .sort((a, b) => b.precedence - a.precedence);
  const first = matches[0];
  if (!first) return null;
  if (matches[1]?.precedence === first.precedence) {
    throw new Error(
      `Marker precedence tie for ${first.source}: ${first.id} and ${matches[1].id}`,
    );
  }
  return first.id as MarkerId;
}

const allMarkers = Object.values(
  markerRegistry,
) as unknown as readonly MarkerDef<MarkerRow>[];

export function resolveMarker(row: MarkerRow): MarkerId | null {
  return chooseMarker(allMarkers, row);
}
