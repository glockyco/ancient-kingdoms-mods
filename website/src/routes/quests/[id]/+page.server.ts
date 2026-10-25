import Database from "better-sqlite3";
import { error } from "@sveltejs/kit";
import type { PageServerLoad, EntryGenerator } from "./$types";
import { DB_SOURCE_PATH } from "$lib/constants/constants";
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
import { buildObtainabilityTree } from "$lib/server/obtainability";
import { distinctSubzoneName } from "$lib/utils/format";
import { shareRewardsGivenToEveryClass } from "$lib/utils/quests";
import { loadAcquisition } from "$lib/server/acquisition";
import { loadAcquisitionItems } from "$lib/acquisition/items";
import { questDescription } from "$lib/server/meta-description";
import { getFactionIdsByName } from "$lib/queries/factions.server";
import { getAchievementsLinkingTo } from "$lib/queries/achievements.server";
import { getItemIconPaths } from "$lib/server/item-icon-paths";
import { projectQuestSeasons } from "$lib/acquisition/projections";
import type { Season } from "$lib/data/seasonal-events";

export const prerender = true;

export const entries: EntryGenerator = () => {
  const db = new Database(DB_SOURCE_PATH, { readonly: true });
  const quests = db.prepare("SELECT id FROM quests").all() as Array<{
    id: string;
  }>;
  db.close();

  return quests.map((quest) => ({ id: quest.id }));
};

