import { Map as MapGlyph, type IconNode } from "lucide";
import { entityRegistry, type EntityId } from "$lib/entities/registry";
import { MECHANICS_GROUPS, type MechanicsPage } from "$lib/data/mechanics";

/** A destination. The Browse panel shows `description` as the entry's second line. */
export interface NavigationLink {
  readonly label: string;
  readonly href: string;
  readonly description?: string;
  readonly icon?: IconNode;
}

/** A column of the Browse panel. `more` links the full list of a column that names only some pages. */
interface NavigationGroup {
  readonly id: string;
  readonly label: string;
  readonly links: readonly NavigationLink[];
  readonly more?: NavigationLink;
}

const MAP: NavigationLink = {
  label: "Map",
  href: "/map",
  description: "Spawns and resources",
  icon: MapGlyph,
};

// The second line of each entry. It must fit one line of the panel's
// narrowest column, so every entry stays two lines tall. Labels and routes
// come from the entity registry so the menu cannot drift from its pages.
const DESCRIPTIONS: Partial<Record<EntityId, string>> = {
  zone: "Overworld and dungeons",
  monster: "Bosses, elites, and drops",
  npc: "Vendors and quest givers",
  quest: "Objectives and rewards",
  altar: "Altar events and waves",
  trap: "Hazards and their effects",
  item: "Gear and materials",
  recipe: "Materials and products",
  gathering_resource: "Plants and ore",
  chest: "Containers and their loot",
  class: "Roles and skill trees",
  skill: "What each skill does",
  profession: "Gathering and crafting",
  mercenary: "Companions you can hire",
  summon: "Summons and pet whistles",
  faction: "Standing and vendors",
  achievement: "Steam achievements",
};

function entity(id: EntityId): NavigationLink {
  const def = entityRegistry[id];
  return {
    label: id === "recipe" ? "Recipes" : def.pluralLabel,
    href: def.overviewHref,
    description: DESCRIPTIONS[id],
    icon: def.icon,
  };
}

/** The most visited destinations, in the order readers use them, shown directly in the bar. */
export const PRIMARY_LINKS: readonly NavigationLink[] = [
  MAP,
  entity("item"),
  entity("monster"),
  entity("recipe"),
  entity("class"),
];

const mechanicsPages: readonly MechanicsPage[] = MECHANICS_GROUPS.flatMap(
  (group): readonly MechanicsPage[] => group.pages,
);

// The featured mechanics pages in the order of the /mechanics hub, which keeps
// related pages together. A page whose route another column already names,
// such as the mercenary overview, is not listed twice.
const mechanicsLinks: NavigationLink[] = mechanicsPages
  .filter(
    (page) =>
      page.featured &&
      !Object.values(entityRegistry).some(
        (def) => def.overviewHref === page.href.split("#")[0],
      ),
  )
  .map((page) => ({
    label: page.title,
    href: page.href,
    description: page.summary,
  }));

/**
 * The columns of the Browse panel. Together they name every overview page,
 * six to a column so the columns end level.
 */
export const BROWSE_GROUPS: readonly NavigationGroup[] = [
  {
    id: "world",
    label: "World",
    links: [
      MAP,
      entity("zone"),
      entity("monster"),
      entity("npc"),
      entity("quest"),
      entity("faction"),
    ],
  },
  {
    id: "loot",
    label: "Loot & Crafting",
    links: [
      entity("item"),
      entity("recipe"),
      entity("gathering_resource"),
      entity("chest"),
      entity("altar"),
      entity("trap"),
    ],
  },
  {
    id: "character",
    label: "Character",
    links: [
      entity("class"),
      entity("skill"),
      entity("profession"),
      entity("mercenary"),
      entity("summon"),
      entity("achievement"),
    ],
  },
  {
    id: "mechanics",
    label: "Mechanics",
    links: mechanicsLinks,
    more: {
      label: `All ${mechanicsPages.length} mechanics`,
      href: "/mechanics",
    },
  },
];
