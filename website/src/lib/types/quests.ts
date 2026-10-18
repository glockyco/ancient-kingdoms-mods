import type { MethodView, RequirementRoot } from "$lib/acquisition/types";
import type { DisplayItems } from "$lib/components/acquisition/display";

// Quest reward item
export interface QuestRewardItem {
  item_id: string;
  item_name: string;
  class_specific: string | null;
  tooltip_html: string | null;
  amount: number;
}

// Quest rewards container
export interface QuestRewards {
  gold: number;
  exp: number;
  items: QuestRewardItem[];
}

// Faction requirement
export interface QuestFactionRequirement {
  faction: string;
  faction_value: number;
  tier_name: string | null;
}

// Related quest in a chain
export interface QuestChainQuest {
  id: string;
  name: string;
  quest_type: string;
}

// Graph node for quest chain visualization
export interface QuestGraphNode {
  id: string;
  name: string;
  quest_type: string;
  display_type: string;
  x: number;
  y: number;
  isCurrent: boolean;
}

// Graph edge connecting two quests
export interface QuestGraphEdge {
  fromId: string;
  toId: string;
}

// Complete graph structure for quest chain visualization
export interface QuestChainGraph {
  nodes: QuestGraphNode[];
  edges: QuestGraphEdge[];
  width: number;
  height: number;
  currentDepth: number;
  maxDepth: number;
}

// NPC info for quest
export interface QuestNpc {
  id: string;
  name: string;
  /** The NPC's faction, which a hand-in credits with reputation. */
  faction: string | null;
  zone_id: string | null;
  zone_name: string | null;
}

// Monster kill target
export interface QuestMonsterTarget {
  id: string;
  name: string;
  amount: number;
  is_boss: boolean;
  is_fabled: boolean;
  is_elite: boolean;
}

// Item gather target
export interface QuestItemTarget {
  id: string;
  name: string;
  amount: number;
  tooltip_html: string | null;
}

export interface QuestLocationTarget {
  id: string;
  role: "location_visit" | "tracking_location";
  withheld: boolean;
  zone_id: string | null;
  zone_name: string | null;
  sub_zone_name: string | null;
  discovered_location: string | null;
  tracking_quest_location: string | null;
}

// Full quest info for detail page
export interface QuestInfo {
  id: string;
  name: string;
  quest_type: string;
  display_type: string;
  level_required: number;
  level_recommended: number;
  veteran_level_recommended: number;
  is_main_quest: boolean;
  is_epic_quest: boolean;
  is_adventurer_quest: boolean;
  is_repeatable: boolean;
  race_requirements: string[];
  class_requirements: string[];
  faction_requirements: QuestFactionRequirement[];
  rewards: QuestRewards;
  tooltip: string | null;
  tooltip_complete: string | null;
  // Per-class HTML tooltips: {"_default": "..."} or {"Warrior": "...", "Cleric": "...", etc.}
  tooltip_html: Record<string, string> | null;
  tooltip_complete_html: Record<string, string> | null;
  is_find_npc_quest: boolean;
  // Gather inventory quest fields
  remove_items_on_complete: boolean;
  // Alchemy quest fields
  potions_amount: number;
  increase_alchemy_skill: number;
}

// Detail page data
export interface QuestDetailPageData {
  quest: QuestInfo;
  /** Faction display name to route id, for linking out to `/factions/[id]`. */
  factionIds: Record<string, string>;
  description: string;
  startNpcs: QuestNpc[];
  endNpcs: QuestNpc[];
  requirements: readonly RequirementRoot[];
  chainGraph: QuestChainGraph | null;
  predecessors: QuestChainQuest[];
  successors: QuestChainQuest[];
  killTargets: QuestMonsterTarget[];
  locationTargets: QuestLocationTarget[];
  gatherItems: QuestItemTarget[];
  gatherInventoryItems: QuestItemTarget[];
  requiredItems: QuestItemTarget[];
  equipItems: QuestItemTarget[];
  potionItem: QuestItemTarget | null;
  givenItemsOnStart: QuestItemTarget[];
  itemIconPaths: Record<string, string | null>;
  acquisitionItems: DisplayItems;
  acquisitionNames: Readonly<Record<string, string>>;
  methods: readonly MethodView[];
}

// List page types
export interface QuestListView {
  id: string;
  name: string;
  quest_type: string;
  display_type: string;
  level_required: number;
  level_recommended: number;
  is_main_quest: boolean;
  is_epic_quest: boolean;
  is_adventurer_quest: boolean;
  is_repeatable: boolean;
  class_requirements: string[];
  quest_givers: Array<{ id: string; name: string }>;
}

export interface QuestsPageData {
  quests: QuestListView[];
}
