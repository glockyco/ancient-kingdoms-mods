import type Database from "better-sqlite3";
import type {
  ObtainabilityNode,
  SourceSummary,
  ObtainabilitySourceType,
  RecipeType,
  LearningRequirement,
} from "$lib/types/recipes";
import {
  getMonsterSources,
  getVendorSources,
  getQuestSources,
  getAltarSources,
  getRecipeSources,
  getGatherSources,
  getChestSources,
  getPackSources,
  getRandomSources,
  getMergeSources,
  getTreasureMapSources,
} from "./item-sources";

// Basic item data for obtainability tree building
interface BasicItemData {
  id: string;
  name: string;
  tooltip_html: string | null;
  quality: number;
}

/**
 * Build an obtainability tree for an item, recursively following crafting recipes
 */
export function buildObtainabilityTree(
  db: Database.Database,
  itemId: string,
  amount: number,
  depth: number,
  visited: Set<string>,
  isRoot: boolean = false,
  maxDepth: number = 10,
): ObtainabilityNode {
  // Query basic item data
  const item = db
    .prepare(
      `
      SELECT id, name, tooltip_html, quality
      FROM items WHERE id = ?
    `,
    )
    .get(itemId) as BasicItemData | undefined;

  if (!item) {
    return {
      item_id: itemId,
      item_name: itemId,
      tooltip_html: null,
      quality: 0,
      amount,
      depth,
      isRoot,
      sources: [],
      sourceCountsByType: {},
    };
  }

  // Collect all sources grouped by type
  const sourcesByType = new Map<ObtainabilitySourceType, SourceSummary[]>();

  function addSource(source: SourceSummary) {
    const existing = sourcesByType.get(source.type) || [];
    existing.push(source);
    sourcesByType.set(source.type, existing);
  }

  // Check for special items first (items with non-standard acquisition)
  const specialSources = getSpecialItemSources(db, itemId);
  for (const source of specialSources) {
    addSource(source);
  }

  // Query sources from junction tables
  const monsters = getMonsterSources(db, itemId);
  const seen = new Set<string>();
  for (const m of monsters) {
    if (!seen.has(m.monster_id)) {
      addSource({ type: "drop", id: m.monster_id, name: m.monster_name });
      seen.add(m.monster_id);
    }
  }

  // Vendor sources
  const vendors = getVendorSources(db, itemId);
  seen.clear();
  for (const v of vendors) {
    if (!seen.has(v.npc_id)) {
      addSource({ type: "vendor", id: v.npc_id, name: v.npc_name });
      seen.add(v.npc_id);
    }
  }

  // Quest sources
  const quests = getQuestSources(db, itemId);
  seen.clear();
  for (const q of quests) {
    if (!seen.has(q.quest_id)) {
      addSource({ type: "quest", id: q.quest_id, name: q.quest_name });
      seen.add(q.quest_id);
    }
  }

  // Altar sources
  const altars = getAltarSources(db, itemId);
  seen.clear();
  for (const a of altars) {
    if (!seen.has(a.altar_id)) {
      addSource({ type: "altar", id: a.altar_id, name: a.altar_name });
      seen.add(a.altar_id);
    }
  }

  // Gather sources
  const gathers = getGatherSources(db, itemId);
  seen.clear();
  for (const g of gathers) {
    if (!seen.has(g.resource_id)) {
      addSource({
        type: "gather",
        id: g.resource_id,
        name: g.resource_name,
      });
      seen.add(g.resource_id);
    }
  }

  // Chest sources
  const chests = getChestSources(db, itemId);
  seen.clear();
  for (const c of chests) {
    if (!seen.has(c.chest_id)) {
      addSource({ type: "chest", id: c.chest_id, name: c.chest_name });
      seen.add(c.chest_id);
    }
  }

  // Pack sources
  const packs = getPackSources(db, itemId);
  seen.clear();
  for (const p of packs) {
    if (!seen.has(p.pack_item_id)) {
      addSource({
        type: "pack",
        id: p.pack_item_id,
        name: p.pack_item_name,
      });
      seen.add(p.pack_item_id);
    }
  }

  // Random sources
  const randoms = getRandomSources(db, itemId);
  seen.clear();
  for (const r of randoms) {
    if (!seen.has(r.random_item_id)) {
      addSource({
        type: "random",
        id: r.random_item_id,
        name: r.random_item_name,
      });
      seen.add(r.random_item_id);
    }
  }

  // Treasure map sources
  const treasureMaps = getTreasureMapSources(db, itemId);
  seen.clear();
  for (const tm of treasureMaps) {
    if (!seen.has(tm.map_item_id)) {
      addSource({
        type: "treasure_map",
        id: tm.map_item_id,
        name: tm.map_item_name,
      });
      seen.add(tm.map_item_id);
    }
  }

  // Add recipe sources (only from first recipe if multiple exist)
  const recipes = getRecipeSources(db, itemId);
  if (recipes.length > 0) {
    const firstRecipe = recipes[0];
    addSource({
      type: "recipe",
      id: firstRecipe.recipe_id,
      name: `Recipe (Tier ${firstRecipe.tier || 0})`,
    });
  }

  // Add merge sources
  const merges = getMergeSources(db, itemId);
  if (merges.length > 0) {
    const firstMerge = merges[0];
    for (const componentId of firstMerge.component_item_ids) {
      addSource({
        type: "merge",
        id: componentId,
        name: "", // Will be filled from components
      });
    }
  }

  // Build sources array (limited to 3 per type) and count totals per type
  const sources: SourceSummary[] = [];
  const sourceCountsByType: Record<string, number> = {};

  for (const [type, typeSources] of sourcesByType) {
    sourceCountsByType[type] = typeSources.length;
    sources.push(...typeSources.slice(0, 3));
  }

  // Check if craftable and should recurse
  let recipe: ObtainabilityNode["recipe"] | undefined;
  let service: ObtainabilityNode["service"] | undefined;

  if (recipes.length > 0 && depth < maxDepth) {
    const recipeData = recipes[0];
    const visitKey = itemId;

    if (!visited.has(visitKey)) {
      visited.add(visitKey);

      const recipeType = determineRecipeType(db, recipeData.recipe_id);

      // Query recipe materials
      const materials = getRecipeMaterials(
        db,
        recipeData.recipe_id,
        recipeData.recipe_type,
      ).map((m) =>
        buildObtainabilityTree(
          db,
          m.item_id,
          m.amount,
          depth + 1,
          visited,
          false,
          maxDepth,
        ),
      );

      // Check if this is an alchemy recipe that requires learning from a recipe item
      let learningRequirement: LearningRequirement | undefined;
      if (recipeType === "Alchemy") {
        learningRequirement = getAlchemyLearningRequirement(
          db,
          itemId,
          depth,
          visited,
          maxDepth,
        );
      }

      recipe = {
        recipe_id: recipeData.recipe_id,
        recipe_type: recipeType,
        materials,
        learningRequirement,
      };
    }
  }

  // Check for service-based transformations (e.g., blessing cursed runes)
  if (!recipe && depth < maxDepth) {
    const serviceData = getServiceTransformation(
      db,
      itemId,
      amount,
      depth,
      visited,
      maxDepth,
    );
    if (serviceData) {
      service = serviceData;
    }
  }

  // Check for merge (item created by merging other items)
  let merge: ObtainabilityNode["merge"] | undefined;

  if (!recipe && !service && depth < maxDepth) {
    const mergeData = getMergeComponents(db, itemId, depth, visited, maxDepth);
    if (mergeData) {
      merge = mergeData;
    }
  }

  return {
    item_id: item.id,
    item_name: item.name,
    tooltip_html: item.tooltip_html,
    quality: item.quality,
    amount,
    depth,
    isRoot,
    recipe,
    service,
    merge,
    sources,
    sourceCountsByType,
  };
}

