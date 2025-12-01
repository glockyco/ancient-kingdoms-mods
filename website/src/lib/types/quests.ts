import type { ObtainabilityNode } from "./recipes";

// Quest reward item
export interface QuestRewardItem {
  item_id: string;
  item_name: string;
  class_specific: string | null;
  tooltip_html: string | null;
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
  zone_id: string | null;
  zone_name: string | null;
}

// Monster kill target
export interface QuestMonsterTarget {
  id: string;
  name: string;
  amount: number;
  is_boss: boolean;
  is_elite: boolean;
}

// Item gather target
export interface QuestItemTarget {
  id: string;
  name: string;
  amount: number;
  tooltip_html: string | null;
}

// Zone reference
export interface QuestZone {
  id: string;
  name: string;
}

// Position in game world
export interface QuestPosition {
  x: number;
  y: number;
  z: number;
}

// Full quest info for detail page
export interface QuestInfo {
  id: string;
  name: string;
  quest_type: string;
  display_type: string;
  level_required: number;
  level_recommended: number;
  is_main_quest: boolean;
  is_epic_quest: boolean;
  is_adventurer_quest: boolean;
  race_requirements: string[];
  class_requirements: string[];
  faction_requirements: QuestFactionRequirement[];
  rewards: QuestRewards;
  tooltip: string | null;
  tooltip_complete: string | null;
  // Per-class HTML tooltips: {"_default": "..."} or {"Warrior": "...", "Cleric": "...", etc.}
  tooltip_html: Record<string, string> | null;
  tooltip_complete_html: Record<string, string> | null;
  // Location quest fields
  discovered_location: string | null;
  discovered_location_zone: QuestZone | null;
  discovered_location_sub_zone: QuestZone | null;
  discovered_location_position: QuestPosition | null;
  tracking_quest_location: string | null;
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
  startNpc: QuestNpc | null;
  endNpc: QuestNpc | null;
  adventurerNpcs: QuestNpc[];
  chainGraph: QuestChainGraph | null;
  predecessors: QuestChainQuest[];
  successors: QuestChainQuest[];
  killTargets: QuestMonsterTarget[];
  gatherItems: QuestItemTarget[];
  gatherInventoryItems: QuestItemTarget[];
  requiredItems: QuestItemTarget[];
  equipItems: QuestItemTarget[];
  potionItem: QuestItemTarget | null;
  givenItemOnStart: QuestItemTarget | null;
  itemObtainabilityTrees: ObtainabilityNode[];
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
  class_requirements: string[];
  quest_giver_id: string | null;
  quest_giver_name: string | null;
  quest_giver_count: number;
}

export interface QuestsPageData {
  quests: QuestListView[];
}
