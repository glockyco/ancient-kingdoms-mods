import Database from "better-sqlite3";
import { error } from "@sveltejs/kit";
import type { PageServerLoad, EntryGenerator } from "./$types";
import type {
  QuestDetailPageData,
  QuestInfo,
  QuestNpc,
  QuestMonsterTarget,
  QuestItemTarget,
  QuestRewards,
  QuestFactionRequirement,
  QuestRewardItem,
  QuestChainGraph,
  QuestGraphNode,
  QuestGraphEdge,
} from "$lib/types/quests";
import type { ObtainabilityNode } from "$lib/types/recipes";
import { buildObtainabilityTree } from "$lib/server/obtainability";

export const prerender = true;

export const entries: EntryGenerator = () => {
  const db = new Database("static/compendium.db", { readonly: true });
  const quests = db.prepare("SELECT id FROM quests").all() as Array<{
    id: string;
  }>;
  db.close();

  return quests.map((quest) => ({ id: quest.id }));
};

const defaultRewards: QuestRewards = {
  gold: 0,
  exp: 0,
  items: [],
};

export const load: PageServerLoad = ({ params }): QuestDetailPageData => {
  const db = new Database("static/compendium.db", { readonly: true });

  const questRaw = db
    .prepare("SELECT * FROM quests WHERE id = ?")
    .get(params.id) as Record<string, unknown> | undefined;

  if (!questRaw) {
    db.close();
    throw error(404, `Quest not found: ${params.id}`);
  }

  // Parse JSON fields
  const raceRequirements: string[] = questRaw.race_requirements
    ? JSON.parse(questRaw.race_requirements as string)
    : [];

  const classRequirements: string[] = questRaw.class_requirements
    ? JSON.parse(questRaw.class_requirements as string)
    : [];

  const factionRequirementsRaw: Array<{
    faction: string;
    faction_value: number;
  }> = questRaw.faction_requirements
    ? JSON.parse(questRaw.faction_requirements as string)
    : [];

  // Enrich faction requirements with tier names
  const factionRequirements: QuestFactionRequirement[] =
    factionRequirementsRaw.map((fr) => {
      const tier = db
        .prepare(
          `SELECT name FROM reputation_tiers
         WHERE (min_value IS NULL OR min_value <= ?)
           AND (max_value IS NULL OR max_value > ?)
         ORDER BY min_value DESC
         LIMIT 1`,
        )
        .get(fr.faction_value, fr.faction_value) as
        | { name: string }
        | undefined;

      return {
        faction: fr.faction,
        faction_value: fr.faction_value,
        tier_name: tier?.name ?? null,
      };
    });

  const rewardsRaw = questRaw.rewards
    ? JSON.parse(questRaw.rewards as string)
    : defaultRewards;

  // Enrich reward items with names and tooltips
  const rewardItems: QuestRewardItem[] = [];
  if (rewardsRaw.items && Array.isArray(rewardsRaw.items)) {
    for (const ri of rewardsRaw.items) {
      const itemData = db
        .prepare("SELECT name, tooltip_html FROM items WHERE id = ?")
        .get(ri.item_id) as
        | { name: string; tooltip_html: string | null }
        | undefined;
      rewardItems.push({
        item_id: ri.item_id,
        item_name: itemData?.name ?? ri.item_id,
        class_specific: ri.class_specific ?? null,
        tooltip_html: itemData?.tooltip_html ?? null,
      });
    }
  }

  const rewards: QuestRewards = {
    gold: rewardsRaw.gold ?? 0,
    exp: rewardsRaw.exp ?? 0,
    items: rewardItems,
  };

  const quest: QuestInfo = {
    id: questRaw.id as string,
    name: questRaw.name as string,
    quest_type: questRaw.quest_type as string,
    display_type:
      (questRaw.display_type as string) || (questRaw.quest_type as string),
    level_required: (questRaw.level_required as number) || 0,
    level_recommended: (questRaw.level_recommended as number) || 0,
    is_main_quest: Boolean(questRaw.is_main_quest),
    is_epic_quest: Boolean(questRaw.is_epic_quest),
    is_adventurer_quest: Boolean(questRaw.is_adventurer_quest),
    race_requirements: raceRequirements,
    class_requirements: classRequirements,
    faction_requirements: factionRequirements,
    rewards,
    tooltip: (questRaw.tooltip as string) || null,
    tooltip_complete: (questRaw.tooltip_complete as string) || null,
    tooltip_html: questRaw.tooltip_html
      ? (JSON.parse(questRaw.tooltip_html as string) as Record<string, string>)
      : null,
    tooltip_complete_html: questRaw.tooltip_complete_html
      ? (JSON.parse(questRaw.tooltip_complete_html as string) as Record<
          string,
          string
        >)
      : null,
    // Location quest fields
    discovered_location: (questRaw.discovered_location as string) || null,
    discovered_location_zone: (() => {
      // For discover quests, look up the zone from discovered_location_zone_id
      if (
        questRaw.discovered_location &&
        questRaw.discovered_location_zone_id
      ) {
        const zone = db
          .prepare("SELECT id, name FROM zones WHERE id = ?")
          .get(questRaw.discovered_location_zone_id) as
          | { id: string; name: string }
          | undefined;
        return zone ? { id: zone.id, name: zone.name } : null;
      }
      return null;
    })(),
    tracking_quest_location:
      (questRaw.tracking_quest_location as string) || null,
    is_find_npc_quest: Boolean(questRaw.is_find_npc_quest),
    // Gather inventory quest fields
    remove_items_on_complete: Boolean(questRaw.remove_items_on_complete),
    // Alchemy quest fields
    potions_amount: (questRaw.potions_amount as number) || 0,
    increase_alchemy_skill: (questRaw.increase_alchemy_skill as number) || 0,
  };

  // Get start NPC(s)
  // For regular quests, use the start_npc_id field
  // For adventurer quests, find all NPCs that offer this quest
  let startNpc: QuestNpc | null = null;
  let adventurerNpcs: QuestNpc[] = [];

  if (questRaw.start_npc_id) {
    const npcData = db
      .prepare(
        `
      SELECT n.id, n.name, ns.zone_id, z.name as zone_name
      FROM npcs n
      LEFT JOIN npc_spawns ns ON ns.npc_id = n.id
      LEFT JOIN zones z ON z.id = ns.zone_id
      WHERE n.id = ?
      LIMIT 1
    `,
      )
      .get(questRaw.start_npc_id) as
      | {
          id: string;
          name: string;
          zone_id: string | null;
          zone_name: string | null;
        }
      | undefined;

    if (npcData) {
      startNpc = {
        id: npcData.id,
        name: npcData.name,
        zone_id: npcData.zone_id,
        zone_name: npcData.zone_name,
      };
    }
  } else if (questRaw.is_adventurer_quest) {
    // Find all NPCs that offer this adventurer quest
    const npcsOffering = db
      .prepare(
        `
      SELECT n.id, n.name, ns.zone_id, z.name as zone_name
      FROM npcs n
      LEFT JOIN npc_spawns ns ON ns.npc_id = n.id
      LEFT JOIN zones z ON z.id = ns.zone_id
      WHERE EXISTS (
        SELECT 1 FROM json_each(n.quests_offered)
        WHERE json_extract(value, '$.id') = ?
      )
      GROUP BY n.id
      ORDER BY n.name
    `,
      )
      .all(params.id) as Array<{
      id: string;
      name: string;
      zone_id: string | null;
      zone_name: string | null;
    }>;

    adventurerNpcs = npcsOffering.map((npc) => ({
      id: npc.id,
      name: npc.name,
      zone_id: npc.zone_id,
      zone_name: npc.zone_name,
    }));
  }

  // Get end NPC
  let endNpc: QuestNpc | null = null;
  if (questRaw.end_npc_id && questRaw.end_npc_id !== questRaw.start_npc_id) {
    const npcData = db
      .prepare(
        `
      SELECT n.id, n.name, ns.zone_id, z.name as zone_name
      FROM npcs n
      LEFT JOIN npc_spawns ns ON ns.npc_id = n.id
      LEFT JOIN zones z ON z.id = ns.zone_id
      WHERE n.id = ?
      LIMIT 1
    `,
      )
      .get(questRaw.end_npc_id) as
      | {
          id: string;
          name: string;
          zone_id: string | null;
          zone_name: string | null;
        }
      | undefined;

    if (npcData) {
      endNpc = {
        id: npcData.id,
        name: npcData.name,
        zone_id: npcData.zone_id,
        zone_name: npcData.zone_name,
      };
    }
  }

  // Build quest chain graph
  const chainGraph = buildQuestChainGraph(db, params.id);

  // Parse predecessor IDs and get predecessor quests for breadcrumb nav
  const predecessorIds: string[] = questRaw.predecessor_ids
    ? JSON.parse(questRaw.predecessor_ids as string)
    : [];

  const predecessors: { id: string; name: string; quest_type: string }[] = [];
  for (const predId of predecessorIds) {
    const predData = db
      .prepare("SELECT id, name, quest_type FROM quests WHERE id = ?")
      .get(predId) as
      | { id: string; name: string; quest_type: string }
      | undefined;
    if (predData) {
      predecessors.push(predData);
    }
  }

  // Get successor quests for breadcrumb nav
  const successors = db
    .prepare(
      `SELECT DISTINCT q.id, q.name, q.quest_type
       FROM quests q, json_each(q.predecessor_ids) AS pred
       WHERE pred.value = ?`,
    )
    .all(params.id) as { id: string; name: string; quest_type: string }[];

  // Get kill targets
  const killTargets: QuestMonsterTarget[] = [];
  if (questRaw.kill_target_1_id) {
    const monsterData = db
      .prepare("SELECT id, name, is_boss, is_elite FROM monsters WHERE id = ?")
      .get(questRaw.kill_target_1_id) as
      | { id: string; name: string; is_boss: number; is_elite: number }
      | undefined;

    if (monsterData) {
      killTargets.push({
        id: monsterData.id,
        name: monsterData.name,
        amount: (questRaw.kill_amount_1 as number) || 1,
        is_boss: Boolean(monsterData.is_boss),
        is_elite: Boolean(monsterData.is_elite),
      });
    }
  }
  if (questRaw.kill_target_2_id) {
    const monsterData = db
      .prepare("SELECT id, name, is_boss, is_elite FROM monsters WHERE id = ?")
      .get(questRaw.kill_target_2_id) as
      | { id: string; name: string; is_boss: number; is_elite: number }
      | undefined;

    if (monsterData) {
      killTargets.push({
        id: monsterData.id,
        name: monsterData.name,
        amount: (questRaw.kill_amount_2 as number) || 1,
        is_boss: Boolean(monsterData.is_boss),
        is_elite: Boolean(monsterData.is_elite),
      });
    }
  }

  // Get gather items
  const gatherItems: QuestItemTarget[] = [];
  const gatherFields = [
    { idField: "gather_item_1_id", amountField: "gather_amount_1" },
    { idField: "gather_item_2_id", amountField: "gather_amount_2" },
    { idField: "gather_item_3_id", amountField: "gather_amount_3" },
  ];

  for (const field of gatherFields) {
    const itemId = questRaw[field.idField] as string | null;
    if (itemId) {
      const itemData = db
        .prepare("SELECT id, name, tooltip_html FROM items WHERE id = ?")
        .get(itemId) as
        | { id: string; name: string; tooltip_html: string | null }
        | undefined;

      if (itemData) {
        gatherItems.push({
          id: itemData.id,
          name: itemData.name,
          amount: (questRaw[field.amountField] as number) || 1,
          tooltip_html: itemData.tooltip_html,
        });
      }
    }
  }

  // Get given item on start
  let givenItemOnStart: QuestItemTarget | null = null;
  if (questRaw.given_item_on_start_id) {
    const itemData = db
      .prepare("SELECT id, name, tooltip_html FROM items WHERE id = ?")
      .get(questRaw.given_item_on_start_id) as
      | { id: string; name: string; tooltip_html: string | null }
      | undefined;

    if (itemData) {
      givenItemOnStart = {
        id: itemData.id,
        name: itemData.name,
        amount: 1,
        tooltip_html: itemData.tooltip_html,
      };
    }
  }

  // Get gather inventory items (for gather_inventory quests)
  const gatherInventoryItems: QuestItemTarget[] = [];
  const gatherItemsJson = questRaw.gather_items
    ? JSON.parse(questRaw.gather_items as string)
    : [];
  for (const gi of gatherItemsJson) {
    if (gi.item_id) {
      const itemData = db
        .prepare("SELECT id, name, tooltip_html FROM items WHERE id = ?")
        .get(gi.item_id) as
        | { id: string; name: string; tooltip_html: string | null }
        | undefined;
      if (itemData) {
        gatherInventoryItems.push({
          id: itemData.id,
          name: itemData.name,
          amount: gi.amount || 1,
          tooltip_html: itemData.tooltip_html,
        });
      }
    }
  }

  // Get required items (for gather_inventory quests)
  const requiredItems: QuestItemTarget[] = [];
  const requiredItemsJson = questRaw.required_items
    ? JSON.parse(questRaw.required_items as string)
    : [];
  for (const ri of requiredItemsJson) {
    if (ri.item_id) {
      const itemData = db
        .prepare("SELECT id, name, tooltip_html FROM items WHERE id = ?")
        .get(ri.item_id) as
        | { id: string; name: string; tooltip_html: string | null }
        | undefined;
      if (itemData) {
        requiredItems.push({
          id: itemData.id,
          name: itemData.name,
          amount: ri.amount ?? 1,
          tooltip_html: itemData.tooltip_html,
        });
      }
    }
  }

  // Get equip items (for equip_item quests)
  const equipItems: QuestItemTarget[] = [];
  const equipItemsJson = questRaw.equip_items
    ? JSON.parse(questRaw.equip_items as string)
    : [];
  for (const itemId of equipItemsJson) {
    if (itemId) {
      const itemData = db
        .prepare("SELECT id, name, tooltip_html FROM items WHERE id = ?")
        .get(itemId) as
        | { id: string; name: string; tooltip_html: string | null }
        | undefined;
      if (itemData) {
        equipItems.push({
          id: itemData.id,
          name: itemData.name,
          amount: 1,
          tooltip_html: itemData.tooltip_html,
        });
      }
    }
  }

  // Get potion item (for alchemy quests)
  let potionItem: QuestItemTarget | null = null;
  if (questRaw.potion_item_id) {
    const itemData = db
      .prepare("SELECT id, name, tooltip_html FROM items WHERE id = ?")
      .get(questRaw.potion_item_id) as
      | { id: string; name: string; tooltip_html: string | null }
      | undefined;

    if (itemData) {
      potionItem = {
        id: itemData.id,
        name: itemData.name,
        amount: quest.potions_amount || 1,
        tooltip_html: itemData.tooltip_html,
      };
    }
  }

  // Build obtainability trees for items that need to be gathered/delivered/equipped
  // Combine all item objectives that players need to obtain
  const allObjectiveItems = [
    ...gatherItems,
    ...gatherInventoryItems,
    ...requiredItems,
    ...equipItems,
  ];

  const itemObtainabilityTrees: ObtainabilityNode[] = [];
  for (const item of allObjectiveItems) {
    const visited = new Set<string>();
    const tree = buildObtainabilityTree(
      db,
      item.id,
      item.amount,
      0,
      visited,
      true,
    );
    // Only include if the item has sources or is craftable
    if (tree.sources.length > 0 || tree.recipe) {
      itemObtainabilityTrees.push(tree);
    }
  }

  db.close();

  return {
    quest,
    startNpc,
    endNpc,
    adventurerNpcs,
    chainGraph,
    predecessors,
    successors,
    killTargets,
    gatherItems,
    gatherInventoryItems,
    requiredItems,
    equipItems,
    potionItem,
    givenItemOnStart,
    itemObtainabilityTrees,
  };
};