export const load: PageServerLoad = async ({
  params,
}): Promise<QuestDetailPageData> => {
  const db = new Database(DB_SOURCE_PATH, { readonly: true });

  const questRaw = db
    .prepare("SELECT * FROM quests WHERE id = ?")
    .get(params.id) as Record<string, unknown> | undefined;

  if (!questRaw) {
    db.close();
    throw error(404, `Quest not found: ${params.id}`);
  }

  const raceRequirements = (
    db
      .prepare(
        "SELECT race_id AS name FROM quest_race_requirements WHERE quest_id = ? AND withheld = 0 ORDER BY ordinal",
      )
      .all(params.id) as { name: string }[]
  ).map((row) => row.name);
  const classRequirements = (
    db
      .prepare(
        "SELECT c.name FROM quest_class_requirements r JOIN classes c ON c.id = r.class_id WHERE r.quest_id = ? ORDER BY r.ordinal",
      )
      .all(params.id) as { name: string }[]
  ).map((row) => row.name);
  const factionRequirementsRaw = db
    .prepare(
      "SELECT f.name AS faction, r.standing AS faction_value FROM quest_faction_requirements r JOIN factions f ON f.id = r.faction_id WHERE r.quest_id = ? ORDER BY r.ordinal",
    )
    .all(params.id) as Array<{ faction: string; faction_value: number }>;

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
        { name: string } | undefined;

      return {
        faction: fr.faction,
        faction_value: fr.faction_value,
        tier_name: tier?.name ?? null,
      };
    });

  const execute = async (
    sql: string,
    values: readonly (string | number | null)[],
  ) => db.prepare(sql).all(...values) as Record<string, unknown>[];
  const acquisition = await loadAcquisition(execute, {
    kind: "requirements",
    entities: [{ kind: "quest", id: params.id }],
  });
  const acquisitionItems = await loadAcquisitionItems(execute, acquisition);
  const seasons = projectQuestSeasons(acquisition, params.id);
  const rewardSlots = db
    .prepare(
      `
    SELECT r.ordinal, c.name AS class_specific, r.class_withheld
    FROM quest_reward_slots r LEFT JOIN classes c ON c.id = r.class_id
    WHERE r.quest_id = ? ORDER BY r.ordinal
  `,
    )
    .all(params.id) as {
    ordinal: number;
    class_specific: string | null;
    class_withheld: number;
  }[];
  const rewardItems: QuestRewardItem[] = [];
  const reputationRewards: { faction: string; amount: number }[] = [];
  for (const method of acquisition.methodViews.values()) {
    if (
      method.kind !== "quest_complete" ||
      method.detail.quest_id !== params.id
    )
      continue;
    for (const effect of method.effects) {
      const faction = acquisition.entities
        .get("factions")
        ?.get(String(effect.faction_id));
      if (
        faction &&
        typeof effect.delta === "number" &&
        effect.delta > 0 &&
        !reputationRewards.some(
          (reward) =>
            reward.faction === faction.name && reward.amount === effect.delta,
        )
      ) {
        reputationRewards.push({
          faction: String(faction.name),
          amount: effect.delta,
        });
      }
    }
    for (const output of method.outputs) {
      if (output.resource_kind !== "item" || !output.item_id || output.withheld)
        continue;
      const item = acquisitionItems[output.item_id];
      if (!item)
        throw new Error(
          `Missing quest reward ${output.item_id} for ${params.id}`,
        );
      const slot = rewardSlots.find(
        (slot) => slot.ordinal === output.condition_slot,
      );
      rewardItems.push({
        item_id: output.item_id,
        item_name: item.name,
        quality: item.quality,
        tooltip_html: item.tooltip_html,
        class_specific: slot?.class_withheld
          ? "Unpublished class"
          : (slot?.class_specific ?? null),
        amount: output.quantity.kind === "exact" ? output.quantity.value : null,
      });
    }
  }
  const classNames = (
    db.prepare("SELECT name FROM classes").all() as { name: string }[]
  ).map((row) => row.name);
  const rewards: QuestRewards = {
    gold: Number(questRaw.reward_gold),
    exp: Number(questRaw.reward_experience),
    items: shareRewardsGivenToEveryClass(rewardItems, classNames, {
      key: (item) => `${item.item_id}:${item.amount}`,
      className: (item) => item.class_specific,
      shared: (item) => ({ ...item, class_specific: null }),
    }),
  };
  const locationTargets = db
    .prepare(
      `
    SELECT o.id, o.role, o.withheld, l.zone_id, z.name AS zone_name,
      s.name AS sub_zone_name, l.sub_zone_id, l.discovered_location, l.tracking_quest_location
    FROM quest_objectives o
    JOIN quest_objective_locations l ON l.id = o.id
    LEFT JOIN zones z ON z.id = l.zone_id
    LEFT JOIN zone_triggers s ON s.id = l.sub_zone_id
    WHERE o.quest_id = ? ORDER BY o.ordinal
  `,
    )
    .all(params.id) as Array<{
    id: string;
    role: string;
    withheld: number;
    zone_id: string | null;
    zone_name: string | null;
    sub_zone_id: string | null;
    sub_zone_name: string | null;
    discovered_location: string | null;
    tracking_quest_location: string | null;
  }>;
  const location = locationTargets.find((target) => !target.withheld);

  const quest: QuestInfo = {
    id: questRaw.id as string,
    name: questRaw.name as string,
    quest_type: questRaw.quest_type as string,
    display_type:
      (questRaw.display_type as string) || (questRaw.quest_type as string),
    level_required: (questRaw.level_required as number) || 0,
    level_recommended: (questRaw.level_recommended as number) || 0,
    veteran_level_recommended:
      (questRaw.veteran_level_recommended as number) || 0,
    is_main_quest: Boolean(questRaw.is_main_quest),
    is_epic_quest: Boolean(questRaw.is_epic_quest),
    is_adventurer_quest: Boolean(questRaw.is_adventurer_quest),
    is_repeatable: Boolean(questRaw.is_repeatable),
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
    discovered_location: location?.discovered_location ?? null,
    discovered_location_zone:
      location?.zone_id && location.zone_name
        ? { id: location.zone_id, name: location.zone_name }
        : null,
    discovered_location_sub_zone:
      location?.sub_zone_id &&
      distinctSubzoneName(location.zone_name, location.sub_zone_name)
        ? { id: location.sub_zone_id, name: location.sub_zone_name! }
        : null,
    discovered_location_position: null,
    tracking_quest_location: location?.tracking_quest_location ?? null,
    is_find_npc_quest: Boolean(questRaw.is_find_npc_quest),
    // Gather inventory quest fields
    remove_items_on_complete: Boolean(questRaw.remove_items_on_complete),
    // Alchemy quest fields
    potions_amount: Number(
      (
        db
          .prepare(
            "SELECT amount FROM quest_objectives WHERE quest_id = ? AND kind = 'brew' ORDER BY ordinal",
          )
          .get(params.id) as { amount: number } | undefined
      )?.amount ?? 0,
    ),
    increase_alchemy_skill: (questRaw.increase_alchemy_skill as number) || 0,
  };

  const questNpcs = db
    .prepare(
      `
    SELECT DISTINCT n.id, n.name, n.faction, n.season,
      (SELECT ns.zone_id FROM npc_spawns ns WHERE ns.npc_id = n.id ORDER BY ns.id LIMIT 1) AS zone_id,
      (SELECT z.name FROM npc_spawns ns JOIN zones z ON z.id = ns.zone_id WHERE ns.npc_id = n.id ORDER BY ns.id LIMIT 1) AS zone_name,
      m.role
    FROM npc_quest_memberships m JOIN npcs n ON n.id = m.npc_id
    WHERE m.quest_id = ? ORDER BY m.ordinal, n.name, n.id
  `,
    )
    .all(params.id) as Array<
    QuestNpc & { role: string; season: Season | null }
  >;
  const startNpcs = questNpcs.filter((npc) => npc.role === "offer");
  const endNpcs = questNpcs.filter((npc) => npc.role === "complete");
  const startNpc = quest.is_adventurer_quest ? null : (startNpcs[0] ?? null);
  const endNpc = endNpcs[0] ?? null;

  // Build quest chain graph
  const chainGraph = buildQuestChainGraph(db, params.id);

  const predecessors = db
    .prepare(
      `
    SELECT q.id, q.name, q.quest_type FROM quest_predecessors p JOIN quests q ON q.id = p.predecessor_quest_id
    WHERE p.quest_id = ? ORDER BY p.ordinal
  `,
    )
    .all(params.id) as { id: string; name: string; quest_type: string }[];

  // Get successor quests for breadcrumb nav
  const successors = db
    .prepare(
      `SELECT DISTINCT q.id, q.name, q.quest_type
       FROM quests q JOIN quest_predecessors pred ON pred.quest_id = q.id
       WHERE pred.predecessor_quest_id = ?`,
    )
    .all(params.id) as { id: string; name: string; quest_type: string }[];

  const killTargets = db
    .prepare(
      `
    SELECT m.id, m.name, o.amount, m.is_boss, m.is_fabled, m.is_elite
    FROM quest_objectives o JOIN quest_objective_monsters t ON t.id = o.id
    JOIN monsters m ON m.id = t.monster_id WHERE o.quest_id = ? ORDER BY o.ordinal
  `,
    )
    .all(params.id) as QuestMonsterTarget[];
  const itemObjectives = db
    .prepare(
      `
    SELECT i.id, i.name, i.quality, i.tooltip_html, o.amount, o.role FROM quest_objectives o
    JOIN quest_objective_items t ON t.id = o.id JOIN items i ON i.id = t.item_id
    WHERE o.quest_id = ? ORDER BY o.ordinal
  `,
    )
    .all(params.id) as Array<QuestItemTarget & { role: string }>;
  const gatherItems = itemObjectives.filter(
    (item) => item.role === "gather_counter",
  );
  const gatherInventoryItems = itemObjectives.filter(
    (item) => item.role === "inventory_primary",
  );
  const requiredItems = itemObjectives.filter(
    (item) => item.role === "inventory_secondary",
  );
  const equipItems = itemObjectives.filter((item) => item.role === "equipped");
  const givenItemsOnStart = db
    .prepare(
      `
    SELECT i.id, i.name, i.quality, i.tooltip_html, p.amount FROM quest_provided_items p
    JOIN items i ON i.id = p.item_id WHERE p.quest_id = ? ORDER BY p.ordinal
  `,
    )
    .all(params.id) as QuestItemTarget[];
  const potionItem =
    (db
      .prepare(
        `
    SELECT i.id, i.name, i.quality, i.tooltip_html, o.amount FROM quest_objectives o
    JOIN quest_objective_brews b ON b.id = o.id JOIN items i ON i.id = b.item_id
    WHERE o.quest_id = ? ORDER BY o.ordinal
  `,
      )
      .get(params.id) as QuestItemTarget | undefined) ?? null;

  const itemObtainabilityTrees = await Promise.all(
    [...gatherItems, ...gatherInventoryItems, ...requiredItems, ...equipItems]
      .filter(
        (item, index, items) =>
          items.findIndex((other) => other.id === item.id) === index,
      )
      .map((item) =>
        buildObtainabilityTree(db, item.id, item.amount, 0, new Set(), true),
      ),
  ).then((trees) =>
    trees.filter((tree) => tree.sources.length > 0 || tree.recipe),
  );

  // Build objectives for meta description
  type ObjectiveType =
    | "kill"
    | "gather"
    | "have"
    | "equip"
    | "deliver"
    | "discover"
    | "brew"
    | "find"
    | "other";
  const objectives: Array<{
    type: ObjectiveType;
    name: string;
    amount: number;
    zone_name?: string | null;
  }> = [];

  for (const target of killTargets) {
    objectives.push({ type: "kill", name: target.name, amount: target.amount });
  }
  for (const item of gatherItems) {
    objectives.push({ type: "gather", name: item.name, amount: item.amount });
  }
  for (const item of gatherInventoryItems) {
    objectives.push({
      type: quest.remove_items_on_complete ? "deliver" : "have",
      name: item.name,
      amount: item.amount,
    });
  }
  for (const item of requiredItems) {
    objectives.push({
      type: quest.remove_items_on_complete ? "deliver" : "have",
      name: item.name,
      amount: item.amount,
    });
  }
  for (const item of equipItems) {
    objectives.push({ type: "equip", name: item.name, amount: item.amount });
  }
  if (potionItem) {
    objectives.push({
      type: "brew",
      name: potionItem.name,
      amount: potionItem.amount,
    });
  }
  for (const target of locationTargets) {
    if (target.role !== "location_visit") continue;
    objectives.push({
      type: "discover",
      name: target.withheld
        ? "an unpublished location"
        : distinctSubzoneName(target.zone_name, target.sub_zone_name) ||
          target.tracking_quest_location ||
          target.zone_name ||
          target.discovered_location ||
          "the marked location",
      zone_name:
        !target.withheld &&
        distinctSubzoneName(target.zone_name, target.sub_zone_name)
          ? target.zone_name
          : null,
      amount: 1,
    });
  }
  if (quest.is_find_npc_quest) {
    for (const npc of endNpcs) {
      objectives.push({
        type: "find",
        name: npc.name,
        amount: 1,
        zone_name: npc.zone_name,
      });
    }
  }

  const description = questDescription(
    {
      name: quest.name,
      seasons,
      level_required: quest.level_required,
      quest_type: quest.quest_type,
      is_main_quest: quest.is_main_quest,
      is_epic_quest: quest.is_epic_quest,
      is_adventurer_quest: quest.is_adventurer_quest,
      is_repeatable: quest.is_repeatable,
      is_find_npc_quest: quest.is_find_npc_quest,
      turn_in_npc_name:
        [...new Set(endNpcs.map((npc) => npc.name))].join(" or ") || null,
      turn_in_npc_zone_name:
        [
          ...new Set(
            endNpcs.flatMap((npc) => (npc.zone_name ? [npc.zone_name] : [])),
          ),
        ].join(" or ") || null,
    },
    objectives,
  );

  const itemIconPaths = getItemIconPaths(db, [
    ...rewards.items.map((item) => item.item_id),
    ...gatherItems.map((item) => item.id),
    ...gatherInventoryItems.map((item) => item.id),
    ...requiredItems.map((item) => item.id),
    ...equipItems.map((item) => item.id),
    ...(potionItem ? [potionItem.id] : []),
    ...givenItemsOnStart.map((item) => item.id),
  ]);
  db.close();

  return {
    quest,
    achievements: getAchievementsLinkingTo(`/quests/${quest.id}`),
    factionIds: getFactionIdsByName(),
    description,
    seasons,
    npcSeasons: Object.fromEntries(
      questNpcs.map((npc) => [npc.id, npc.season]),
    ),
    startNpcs,
    endNpcs,
    startNpc,
    endNpc,
    adventurerNpcs: quest.is_adventurer_quest ? startNpcs : [],
    reputationRewards,
    chainGraph,
    predecessors,
    successors,
    killTargets,
    gatherItems,
    gatherInventoryItems,
    requiredItems,
    equipItems,
    potionItem,
    givenItemOnStart: givenItemsOnStart[0] ?? null,
    itemIconPaths,
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
        "SELECT id, name, quest_type, display_type FROM quests WHERE id = ?",
      )
      .get(questId) as
      | {
          id: string;
          name: string;
          quest_type: string;
          display_type: string | null;
        }
      | undefined;

    if (!questData) continue;

    const predecessorIds = (
      db
        .prepare(
          "SELECT predecessor_quest_id FROM quest_predecessors WHERE quest_id = ? AND withheld = 0 ORDER BY ordinal",
        )
        .all(questId) as { predecessor_quest_id: string }[]
    ).map((row) => row.predecessor_quest_id);

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
        `SELECT quest_id AS id FROM quest_predecessors
         WHERE predecessor_quest_id = ?`,
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
