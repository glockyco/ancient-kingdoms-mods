/**
 * The game-mechanics reference pages in five groups of three, so every
 * column of the home page index ends level. The home page index, the site menu, and the /mechanics hub all
 * render this list, so a page registered here appears in each.
 */
export interface MechanicsPage {
  readonly title: string;
  readonly href: string;
  readonly description: string;
  /** One short line for the site menu and the home page, where space is tight. */
  readonly summary: string;
  /**
   * Named in the site menu. Reserved for pages built around interactive or
   * visual content (charts, calculators, comparison tables), which show the
   * compendium at its best; the menu lists them in this file's order.
   */
  readonly featured?: true;
}

export interface MechanicsGroup {
  readonly title: string;
  readonly pages: readonly MechanicsPage[];
}

export const MECHANICS_GROUPS = [
  {
    title: "Character",
    pages: [
      {
        title: "Character Build",
        href: "/mechanics/character",
        description:
          "Attributes, resources, skills, specializations, and macros",
        summary: "Attributes and skills",
      },
      {
        title: "Experience",
        href: "/mechanics/experience",
        description:
          "XP needed to level up, level rewards, total veteran points, and XP sources",
        summary: "Levels and XP sources",
        featured: true,
      },
      {
        title: "Housing & Appearance",
        href: "/mechanics/housing",
        description: "Furniture, wardrobe, and barbers",
        summary: "Furniture and wardrobe",
      },
    ],
  },
  {
    title: "Combat",
    pages: [
      {
        title: "Combat",
        href: "/mechanics/combat",
        description: "Targeting, damage formulas, mitigation, and effects",
        summary: "Damage and mitigation",
      },
      {
        title: "Death & Remains",
        href: "/mechanics/death",
        description: "Death penalties, remains, and resurrection",
        summary: "Death costs and remains",
      },
      {
        title: "Monster Spawns",
        href: "/mechanics/monster-spawns",
        description: "Respawn timers, rare spawns, and missing bosses",
        summary: "Respawns and rare spawns",
        featured: true,
      },
    ],
  },
  {
    title: "Companions",
    pages: [
      {
        title: "Mercenaries",
        href: "/mercenaries#how-it-works",
        description: "Roster, commands, equipment, and auto-consume",
        summary: "Roster and commands",
        featured: true,
      },
      {
        title: "Mercenary Stats",
        href: "/mechanics/mercenary-stats",
        description: "Stat ranges per class and race, and hiring odds",
        summary: "Stats and hiring odds",
        featured: true,
      },
      {
        title: "Bard Songs & Charm",
        href: "/mechanics/bard",
        description: "Song slots, auras, Final Cadence, and charm",
        summary: "Songs and charming",
      },
    ],
  },
  {
    title: "Party & society",
    pages: [
      {
        title: "Party & Loot",
        href: "/mechanics/party",
        description: "Party size, shared rewards, and loot rolls",
        summary: "Shared rewards and rolls",
      },
      {
        title: "Guilds",
        href: "/mechanics/guilds",
        description: "Membership, invitations, and guild points",
        summary: "Membership and points",
      },
      {
        title: "Reputation",
        href: "/mechanics/reputation",
        description: "Faction standing, reputation tiers, sources, and unlocks",
        summary: "Faction standing",
        featured: true,
      },
    ],
  },
  {
    title: "World & economy",
    pages: [
      {
        title: "World & Travel",
        href: "/mechanics/world",
        description: "Game modes, maps, binding, travel, and portals",
        summary: "Binding, travel, and portals",
      },
      {
        title: "Inventory",
        href: "/mechanics/inventory",
        description: "Storage, durability, armor sets, and merchants",
        summary: "Storage and durability",
        featured: true,
      },
      {
        title: "Crafting & Augments",
        href: "/mechanics/crafting",
        description:
          "Craft Stations, recipes, the Crafting journal, and augments",
        summary: "Stations and augments",
      },
    ],
  },
] as const satisfies readonly MechanicsGroup[];

export type MechanicsHref =
  (typeof MECHANICS_GROUPS)[number]["pages"][number]["href"];
