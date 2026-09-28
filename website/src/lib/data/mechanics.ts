/**
 * The game-mechanics reference pages, grouped by the categories of the in-game
 * Adventurer's Guide. The home page index and the /mechanics hub both render
 * this list, so a page registered here appears in both.
 */
export interface MechanicsPage {
  readonly title: string;
  readonly href: string;
  readonly description: string;
}

export interface MechanicsGroup {
  readonly title: string;
  readonly pages: readonly MechanicsPage[];
}

export const MECHANICS_GROUPS = [
  {
    title: "Combat & progression",
    pages: [
      {
        title: "Character Build",
        href: "/mechanics/character",
        description: "Attributes, resources, skills, and specializations",
      },
      {
        title: "Combat",
        href: "/mechanics/combat",
        description: "Targeting, damage formulas, mitigation, and effects",
      },
      {
        title: "Experience",
        href: "/mechanics/experience",
        description: "Level costs, veteran points, and every XP source",
      },
      {
        title: "Death & Remains",
        href: "/mechanics/death",
        description: "What death costs, remains, and resurrection",
      },
      {
        title: "Bard Songs & Charm",
        href: "/mechanics/bard",
        description: "Song slots, auras, and charming a monster",
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
      },
      {
        title: "Mercenary Stats",
        href: "/mechanics/mercenary-stats",
        description: "Stat ranges per class and race, plus hiring odds",
      },
    ],
  },
  {
    title: "Equipment & economy",
    pages: [
      {
        title: "Inventory",
        href: "/mechanics/inventory",
        description: "Storage, durability, armor sets, and merchants",
      },
      {
        title: "Crafting & Augments",
        href: "/mechanics/crafting",
        description: "Craft Stations, recipes, and attaching augments",
      },
      {
        title: "Housing & Appearance",
        href: "/mechanics/housing",
        description: "Furniture, wardrobe, and barbers",
      },
    ],
  },
  {
    title: "Party & community",
    pages: [
      {
        title: "Party & Loot",
        href: "/mechanics/party",
        description: "Party places, shared rewards, and loot rolls",
      },
      {
        title: "Guilds",
        href: "/mechanics/guilds",
        description: "Membership, invitations, and guild points",
      },
    ],
  },
  {
    title: "World & adventures",
    pages: [
      {
        title: "World & Travel",
        href: "/mechanics/world",
        description:
          "Game modes, seasonal events, binding, travel, and portals",
      },
      {
        title: "Monster Spawns",
        href: "/mechanics/monster-spawns",
        description: "Respawn timers, rare spawns, and missing bosses",
      },
      {
        title: "Reputation",
        href: "/mechanics/reputation",
        description: "Faction standing, the tier ladder, and every source",
      },
    ],
  },
] as const satisfies readonly MechanicsGroup[];

export type MechanicsHref =
  (typeof MECHANICS_GROUPS)[number]["pages"][number]["href"];