// Get special item sources dynamically from the database
function getSpecialItemSources(
  db: Database.Database,
  itemId: string,
): SourceSummary[] {
  switch (itemId) {
    case "primal_essence": {
      const essenceTraders = db
        .prepare(
          `SELECT id, name FROM npcs WHERE json_extract(roles, '$.is_essence_trader') = 1`,
        )
        .all() as Array<{ id: string; name: string }>;
      return essenceTraders.map((npc) => ({
        type: "special",
        id: npc.id,
        name: npc.name,
      }));
    }
    case "blessed_rune": {
      const priestesses = db
        .prepare(
          `SELECT id, name FROM npcs WHERE json_extract(roles, '$.is_priestess') = 1`,
        )
        .all() as Array<{ id: string; name: string }>;
      return priestesses.map((npc) => ({
        type: "special",
        id: npc.id,
        name: npc.name,
      }));
    }
    default:
      return [];
  }
}

// Get service transformation for special items (e.g., blessed rune from cursed rune)
function getServiceTransformation(
  db: Database.Database,
  itemId: string,
  amount: number,
  depth: number,
  visited: Set<string>,
  maxDepth: number,
): ObtainabilityNode["service"] | undefined {
  switch (itemId) {
    case "blessed_rune": {
      const visitKey = `service:${itemId}`;
      if (visited.has(visitKey)) {
        return undefined;
      }
      visited.add(visitKey);

      const cursedRuneTree = buildObtainabilityTree(
        db,
        "cursed_rune",
        amount,
        depth + 1,
        visited,
        false,
        maxDepth,
      );

      return {
        service_type: "blessing",
        materials: [cursedRuneTree],
      };
    }
    default:
      return undefined;
  }
}

