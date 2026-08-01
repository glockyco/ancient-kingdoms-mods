export const achievementGroupOrder = [
  "progression",
  "quests",
  "combat",
  "professions",
  "exploration",
  "items",
] as const;

export type AchievementGroupId = (typeof achievementGroupOrder)[number];

export const achievementGroupDetails: Record<
  AchievementGroupId,
  { name: string; description: string }
> = {
  progression: {
    name: "Progression",
    description: "Character levels and the veteran system.",
  },
  quests: {
    name: "Quests",
    description: "Quest totals and named story quests.",
  },
  combat: {
    name: "Combat",
    description: "Named bosses and the world-boss milestone.",
  },
  professions: {
    name: "Professions",
    description:
      "Profession mastery, ordered by gathering, crafting, combat, and exploration.",
  },
  exploration: {
    name: "Exploration",
    description: "Treasures and Forgotten Altar events.",
  },
  items: {
    name: "Items",
    description: "The first magic, epic, and legendary item.",
  },
};

export const achievementOrder = [
  // Character progression
  "FIRST_STEPS",
  "CHAMPION_RISE",
  "TRUE_HERO",
  "VETERAN_EDGE",

  // Quest-count milestones, then the named quest chain
  "COMPLETE_10_QUESTS",
  "COMPLETE_20_QUESTS",
  "COMPLETE_30_QUESTS",
  "COMPLETE_50_QUESTS",
  "ACCESS_TEMPLE_VALAARK",
  "PLANESWALKER",

  // Boss completion rates provide a progression proxy. Rates are not displayed.
  "KILL_ZAROTHAK",
  "KILL_ANCIENT_CYCLOPS",
  "KILL_PYROTH",
  "KILL_BLACK_DRAGON",
  "KILL_SPIRIT_FOREST",
  "KILL_ORC_UNTAMED",
  "KILL_WORLD_BOSSES",
  "KILL_AVATAR_WATER",
  "KILL_KING_GIANTS",
  "KILL_BLOOD_DRAGON",

  // Profession taxonomy: gathering, crafting, combat, then exploration
  "FISHER_MASTER",
  "FORAGING_MASTER",
  "MINING_MASTER",
  "RADIANT_SEEKER_MASTER",
  "ALCHEMY_MASTER",
  "COOKING_MASTER",
  "SCROLL_MASTERY_MASTER",
  "ADVENTURING_MASTER",
  "HUNTER_MASTER",
  "SLAYER_MASTER",
  "EXPLORING_MASTER",
  "LOREKEEPING_MASTER",
  "TREASURE_HUNTER_MASTER",

  // Exploration events, then item-quality progression
  "RESTORED_ALTAR",
  "TREASURE_HUNTER",
  "MAGIC_ITEM",
  "EPIC_ITEM",
  "LEGENDARY_ITEM",
] as const;

export const achievementOrderIndex: Readonly<Record<string, number>> =
  Object.fromEntries(achievementOrder.map((id, index) => [id, index]));

export const achievementGroups: Record<string, AchievementGroupId> = {
  FIRST_STEPS: "progression",
  CHAMPION_RISE: "progression",
  TRUE_HERO: "progression",
  VETERAN_EDGE: "progression",
  COMPLETE_10_QUESTS: "quests",
  COMPLETE_20_QUESTS: "quests",
  COMPLETE_30_QUESTS: "quests",
  COMPLETE_50_QUESTS: "quests",
  PLANESWALKER: "quests",
  ACCESS_TEMPLE_VALAARK: "quests",
  KILL_BLACK_DRAGON: "combat",
  KILL_ANCIENT_CYCLOPS: "combat",
  KILL_PYROTH: "combat",
  KILL_SPIRIT_FOREST: "combat",
  KILL_ORC_UNTAMED: "combat",
  KILL_WORLD_BOSSES: "combat",
  KILL_AVATAR_WATER: "combat",
  KILL_ZAROTHAK: "combat",
  KILL_BLOOD_DRAGON: "combat",
  KILL_KING_GIANTS: "combat",
  ALCHEMY_MASTER: "professions",
  COOKING_MASTER: "professions",
  FORAGING_MASTER: "professions",
  MINING_MASTER: "professions",
  ADVENTURING_MASTER: "professions",
  LOREKEEPING_MASTER: "professions",
  EXPLORING_MASTER: "professions",
  SLAYER_MASTER: "professions",
  TREASURE_HUNTER_MASTER: "professions",
  RADIANT_SEEKER_MASTER: "professions",
  HUNTER_MASTER: "professions",
  SCROLL_MASTERY_MASTER: "professions",
  FISHER_MASTER: "professions",
  TREASURE_HUNTER: "exploration",
  RESTORED_ALTAR: "exploration",
  MAGIC_ITEM: "items",
  EPIC_ITEM: "items",
  LEGENDARY_ITEM: "items",
};
