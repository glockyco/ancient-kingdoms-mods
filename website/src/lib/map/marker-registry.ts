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
import {
  NPC_ROLE_BITS,
  type AltarMapEntity,
  type AnyMapEntity,
  type ChestMapEntity,
  type CraftingMapEntity,
  type GatheringMapEntity,
  type HouseMapEntity,
  type MonsterMapEntity,
  type NpcMapEntity,
  type PortalMapEntity,
  type TrapMapEntity,
  type TreasureMapEntity,
} from "$lib/types/map";

export type MarkerSource =
  "monsters" | "npcs" | "portals" | "interactables" | "resources";
export type MarkerRow = AnyMapEntity;
export type RGB = readonly [number, number, number];

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
  label: string;
  mask: number;
  matches: (row: TRow) => boolean;
}

export interface MarkerDef<TRow extends MarkerRow = MarkerRow> {
  id: string;
  source: MarkerSource;
  /** Partition precedence is distinct from paint order. Source rows can overlap. */
  precedence: number;
  match: (row: TRow) => boolean;
  label: string;
  pluralLabel: string;
  color: RGB;
  icon: IconNode;
  iconSize: { base: number; min: number; max: number };
  fallbackRadius: number;
  borderClass: string;
  selection: SelectionStrategy<TRow>;
  defaultVisible: boolean;
  z: number;
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
    z: 500,
  },
  fabled: {
    borderClass: "border-l-emerald-500",
    iconSize: { base: 28, min: 26, max: 60 },
    fallbackRadius: 7,
    precedence: 500,
    z: 400,
  },
  elites: {
    borderClass: "border-l-purple-500",
    iconSize: { base: 26, min: 24, max: 56 },
    fallbackRadius: 6,
    precedence: 300,
    z: 300,
  },
  hunts: {
    borderClass: "border-l-yellow-500",
    iconSize: { base: 18, min: 16, max: 40 },
    fallbackRadius: 4,
    precedence: 200,
    z: 200,
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
  source: "monsters",
  precedence,
  match,
  label,
  pluralLabel,
  color,
  icon,
  iconSize: MONSTER_PRESENTATION[id].iconSize,
  fallbackRadius: MONSTER_PRESENTATION[id].fallbackRadius,
  borderClass: MONSTER_PRESENTATION[id].borderClass,
  selection,
  defaultVisible: id === "bosses" || id === "fabled" || id === "elites",
  z: MONSTER_PRESENTATION[id].z,
  decorations: monsterDecorations,
});