// Get the learning requirement for alchemy items (the recipe item that teaches the recipe)
function getAlchemyLearningRequirement(
  db: Database.Database,
  potionItemId: string,
  depth: number,
  visited: Set<string>,
  maxDepth: number,
): LearningRequirement | undefined {
  const potionItem = db
    .prepare(`SELECT taught_by_recipe_id FROM items WHERE id = ?`)
    .get(potionItemId) as { taught_by_recipe_id: string | null } | undefined;

  if (!potionItem?.taught_by_recipe_id) {
    return undefined;
  }

  const visitKey = `learning:${potionItem.taught_by_recipe_id}`;
  if (visited.has(visitKey)) {
    return undefined;
  }
  visited.add(visitKey);

  // LearningRequirement is just an ObtainabilityNode
  return buildObtainabilityTree(
    db,
    potionItem.taught_by_recipe_id,
    1,
    depth + 1,
    visited,
    false,
    maxDepth,
  );
}

function determineRecipeType(
  db: Database.Database,
  recipeId: string,
): RecipeType {
  const alchemy = db
    .prepare("SELECT id FROM alchemy_recipes WHERE id = ?")
    .get(recipeId);
  if (alchemy) return "Alchemy";

  const crafting = db
    .prepare("SELECT station_type FROM crafting_recipes WHERE id = ?")
    .get(recipeId) as { station_type: string | null } | undefined;

  if (crafting?.station_type === "cooking") return "Cooking";
  return "Crafting";
}

// Get recipe materials from a recipe (crafting or alchemy)
function getRecipeMaterials(
  db: Database.Database,
  recipeId: string,
  recipeType: "crafting" | "alchemy",
): Array<{ item_id: string; amount: number }> {
  const tableName =
    recipeType === "crafting" ? "crafting_recipes" : "alchemy_recipes";

  const recipe = db
    .prepare(`SELECT materials FROM ${tableName} WHERE id = ?`)
    .get(recipeId) as { materials: string | null } | undefined;

  if (!recipe?.materials) {
    return [];
  }

  try {
    return JSON.parse(recipe.materials) as Array<{
      item_id: string;
      amount: number;
    }>;
  } catch {
    return [];
  }
}

// Get merge components for items created by merging other items
function getMergeComponents(
  db: Database.Database,
  itemId: string,
  depth: number,
  visited: Set<string>,
  maxDepth: number,
): ObtainabilityNode["merge"] | undefined {
  const visitKey = `merge:${itemId}`;
  if (visited.has(visitKey)) {
    return undefined;
  }

  // Find merge components from junction table
  const mergeComponents = db
    .prepare(
      `
      SELECT
        ism.component_item_id as item_id,
        i.name as item_name
      FROM item_sources_merge ism
      JOIN items i ON ism.component_item_id = i.id
      WHERE ism.item_id = ?
      ORDER BY i.name ASC
    `,
    )
    .all(itemId) as Array<{
    item_id: string;
    item_name: string;
  }>;

  if (mergeComponents.length === 0) {
    return undefined;
  }

  visited.add(visitKey);

  // Build obtainability nodes for each merge component
  const materials: ObtainabilityNode[] = mergeComponents.map((m) =>
    buildObtainabilityTree(
      db,
      m.item_id,
      1,
      depth + 1,
      visited,
      false,
      maxDepth,
    ),
  );

  return {
    materials,
  };
}
