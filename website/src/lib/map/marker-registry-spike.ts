import {
  CircleDot,
  Crown,
  Crosshair,
  Shield,
  Star,
  Sword,
  User,
  type IconNode,
} from "lucide";
import {
  NPC_ROLE_BITS,
  type MonsterMapEntity,
  type NpcMapEntity,
  type PortalMapEntity,
} from "$lib/types/map";

export type MarkerSource = "monsters" | "npcs" | "portals";
export type MarkerRow = MonsterMapEntity | NpcMapEntity | PortalMapEntity;
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

const monsterMarker = (
  id: "creature" | "boss" | "fabled" | "elite" | "hunt",
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
  iconSize: { base: 32, min: 18, max: 48 },
  fallbackRadius: 10,
  selection,
  defaultVisible: id !== "creature",
  z: precedence,
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

/**
 * Spike-only portal contract. The current map row omits these two values even
 * though portals.from_sub_zone_id/to_sub_zone_id exist in the source schema.
 * The production loader must supply them before portal search/wayfinding can
 * promise sub-zone display names.
 */
export type PortalSpikeRow = PortalMapEntity & {
  fromSubZoneName: string | null;
  destinationSubZoneName: string | null;
};

export const markerRegistrySpike = {
  creature: monsterMarker(
    "creature",
    "Creature",
    "Creatures",
    100,
    (row) => !row.isBoss && !row.isFabled && !row.isElite && !row.isHunt,
    Sword,
    [120, 160, 180],
    altarSelection,
  ),
  hunt: monsterMarker(
    "hunt",
    "Hunt",
    "Hunts",
    200,
    (row) => row.isHunt,
    Crosshair,
    [244, 114, 182],
  ),
  elite: monsterMarker(
    "elite",
    "Elite",
    "Elites",
    300,
    (row) => row.isElite,
    Shield,
    [251, 191, 36],
  ),
  fabled: monsterMarker(
    "fabled",
    "Fabled",
    "Fabled",
    400,
    (row) => row.isFabled,
    Star,
    [192, 132, 252],
  ),
  boss: monsterMarker(
    "boss",
    "Boss",
    "Bosses",
    500,
    (row) => row.isBoss,
    Crown,
    [248, 113, 113],
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
    iconSize: { base: 32, min: 18, max: 48 },
    fallbackRadius: 10,
    selection: {
      kind: "by-field",
      field: (row: NpcMapEntity) => row.id,
    },
    defaultVisible: false,
    z: 600,
    facets: npcFacets,
    decorations: npcDecorations,
  } satisfies MarkerDef<NpcMapEntity>,
  portal: {
    id: "portal",
    source: "portals",
    precedence: 100,
    match: (row: PortalMapEntity) => row.destination !== null,
    label: "Portal",
    pluralLabel: "Portals",
    color: [45, 212, 191],
    icon: CircleDot,
    iconSize: { base: 32, min: 18, max: 48 },
    fallbackRadius: 10,
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
    displayName: (row: PortalSpikeRow) =>
      `${row.fromSubZoneName ?? "Unknown source"} → ${row.destinationSubZoneName ?? "Unknown destination"}`,
  } satisfies MarkerDef<PortalSpikeRow>,
} as const satisfies Record<string, MarkerDef<never>>;

export type MarkerId = keyof typeof markerRegistrySpike;

export function resolveMarker(row: MarkerRow): MarkerId | null {
  const matches = Object.values(markerRegistrySpike)
    .filter(
      (marker) =>
        marker.source === sourceForRow(row) && marker.match(row as never),
    )
    .sort((a, b) => b.precedence - a.precedence);
  return (matches[0]?.id as MarkerId | undefined) ?? null;
}

function sourceForRow(row: MarkerRow): MarkerSource {
  switch (row.type) {
    case "npc":
      return "npcs";
    case "portal":
      return "portals";
    default:
      return "monsters";
  }
}
