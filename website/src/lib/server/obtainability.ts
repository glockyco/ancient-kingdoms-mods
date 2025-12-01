import type Database from "better-sqlite3";
import type {
  ObtainabilityNode,
  SourceSummary,
  ObtainabilitySourceType,
  RecipeType,
  LearningRequirement,
} from "$lib/types/recipes";

// Raw item data from database for obtainability
interface RawItemObtainability {
  id: string;
  name: string;
  tooltip_html: string | null;
  quality: number;
  dropped_by: string | null;
  sold_by: string | null;
  rewarded_by: string | null;
  gathered_from: string | null;
  crafted_from: string | null;
  found_in_chests: string | null;
  found_in_packs: string | null;
}

// JSON structures from denormalized fields
interface DropInfo {
  monster_id: string;
  monster_name: string;
}

interface SoldByInfo {
  npc_id: string;
  npc_name: string;
}

interface RewardedByInfo {
  quest_id: string;
  quest_name: string;
}

interface GatherDropInfo {
  gather_item_id: string;
  gather_item_name: string;
}

interface ChestSourceInfo {
  chest_id: string;
  chest_name: string;
}

interface PackSourceInfo {
  pack_id: string;
  pack_name: string;
}

interface CraftedFromInfo {
  recipe_id: string;
  result_amount: number;
  materials: Array<{ item_id: string; item_name: string; amount: number }>;
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
  // Query item obtainability data
  const item = db
    .prepare(
      `
      SELECT id, name, tooltip_html, quality, dropped_by, sold_by, rewarded_by,
             gathered_from, crafted_from, found_in_chests, found_in_packs
      FROM items WHERE id = ?
    `,
    )
    .get(itemId) as RawItemObtainability | undefined;

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

  // Parse dropped_by
  if (item.dropped_by) {
    const drops = JSON.parse(item.dropped_by) as DropInfo[];
    const seen = new Set<string>();
    for (const d of drops) {
      if (!seen.has(d.monster_id)) {
        addSource({ type: "drop", id: d.monster_id, name: d.monster_name });
        seen.add(d.monster_id);
      }
    }
  }

  // Parse sold_by
  if (item.sold_by) {
    const vendors = JSON.parse(item.sold_by) as SoldByInfo[];
    const seen = new Set<string>();
    for (const v of vendors) {
      if (!seen.has(v.npc_id)) {
        addSource({ type: "vendor", id: v.npc_id, name: v.npc_name });
        seen.add(v.npc_id);
      }
    }
  }

  // Parse rewarded_by
  if (item.rewarded_by) {
    const quests = JSON.parse(item.rewarded_by) as RewardedByInfo[];
    const seen = new Set<string>();
    for (const q of quests) {
      if (!seen.has(q.quest_id)) {
        addSource({ type: "quest", id: q.quest_id, name: q.quest_name });
        seen.add(q.quest_id);
      }
    }
  }

  // Parse gathered_from
  if (item.gathered_from) {
    const gathers = JSON.parse(item.gathered_from) as GatherDropInfo[];
    const seen = new Set<string>();
    for (const g of gathers) {
      if (!seen.has(g.gather_item_id)) {
        addSource({
          type: "gather",
          id: g.gather_item_id,
          name: g.gather_item_name,
        });
        seen.add(g.gather_item_id);
      }
    }
  }

  // Parse found_in_chests
  if (item.found_in_chests) {
    const chests = JSON.parse(item.found_in_chests) as ChestSourceInfo[];
    const seen = new Set<string>();
    for (const c of chests) {
      if (!seen.has(c.chest_id)) {
        addSource({ type: "chest", id: c.chest_id, name: c.chest_name });
        seen.add(c.chest_id);
      }
    }
  }

  // Parse found_in_packs
  if (item.found_in_packs) {
    const packs = JSON.parse(item.found_in_packs) as PackSourceInfo[];
    const seen = new Set<string>();
    for (const p of packs) {
      if (!seen.has(p.pack_id)) {
        addSource({ type: "pack", id: p.pack_id, name: p.pack_name });
        seen.add(p.pack_id);
      }
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

  if (item.crafted_from && depth < maxDepth) {
    const craftedFrom = JSON.parse(item.crafted_from) as CraftedFromInfo[];

    if (craftedFrom.length > 0) {
      const recipeData = craftedFrom[0];
      const visitKey = itemId;

      if (!visited.has(visitKey)) {
        visited.add(visitKey);

        const recipeType = determineRecipeType(db, recipeData.recipe_id);

        const materials: ObtainabilityNode[] = recipeData.materials.map((m) =>
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