const npcFacets: FacetDef<NpcMapEntity>[] = Object.entries(NPC_ROLE_BITS).map(
  ([id, bit]) => ({
    id,
    label: id
      .replace(/^is/, "")
      .replace(/[A-Z]/g, (letter) => ` ${letter}`)
      .trim(),
    mask: 1 << bit,
    matches: (row) => (row.roleBitmask & (1 << bit)) !== 0,
  }),
);

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
  source: MarkerSource;
  label: string;
  pluralLabel: string;
  color: RGB;
  icon: IconNode;
  fallbackRadius: number;
  borderClass: string;
  iconSize?: { base: number; min: number; max: number };
  defaultVisible?: boolean;
  z: number;
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
  fallbackRadius,
  borderClass,
  iconSize = { base: 20, min: 18, max: 44 },
  defaultVisible = false,
  z,
  match,
  selection = {
    kind: "by-field",
    field: (row: TRow) => row.id,
  },
}: SimpleMarkerOptions<TRow>): MarkerDef<TRow> => ({
  id,
  source,
  precedence: 100,
  match,
  label,
  pluralLabel,
  color,
  icon,
  iconSize,
  fallbackRadius,
  borderClass,
  selection,
  defaultVisible,
  z,
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
    source: "npcs",
    precedence: 100,
    match: () => true,
    label: "NPC",
    pluralLabel: "NPCs",
    color: [96, 165, 250],
    icon: User,
    iconSize: { base: 18, min: 16, max: 40 },
    fallbackRadius: 5,
    borderClass: "border-l-blue-500",
    selection: {
      kind: "by-field",
      field: (row: NpcMapEntity) => row.id,
    },
    defaultVisible: false,
    z: 600,
    facets: npcFacets,
    decorations: npcDecorations,
  } satisfies MarkerDef<NpcMapEntity>,
  portals: {
    id: "portals",
    source: "portals",
    precedence: 100,
    match: (row: PortalMapEntity) => row.destination !== null,
    label: "Portal",
    pluralLabel: "Portals",
    color: [34, 197, 94],
    icon: CircleDot,
    iconSize: { base: 22, min: 20, max: 48 },
    fallbackRadius: 6,
    borderClass: "border-l-green-500",
    selection: {
      kind: "by-field",
      field: (row: PortalMapEntity) => row.id,
    },
    defaultVisible: false,
    z: 700,
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
    source: "interactables",
    label: "Chest",
    pluralLabel: "Chests",
    color: [14, 165, 233],
    icon: Box,
    fallbackRadius: 5,
    borderClass: "border-l-sky-500",
    z: 800,
    match: (row) => row.type === "chest",
  }),
  treasure: simpleMarker<TreasureMapEntity>({
    id: "treasure",
    source: "interactables",
    label: "Treasure",
    pluralLabel: "Treasure",
    color: [20, 184, 166],
    icon: Shovel,
    fallbackRadius: 5,
    borderClass: "border-l-teal-500",
    z: 810,
    match: (row) => row.type === "treasure",
  }),
  altars: simpleMarker<AltarMapEntity>({
    id: "altars",
    source: "interactables",
    label: "Altar",
    pluralLabel: "Altars",
    color: [249, 115, 22],
    icon: Flame,
    fallbackRadius: 7,
    borderClass: "border-l-orange-500",
    defaultVisible: true,
    z: 820,
    match: (row) => row.type === "altar",
  }),
  traps: simpleMarker<TrapMapEntity>({
    id: "traps",
    source: "interactables",
    label: "Trap",
    pluralLabel: "Traps",
    color: [225, 29, 72],
    icon: TriangleAlert,
    fallbackRadius: 5,
    borderClass: "border-l-rose-600",
    defaultVisible: true,
    z: 830,
    match: (row) => row.type === "trap",
  }),
  houses: simpleMarker<HouseMapEntity>({
    id: "houses",
    source: "interactables",
    label: "House",
    pluralLabel: "Houses",
    color: [245, 158, 11],
    icon: Home,
    fallbackRadius: 6,
    borderClass: "border-l-amber-500",
    z: 840,
    match: (row) => row.type === "house",
  }),
  gatheringPlants: simpleMarker<GatheringMapEntity>({
    id: "gatheringPlants",
    source: "resources",
    label: "Plant",
    pluralLabel: "Plants",
    color: [132, 204, 22],
    icon: Leaf,
    fallbackRadius: 3,
    borderClass: "border-l-lime-500",
    z: 900,
    match: (row) => row.type === "gathering_plant",
  }),
  gatheringMinerals: simpleMarker<GatheringMapEntity>({
    id: "gatheringMinerals",
    source: "resources",
    label: "Mineral",
    pluralLabel: "Minerals",
    color: [23, 37, 84],
    icon: Pickaxe,
    fallbackRadius: 3,
    borderClass: "border-l-blue-950",
    z: 910,
    match: (row) => row.type === "gathering_mineral",
  }),
  gatheringSparks: simpleMarker<GatheringMapEntity>({
    id: "gatheringSparks",
    source: "resources",
    label: "Spark",
    pluralLabel: "Sparks",
    color: [168, 85, 247],
    icon: Sparkles,
    fallbackRadius: 3,
    borderClass: "border-l-purple-500",
    z: 920,
    match: (row) => row.type === "gathering_spark",
  }),
  gatheringFishing: simpleMarker<GatheringMapEntity>({
    id: "gatheringFishing",
    source: "resources",
    label: "Fishing Spot",
    pluralLabel: "Fishing Spots",
    color: [6, 182, 212],
    icon: Fish,
    fallbackRadius: 3,
    borderClass: "border-l-cyan-500",
    z: 930,
    match: (row) => row.type === "gathering_fish",
    selection: {
      kind: "by-field",
      field: (row) => row.selectionGroupId,
    },
  }),
  gatheringOther: simpleMarker<GatheringMapEntity>({
    id: "gatheringOther",
    source: "resources",
    label: "Resource",
    pluralLabel: "Resources",
    color: [156, 163, 175],
    icon: Package,
    fallbackRadius: 3,
    borderClass: "border-l-gray-400",
    z: 940,
    match: (row) => row.type === "gathering_other",
  }),
  alchemyTables: simpleMarker<CraftingMapEntity>({
    id: "alchemyTables",
    source: "interactables",
    label: "Alchemy Table",
    pluralLabel: "Alchemy Tables",
    color: [139, 92, 246],
    icon: FlaskConical,
    fallbackRadius: 5,
    borderClass: "border-l-violet-500",
    z: 1000,
    match: (row) => row.type === "alchemy_table",
  }),
  forges: simpleMarker<CraftingMapEntity>({
    id: "forges",
    source: "interactables",
    label: "Forge",
    pluralLabel: "Forges",
    color: [139, 92, 246],
    icon: Hammer,
    fallbackRadius: 5,
    borderClass: "border-l-violet-500",
    z: 1010,
    match: (row) => row.type === "crafting_station" && !row.isCookingOven,
  }),
  cookingOvens: simpleMarker<CraftingMapEntity>({
    id: "cookingOvens",
    source: "interactables",
    label: "Cooking Oven",
    pluralLabel: "Cooking Ovens",
    color: [139, 92, 246],
    icon: ChefHat,
    fallbackRadius: 5,
    borderClass: "border-l-violet-500",
    z: 1020,
    match: (row) => row.type === "crafting_station" && row.isCookingOven,
  }),
  scribingTables: simpleMarker<CraftingMapEntity>({
    id: "scribingTables",
    source: "interactables",
    label: "Scribing Table",
    pluralLabel: "Scribing Tables",
    color: [168, 85, 247],
    icon: Scroll,
    fallbackRadius: 5,
    borderClass: "border-l-purple-500",
    z: 1030,
    match: (row) => row.type === "scribing_table",
  }),
} as const satisfies Record<string, AnyMarkerDef>;

