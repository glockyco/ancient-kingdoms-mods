import {
  BookOpen,
  Box,
  Cat,
  CircleDot,
  FlaskConical,
  Flame,
  Hammer,
  Home,
  Leaf,
  Mountain,
  Package,
  Pickaxe,
  ScrollText,
  Shield,
  Skull,
  Sparkles,
  Star,
  Swords,
  Trophy,
  TriangleAlert,
  Users,
  type IconNode,
} from "lucide";
import { achievementAnchor } from "$lib/data/achievements/relationships";
import manifest from "./entity-manifest.json";

export type EntityImageKind = "icon" | "primary" | "thumbnail" | "treasure_map";

type ManifestEntry = {
  readonly id: string;
  readonly label: string;
  readonly pluralLabel: string;
  readonly order: number;
  readonly overviewHref: string;
  readonly detailPrefix: string | null;
  readonly table: string | null;
  readonly searchable: boolean;
  readonly imageDomain: string | null;
  readonly imageKind: EntityImageKind | null;
  readonly sitemap: boolean;
};

const entries = manifest as readonly ManifestEntry[];

export type EntityId = (typeof entries)[number]["id"];

export interface EntityDef {
  readonly id: EntityId;
  readonly label: string;
  readonly pluralLabel: string;
  readonly icon: IconNode;
  readonly overviewHref: string;
  readonly detailHref: (id: string) => string;
  readonly order: number;
  readonly searchable: boolean;
  readonly sourceTable: string | null;
  readonly imageDomain: string | null;
  readonly imageKind: EntityImageKind | null;
}

const ICONS: Record<EntityId, IconNode> = {
  item: Package,
  monster: Skull,
  npc: Users,
  zone: Mountain,
  quest: ScrollText,
  chest: Box,
  gathering_resource: Leaf,
  skill: Sparkles,
  class: Star,
  altar: Flame,
  faction: Shield,
  recipe: FlaskConical,
  mercenary: Swords,
  summon: Cat,
  achievement: Trophy,
  profession: Hammer,
  trap: TriangleAlert,
  portal: CircleDot,
  treasure: Pickaxe,
  house: Home,
  crafting_station: Hammer,
  alchemy_table: FlaskConical,
  scribing_table: BookOpen,
};

function hrefFor(entry: ManifestEntry, id: string): string {
  if (entry.id === "achievement") {
    return `${entry.overviewHref}#${achievementAnchor(id)}`;
  }
  if (!entry.detailPrefix || entry.detailPrefix === "/map") {
    return entry.overviewHref;
  }
  return `${entry.detailPrefix}/${encodeURIComponent(id)}`;
}

export const entityRegistry = Object.fromEntries(
  entries.map((entry) => [
    entry.id,
    {
      id: entry.id,
      label: entry.label,
      pluralLabel: entry.pluralLabel,
      icon: ICONS[entry.id],
      overviewHref: entry.overviewHref,
      detailHref: (id: string) => hrefFor(entry, id),
      order: entry.order,
      searchable: entry.searchable,
      sourceTable: entry.table,
      imageDomain: entry.imageDomain,
      imageKind: entry.imageKind,
    } satisfies EntityDef,
  ]),
) as { [K in EntityId]: EntityDef & { readonly id: K } };

export const entityIds = entries.map(
  (entry) => entry.id,
) as readonly EntityId[];

// Manifest searchability is runtime data; keep the compile-time id set broad so
// registry builders remain contextually typed while searchableEntities filters it.
export type SearchableEntityId = EntityId;

export const searchableEntities = entityIds
  .filter((id) => entityRegistry[id].searchable)
  .sort(
    (a, b) => entityRegistry[a].order - entityRegistry[b].order,
  ) as unknown as readonly SearchableEntityId[];

export const sitemapEntities = entries
  .filter((entry) => entry.sitemap)
  .map((entry) => ({
    table: entry.table,
    route: entry.overviewHref.slice(1),
  }))
  .filter((entry): entry is { table: string; route: string } =>
    Boolean(entry.table),
  );

export function getEntityDef(id: string): EntityDef | undefined {
  return entityRegistry[id as EntityId];
}

export function entityHref(entityType: string, id: string): string | null {
  return getEntityDef(entityType)?.detailHref(id) ?? null;
}

// Keep icons as IconNodes rather than Svelte components so this registry is safe
// in prerender and worker graphs.
