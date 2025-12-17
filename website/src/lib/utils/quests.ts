/**
 * Quest type and flag configuration for display throughout the site.
 */

/** Quest display type (derived from quest_type in denormalization) */
export type QuestDisplayType =
  | "Kill"
  | "Gather"
  | "Deliver"
  | "Have"
  | "Find"
  | "Discover"
  | "Equip"
  | "Brew";

/** Quest flag type */
export type QuestFlag = "main" | "epic" | "daily" | "repeatable";

export interface QuestTypeConfig {
  /** Display type value */
  type: QuestDisplayType;
  /** Icon color class */
  iconColor: string;
}

export interface QuestFlagConfig {
  /** Flag key */
  key: QuestFlag;
  /** Display label */
  label: string;
  /** Icon color class */
  iconColor: string;
}

/**
 * Configuration for each quest display type.
 * Icons are rendered in components using Lucide icons.
 */
export const QUEST_TYPE_CONFIG: Record<QuestDisplayType, QuestTypeConfig> = {
  Kill: { type: "Kill", iconColor: "text-red-500" },
  Gather: { type: "Gather", iconColor: "text-green-500" },
  Deliver: { type: "Deliver", iconColor: "text-amber-500" },
  Have: { type: "Have", iconColor: "text-green-500" },
  Find: { type: "Find", iconColor: "text-blue-500" },
  Discover: { type: "Discover", iconColor: "text-indigo-500" },
  Equip: { type: "Equip", iconColor: "text-purple-500" },
  Brew: { type: "Brew", iconColor: "text-cyan-500" },
};

/**
 * Configuration for each quest flag.
 * Order determines display order in badges.
 */
export const QUEST_FLAG_CONFIG: QuestFlagConfig[] = [
  { key: "main", label: "Main", iconColor: "text-yellow-500" },
  { key: "epic", label: "Epic", iconColor: "text-purple-500" },
  { key: "daily", label: "Daily", iconColor: "text-orange-500" },
  { key: "repeatable", label: "Repeatable", iconColor: "text-green-500" },
];

/**
 * Get the type config for a display type.
 */
export function getQuestTypeConfig(
  displayType: string,
): QuestTypeConfig | undefined {
  return QUEST_TYPE_CONFIG[displayType as QuestDisplayType];
}

/**
 * Get active quest flags from quest data.
 */
export function getActiveQuestFlags(quest: {
  is_main_quest: boolean;
  is_epic_quest: boolean;
  is_adventurer_quest: boolean;
  is_repeatable: boolean;
}): QuestFlagConfig[] {
  const flags: QuestFlagConfig[] = [];
  if (quest.is_main_quest) {
    const config = QUEST_FLAG_CONFIG.find((f) => f.key === "main");
    if (config) flags.push(config);
  }
  if (quest.is_epic_quest) {
    const config = QUEST_FLAG_CONFIG.find((f) => f.key === "epic");
    if (config) flags.push(config);
  }
  if (quest.is_adventurer_quest) {
    const config = QUEST_FLAG_CONFIG.find((f) => f.key === "daily");
    if (config) flags.push(config);
  }
  if (quest.is_repeatable) {
    const config = QUEST_FLAG_CONFIG.find((f) => f.key === "repeatable");
    if (config) flags.push(config);
  }
  return flags;
}

/**
 * Get flag config by key.
 */
export function getQuestFlagConfig(key: string): QuestFlagConfig | undefined {
  return QUEST_FLAG_CONFIG.find((config) => config.key === key);
}

/**
 * Get flag label by key.
 */
export function getQuestFlagLabel(key: string): string {
  return getQuestFlagConfig(key)?.label ?? key;
}