// Helper type for graph building
interface QuestNodeData {
  id: string;
  name: string;
  quest_type: string;
  display_type: string;
  predecessor_ids: string[];
}

// Layout constants
const NODE_WIDTH = 180;
const NODE_HEIGHT = 36;
const HORIZONTAL_GAP = 60;
const VERTICAL_GAP = 20;
const PADDING = 16;

/**
 * Build a complete quest chain graph with proper layout.
 *
 * Algorithm:
 * 1. Collect all connected quests (BFS in both directions)
 * 2. Assign each quest a "depth" based on longest path from any root
 * 3. Group quests by depth into columns
 * 4. Calculate x,y positions for each node
 * 5. Create edges between connected quests
 */
function buildQuestChainGraph(
  db: Database.Database,
  currentQuestId: string,
): QuestChainGraph | null {
  // Collect all quests in the chain
  const allQuests = new Map<string, QuestNodeData>();
  const edges: QuestGraphEdge[] = [];

  // BFS to collect all connected quests
  const toVisit = [currentQuestId];
  const visited = new Set<string>();

  while (toVisit.length > 0) {
    const questId = toVisit.shift()!;
    if (visited.has(questId)) continue;
    visited.add(questId);

    const questData = db
      .prepare(
        "SELECT id, name, quest_type, display_type, predecessor_ids FROM quests WHERE id = ?",
      )
      .get(questId) as
      | {
          id: string;
          name: string;
          quest_type: string;
          display_type: string | null;
          predecessor_ids: string | null;
        }
      | undefined;

    if (!questData) continue;

    const predecessorIds: string[] = questData.predecessor_ids
      ? JSON.parse(questData.predecessor_ids)
      : [];

    allQuests.set(questId, {
      id: questData.id,
      name: questData.name,
      quest_type: questData.quest_type,
      display_type: questData.display_type || questData.quest_type,
      predecessor_ids: predecessorIds,
    });

    // Add edges from predecessors to this quest
    for (const predId of predecessorIds) {
      edges.push({ fromId: predId, toId: questId });
      if (!visited.has(predId)) {
        toVisit.push(predId);
      }
    }

    // Find successors (quests that have this quest as a predecessor)
    const successors = db
      .prepare(
        `SELECT quests.id FROM quests, json_each(quests.predecessor_ids) AS pred
         WHERE pred.value = ?`,
      )
      .all(questId) as { id: string }[];

    for (const succ of successors) {
      if (!visited.has(succ.id)) {
        toVisit.push(succ.id);
      }
    }
  }

  // If no chain (standalone quest), return null
  if (allQuests.size <= 1) {
    return null;
  }

  // Calculate depth for each quest (longest path from any root)
  const depths = new Map<string, number>();

  // Find roots (quests with no predecessors in our set)
  const roots: string[] = [];
  for (const [id, quest] of allQuests) {
    const hasValidPredecessor = quest.predecessor_ids.some((predId) =>
      allQuests.has(predId),
    );
    if (!hasValidPredecessor) {
      roots.push(id);
      depths.set(id, 0);
    }
  }

  // BFS from roots to assign depths
  const depthQueue = [...roots];
  while (depthQueue.length > 0) {
    const questId = depthQueue.shift()!;
    const currentDepth = depths.get(questId)!;

    // Find all successors
    for (const edge of edges) {
      if (edge.fromId === questId) {
        const successorId = edge.toId;
        const existingDepth = depths.get(successorId);
        const newDepth = currentDepth + 1;

        // Use max depth (longest path)
        if (existingDepth === undefined || newDepth > existingDepth) {
          depths.set(successorId, newDepth);
          depthQueue.push(successorId);
        }
      }
    }
  }

  // Group quests by depth
  const depthGroups = new Map<number, string[]>();
  let maxDepth = 0;
  for (const [id, depth] of depths) {
    if (!depthGroups.has(depth)) {
      depthGroups.set(depth, []);
    }
    depthGroups.get(depth)!.push(id);
    maxDepth = Math.max(maxDepth, depth);
  }

  // Build predecessor map for ordering
  const predecessorMap = new Map<string, string[]>();
  for (const [id, quest] of allQuests) {
    predecessorMap.set(
      id,
      quest.predecessor_ids.filter((predId) => allQuests.has(predId)),
    );
  }

  // Order nodes to minimize edge crossings (Sugiyama-style barycenter method)
  // 1. Sort root nodes (depth 0) by ID for canonical initial order
  // 2. For each subsequent depth, sort by average position of predecessors
  const nodePositionIndex = new Map<string, number>();

  for (let depth = 0; depth <= maxDepth; depth++) {
    const questsAtDepth = depthGroups.get(depth) || [];

    if (depth === 0) {
      // Root nodes: sort by ID for canonical order
      questsAtDepth.sort();
    } else {
      // Non-root nodes: sort by barycenter (average predecessor position)
      questsAtDepth.sort((a, b) => {
        const predsA = predecessorMap.get(a) || [];
        const predsB = predecessorMap.get(b) || [];

        // Calculate average position of predecessors
        const avgA =
          predsA.length > 0
            ? predsA.reduce(
                (sum, p) => sum + (nodePositionIndex.get(p) ?? 0),
                0,
              ) / predsA.length
            : 0;
        const avgB =
          predsB.length > 0
            ? predsB.reduce(
                (sum, p) => sum + (nodePositionIndex.get(p) ?? 0),
                0,
              ) / predsB.length
            : 0;

        // If same barycenter, use ID for stable sort
        if (avgA === avgB) {
          return a.localeCompare(b);
        }
        return avgA - avgB;
      });
    }

    // Record position index for this depth's nodes
    for (let i = 0; i < questsAtDepth.length; i++) {
      nodePositionIndex.set(questsAtDepth[i], i);
    }
  }

  // Calculate positions
  const nodes: QuestGraphNode[] = [];

  // Find the maximum number of quests at any depth (for height calculation)
  let maxQuestsAtDepth = 0;
  for (const group of depthGroups.values()) {
    maxQuestsAtDepth = Math.max(maxQuestsAtDepth, group.length);
  }

  const totalHeight =
    maxQuestsAtDepth * (NODE_HEIGHT + VERTICAL_GAP) - VERTICAL_GAP;
  const totalWidth =
    (maxDepth + 1) * (NODE_WIDTH + HORIZONTAL_GAP) - HORIZONTAL_GAP;

  // Find the depth of the current quest
  const currentQuestDepth = depths.get(currentQuestId) ?? 0;

  for (let depth = 0; depth <= maxDepth; depth++) {
    const questsAtDepth = depthGroups.get(depth) || [];
    const groupHeight =
      questsAtDepth.length * (NODE_HEIGHT + VERTICAL_GAP) - VERTICAL_GAP;
    const startY = (totalHeight - groupHeight) / 2;

    for (let i = 0; i < questsAtDepth.length; i++) {
      const questId = questsAtDepth[i];
      const questData = allQuests.get(questId)!;

      nodes.push({
        id: questData.id,
        name: questData.name,
        quest_type: questData.quest_type,
        display_type: questData.display_type,
        x: PADDING + depth * (NODE_WIDTH + HORIZONTAL_GAP),
        y: PADDING + startY + i * (NODE_HEIGHT + VERTICAL_GAP),
        isCurrent: questId === currentQuestId,
      });
    }
  }

  return {
    nodes,
    edges,
    width: totalWidth + PADDING * 2,
    height: totalHeight + PADDING * 2,
    currentDepth: currentQuestDepth,
    maxDepth,
  };
}
