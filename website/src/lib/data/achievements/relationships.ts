export type AchievementRelationshipKind =
  "profession" | "quest" | "monster" | "item" | "altar" | "mechanic";

export interface AchievementRelationship {
  kind: AchievementRelationshipKind;
  label: string;
  href: string;
}

export function achievementAnchor(id: string): string {
  return id.toLowerCase().replaceAll("_", "-");
}

const professionLinks: Record<string, AchievementRelationship> = {
  ALCHEMY_MASTER: {
    kind: "profession",
    label: "Alchemy",
    href: "/professions/alchemy",
  },
  COOKING_MASTER: {
    kind: "profession",
    label: "Cooking",
    href: "/professions/cooking",
  },
  FORAGING_MASTER: {
    kind: "profession",
    label: "Herbalism",
    href: "/professions/herbalism",
  },
  MINING_MASTER: {
    kind: "profession",
    label: "Mining",
    href: "/professions/mining",
  },
  ADVENTURING_MASTER: {
    kind: "profession",
    label: "Adventuring",
    href: "/professions/adventuring",
  },
  LOREKEEPING_MASTER: {
    kind: "profession",
    label: "Lore Keeping",
    href: "/professions/lore_keeping",
  },
  EXPLORING_MASTER: {
    kind: "profession",
    label: "Exploring",
    href: "/professions/exploring",
  },
  SLAYER_MASTER: {
    kind: "profession",
    label: "Slayer",
    href: "/professions/slayer",
  },
  TREASURE_HUNTER_MASTER: {
    kind: "profession",
    label: "Treasure Hunter",
    href: "/professions/treasure_hunter",
  },
  RADIANT_SEEKER_MASTER: {
    kind: "profession",
    label: "Radiant Seeker",
    href: "/professions/radiant_seeker",
  },
  HUNTER_MASTER: {
    kind: "profession",
    label: "Hunter",
    href: "/professions/hunter",
  },
  SCROLL_MASTERY_MASTER: {
    kind: "profession",
    label: "Scroll Mastery",
    href: "/professions/scroll_mastery",
  },
  FISHER_MASTER: {
    kind: "profession",
    label: "Fishing",
    href: "/professions/fishing",
  },
};

// Source: server-scripts/Player.cs:10811-10823 — these quest names unlock the two achievement IDs.
const questLinks: Record<string, AchievementRelationship> = {
  PLANESWALKER: {
    kind: "quest",
    label: "Ascension",
    href: "/quests/40_ascension",
  },
  ACCESS_TEMPLE_VALAARK: {
    kind: "quest",
    label: "Path of Scales",
    href: "/quests/path_of_scales",
  },
};

// Source: server-scripts/Player.cs:11049-11078 — each monster name maps directly to one achievement ID.
const monsterLinks: Record<string, AchievementRelationship> = {
  KILL_BLACK_DRAGON: {
    kind: "monster",
    label: "Nyxarion",
    href: "/monsters/nyxarion",
  },
  KILL_ANCIENT_CYCLOPS: {
    kind: "monster",
    label: "Ancient Cyclops",
    href: "/monsters/ancient_cyclops",
  },
  KILL_PYROTH: {
    kind: "monster",
    label: "Pyroth",
    href: "/monsters/pyroth",
  },
  KILL_SPIRIT_FOREST: {
    kind: "monster",
    label: "Spirit of the Forest",
    href: "/monsters/spirit_of_the_forest",
  },
  KILL_ORC_UNTAMED: {
    kind: "monster",
    label: "Urzak the Untamed",
    href: "/monsters/urzak_the_untamed",
  },
  KILL_AVATAR_WATER: {
    kind: "monster",
    label: "Avatar of Water",
    href: "/monsters/avatar_of_water",
  },
  KILL_ZAROTHAK: {
    kind: "monster",
    label: "Zarothak the Tormentor",
    href: "/monsters/zarothak_the_tormentor",
  },
  KILL_BLOOD_DRAGON: {
    kind: "monster",
    label: "Vaeltharos",
    href: "/monsters/vaeltharos",
  },
  KILL_KING_GIANTS: {
    kind: "monster",
    label: "King Thrym",
    href: "/monsters/king_thrym",
  },
};

export const achievementRelationships: Record<
  string,
  AchievementRelationship[]
> = {
  ...Object.fromEntries(
    Object.entries(professionLinks).map(([id, relationship]) => [
      id,
      [relationship],
    ]),
  ),
  ...Object.fromEntries(
    Object.entries(questLinks).map(([id, relationship]) => [
      id,
      [relationship],
    ]),
  ),
  ...Object.fromEntries(
    Object.entries(monsterLinks).map(([id, relationship]) => [
      id,
      [relationship],
    ]),
  ),
  // Source: server-scripts/DefaultEvent.cs:137-143 — completing a Forgotten Altar event unlocks RESTORED_ALTAR.
  RESTORED_ALTAR: [
    { kind: "altar", label: "Forgotten Altars", href: "/altars" },
  ],
  FIRST_STEPS: [
    {
      kind: "mechanic",
      label: "Levels and experience",
      href: "/mechanics/experience",
    },
  ],
  CHAMPION_RISE: [
    {
      kind: "mechanic",
      label: "Levels and experience",
      href: "/mechanics/experience",
    },
  ],
  TRUE_HERO: [
    {
      kind: "mechanic",
      label: "Levels and experience",
      href: "/mechanics/experience",
    },
  ],
  VETERAN_EDGE: [
    {
      kind: "mechanic",
      label: "Veteran experience",
      href: "/mechanics/experience#veteran-points",
    },
  ],
  COMPLETE_10_QUESTS: [{ kind: "quest", label: "Quests", href: "/quests" }],
  COMPLETE_20_QUESTS: [{ kind: "quest", label: "Quests", href: "/quests" }],
  COMPLETE_30_QUESTS: [{ kind: "quest", label: "Quests", href: "/quests" }],
  COMPLETE_50_QUESTS: [{ kind: "quest", label: "Quests", href: "/quests" }],
  TREASURE_HUNTER: [
    {
      kind: "profession",
      label: "Treasure Hunter",
      href: "/professions/treasure_hunter",
    },
  ],
  MAGIC_ITEM: [
    { kind: "item", label: "Magic items", href: "/items?items.quality=2" },
  ],
  EPIC_ITEM: [
    { kind: "item", label: "Epic items", href: "/items?items.quality=3" },
  ],
  LEGENDARY_ITEM: [
    {
      kind: "item",
      label: "Legendary items",
      href: "/items?items.quality=4",
    },
  ],
};