export type MarkerId = keyof typeof markerRegistry;

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

const monsterMarkers: readonly MarkerDef<MonsterMapEntity>[] = [
  markerRegistry.creatures,
  markerRegistry.hunts,
  markerRegistry.elites,
  markerRegistry.fabled,
  markerRegistry.bosses,
];

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

export function resolveMarker(row: MarkerRow): MarkerId | null {
  switch (row.type) {
    case "npc":
      return chooseMarker([markerRegistry.npc], row);
    case "portal":
      return chooseMarker([markerRegistry.portals], row);
    case "chest":
      return chooseMarker([markerRegistry.chests], row);
    case "treasure":
      return chooseMarker([markerRegistry.treasure], row);
    case "altar":
      return chooseMarker([markerRegistry.altars], row);
    case "trap":
      return chooseMarker([markerRegistry.traps], row);
    case "house":
      return chooseMarker([markerRegistry.houses], row);
    case "gathering_plant":
      return chooseMarker([markerRegistry.gatheringPlants], row);
    case "gathering_mineral":
      return chooseMarker([markerRegistry.gatheringMinerals], row);
    case "gathering_spark":
      return chooseMarker([markerRegistry.gatheringSparks], row);
    case "gathering_fish":
      return chooseMarker([markerRegistry.gatheringFishing], row);
    case "gathering_other":
      return chooseMarker([markerRegistry.gatheringOther], row);
    case "alchemy_table":
      return chooseMarker([markerRegistry.alchemyTables], row);
    case "crafting_station":
      return chooseMarker(
        [markerRegistry.forges, markerRegistry.cookingOvens],
        row,
      );
    case "scribing_table":
      return chooseMarker([markerRegistry.scribingTables], row);
    default:
      return chooseMarker(monsterMarkers, row);
  }
}
