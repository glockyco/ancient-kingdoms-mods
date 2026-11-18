/**
 * The game-mechanics reference pages grouped into five menu columns.
 * The home page index, the site menu, and the /mechanics hub render this list,
 * so a page registered here appears in each.
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
  /** Position in the site menu among featured pages. Pages without one follow in hub order. */
  readonly menuRank?: number;
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
      },
      {
        title: "Virtues",
        href: "/mechanics/virtues",
        description:
          "Shrines, blessings, ranks, and how each virtue earns points",
        summary: "Blessings and ranks",
        featured: true,
        menuRank: 2,
      },
      {
        title: "Death and Remains",
        href: "/mechanics/death",
        description: "Death penalties, remains, and resurrection",
        summary: "Death costs and remains",
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
        featured: true,
        menuRank: 6,
      },
      {
        title: "Monster Spawns",
        href: "/mechanics/monster-spawns",
        description: "Respawn timers, rare spawns, and missing bosses",
        summary: "Respawns and rare spawns",
        featured: true,
        menuRank: 3,
      },
      {
        title: "Bard Songs and Charm",
        href: "/mechanics/bard",
        description: "Song slots, auras, Final Cadence, and charm",
        summary: "Songs and charming",
      },
      {
        title: "Chambers of Chaos",
        href: "/mechanics/chambers-of-chaos",
        description:
          "Entry, the three trials, enemy levels, rewards, and Augment Upgrade catalysts",
        summary: "Solo timed trials",
        featured: true,
        menuRank: 1,
      },
    ],
  },
  {
    title: "Allies",
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
        menuRank: 4,
      },
      {
        title: "Party and Loot",
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
    ],
  },
  {
    title: "World",
    pages: [
      {
        title: "World and Travel",
        href: "/mechanics/world",
        description: "Game modes, maps, binding, travel, and portals",
        summary: "Binding, travel, and portals",
      },
      {
        title: "Reputation",
        href: "/mechanics/reputation",
        description: "Faction standing, reputation tiers, sources, and unlocks",
        summary: "Faction standing",
        featured: true,
        menuRank: 5,
      },
      {
        title: "Regional Events",
        href: "/mechanics/regional-events",
        description:
          "Regional objectives, city invasions, rewards, and Prosperity",
        summary: "Invasions and Prosperity",
      },
      {
        title: "NPC Adventurers",
        href: "/mechanics/adventurers",
        description:
          "Where they roam, fighting beside them, and the Wandering Merchant",
        summary: "Roaming adventurers",
      },
      {
        title: "Seasonal Events",
        href: "/mechanics/seasonal-events",
        description:
          "Halloween and the Winter Festival: dates, Double XP, and seasonal shops",
        summary: "Halloween and Winter Festival",
      },
    ],
  },
  {
    title: "Items & Home",
    pages: [
      {
        title: "Inventory",
        href: "/mechanics/inventory",
        description: "Storage, durability, armor sets, and merchants",
        summary: "Storage and durability",
      },
      {
        title: "Crafting and Augments",
        href: "/mechanics/crafting",
        description:
          "Craft Stations, recipes, the Crafting journal, and augments",
        summary: "Stations and augments",
      },
      {
        title: "Housing and Appearance",
        href: "/mechanics/housing",
        description: "Return Home, furniture, wardrobe, and barbers",
        summary: "Furniture and wardrobe",
      },
    ],
  },
] as const satisfies readonly MechanicsGroup[];

export type MechanicsHref =
  (typeof MECHANICS_GROUPS)[number]["pages"][number]["href"];
