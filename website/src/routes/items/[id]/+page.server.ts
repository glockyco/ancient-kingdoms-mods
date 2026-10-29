import Database from "better-sqlite3";
import { error } from "@sveltejs/kit";
import { formatNumber } from "$lib/utils/format";
import type { PageServerLoad, EntryGenerator } from "./$types";
import { DB_SOURCE_PATH } from "$lib/constants/constants";
import type { ItemDetailPageData } from "$lib/types/items";
import type { EntityVisualAsset } from "$lib/types/visual-assets";
import { ITEM_DETAIL_SELECT, type Item } from "$lib/queries/items";
import {
  loadItemSourceModel,
  aggregateChestRewards,
  getItemSourcesFromModel,
  sourceEntity,
} from "$lib/server/item-sources";
import {
  projectDefinitionInspection,
  projectItemSources,
  projectItemSeasons,
} from "$lib/acquisition/projections";
import { loadAcquisitionItems } from "$lib/acquisition/items";
import { itemDescription, itemTitle } from "$lib/server/meta-description";
import { itemUsagesFromModel } from "$lib/server/item-usages";
import { getRecipeDefinitions } from "$lib/server/obtainability";
import { getItemIconPaths } from "$lib/server/item-icon-paths";
import { getItemMapBounds } from "$lib/queries/map-search";
import { itemMapLocations, MAP_PROVIDER_CATEGORY } from "$lib/map/acquisition";
import { skillEffectInputs } from "$lib/skills/skillEffects.server";
import { formatSkillEffect } from "$lib/utils/formatSkillEffect";
import {
  getItemRegionalCooking,
  type ItemRegionalCooking,
} from "$lib/queries/regional-events.server";

import { calculateChestRewards } from "$lib/calculation/chest-rewards";
import {
  CHEST_REWARDS_QUERY,
  assembleChests,
  type ChestRewardRow,
} from "$lib/queries/chest-rewards";

const FISHERMAN_COSTUME_IDS = new Set([
  "fishermans_hat",
  "fishermans_garb",
  "fishermans_trousers",
]);

type FishingRole = "fish" | "trash_fish" | "rod" | "costume" | null;
export const prerender = true;

// Generate entries for all items at build time
export const entries: EntryGenerator = () => {
  const db = new Database(DB_SOURCE_PATH, { readonly: true });
  const items = db.prepare("SELECT id FROM items").all() as Array<{
    id: string;
  }>;
  db.close();

  return items.map((item) => ({ id: item.id }));
};

type MapLinks = Record<
  "monster" | "npc" | "altar" | "chest" | "portal" | "resource" | "quest",
  string[]
>;

// Load item data at build time (for SSR/prerendering)
export const load: PageServerLoad = async ({
  params,
}): Promise<
  ItemDetailPageData & {
    hasMapLocation: boolean;
    /** Related entities with a visible map location for this item, by map category. */
    mapLinks: MapLinks;
    hasKnownSource: boolean;
    acquisitionNotes: string[];
    foodBuffUsesTavernSpirit: boolean;
    /** A Double XP potion, which the game refuses while a seasonal Double XP event runs. */
    blockedDuringSeasons: boolean;
    /** Effect summary of the potion or food buff at the rank the item applies. */
    consumableBuffEffect: string | null;
    /** Cooking requests the item counts for as a dish, or feeds as meat. */
    regionalCooking: ItemRegionalCooking[];
  }
> => {
  const db = new Database(DB_SOURCE_PATH, { readonly: true });

  const item = db
    .prepare(`${ITEM_DETAIL_SELECT} WHERE i.id = ?`)
    .get(params.id) as Item | undefined;

  if (!item) {
    db.close();
    throw error(404, `Item not found: ${params.id}`);
  }
  const execute = async (
    sql: string,
    bindings: readonly (string | number | null)[],
  ) => db.prepare(sql).all(...bindings) as Record<string, unknown>[];
  const model = await loadItemSourceModel(db, [params.id]);

  const serviceNpcs = (kind: "essence" | "blessing") =>
    [
      ...new Map(
        [...model.methodViews.values()]
          .filter((method) => method.rooted && method.kind === kind)
          .flatMap((method) => method.providers)
          .filter((provider) => provider.ref.kind === "npcs")
          .map((provider) => [
            provider.ref.id,
            { id: provider.ref.id, name: provider.name },
          ]),
      ).values(),
    ].sort((a, b) => a.name.localeCompare(b.name));
  const essenceTraders =
    params.id === "primal_essence" ? serviceNpcs("essence") : [];

  // For token of redemption, get all veteran master NPCs
  let veteranMasters: Array<{ id: string; name: string }> = [];
  if (params.id === "token_of_redemption") {
    veteranMasters = db
      .prepare(
        `SELECT id, name FROM npcs WHERE json_extract(roles, '$.is_veteran_master') = 1`,
      )
      .all() as Array<{ id: string; name: string }>;
  }

  // For non-set augments (gems that add stats to equipment), get augmenter NPCs
  let augmenters: Array<{ id: string; name: string }> = [];
  if (item.item_type === "augment" && !item.augment_armor_set_name) {
    augmenters = db
      .prepare(
        `SELECT id, name FROM npcs WHERE json_extract(roles, '$.is_augmenter') = 1`,
      )
      .all() as Array<{ id: string; name: string }>;
  }

  const priestesses =
    params.id === "cursed_rune" || params.id === "blessed_rune"
      ? serviceNpcs("blessing")
      : [];

  const fishingRole: FishingRole = (() => {
    if (FISHERMAN_COSTUME_IDS.has(item.id)) return "costume";
    if (item.weapon_category === "Fishing Rod") return "rod";
    const fishRow = db
      .prepare("SELECT is_trash FROM fish WHERE item_id = ?")
      .get(item.id) as { is_trash: number } | undefined;
    if (fishRow) return fishRow.is_trash ? "trash_fish" : "fish";
    return null;
  })();

  const fishingEffect = FISHERMAN_COSTUME_IDS.has(item.id)
    ? {
        title: "Fishing bonus",
        description_paragraphs: [
          "Each Fisherman set piece adds 2% to the catch chance of every fish available at the Fishing Spot.",
          "This bonus applies only after you get a bite. Bite chance is determined by your Fishing skill, the Fishing Spot tier, and your rod.",
        ],
        fishing_page_href: "/professions/fishing#calculator",
      }
    : null;

  const progression = db
    .prepare("SELECT max_level FROM progression_rules WHERE id = 1")
    .get() as { max_level: number } | undefined;
  if (!progression) throw new Error("Missing progression_rules.max_level");
  const chestRows = db
    .prepare(
      `${CHEST_REWARDS_QUERY} WHERE definition.item_id = ? ORDER BY entry.ordinal`,
    )
    .all(params.id) as ChestRewardRow[];
  const [chest] = assembleChests(chestRows);
  const chestRewards = chest
    ? aggregateChestRewards(calculateChestRewards(chest, 0))
    : [];

  // Preserve the item tables using the canonical acquisition model.
  const sources = await getItemSourcesFromModel(db, model, params.id);
  const usages = itemUsagesFromModel(model, params.id);
  const acquisitionNotes: string[] = [];
  const starters = new Set(
    projectItemSources(model, params.id)
      .methods.filter((method) => method.kind === "creation")
      .map((method) => String(method.detail.class_id)),
  );
  const classCount = db
    .prepare("SELECT COUNT(*) AS count FROM classes")
    .get() as { count: number };
  if (starters.size === classCount.count && starters.size > 0) {
    acquisitionNotes.push("Every new character starts with this item.");
  } else if (starters.size > 0) {
    const names = [...starters]
      .map((id) => String(model.entities.get("classes")?.get(id)?.name ?? id))
      .sort();
    acquisitionNotes.push(
      `New ${names.join(", ")} characters start with this item.`,
    );
  }
  if (item.item_type === "structure") {
    acquisitionNotes.push(
      `Buy and place this furniture through the house panel for ${formatNumber(item.structure_price)} gold while at a house owned by your account.`,
    );
  }
  const sourceView = projectItemSources(model, params.id);
  // A distribution item or a pack is never delivered itself, but the page lists the
  // awards that roll it and the vendors and recipes that offer it.
  const hasKnownSource =
    sourceView.hasKnownSource ||
    sourceView.inspection.parentAwards.length > 0 ||
    sourceView.inspection.offeredAssets.some((method) => method.rooted);
  const hasMapLocation =
    (await getItemMapBounds(
      params.id,
      async (sql, bindings) =>
        db.prepare(sql).all(...bindings) as Record<string, unknown>[],
    )) !== null;

  // A row links to the map only where the map can show it for this item: the same
  // visible locations the item's own map link highlights.
  const mapLinks: MapLinks = {
    monster: [],
    npc: [],
    altar: [],
    chest: [],
    portal: [],
    resource: [],
    quest: [],
  };
  for (const location of itemMapLocations(model, params.id)) {
    const category = MAP_PROVIDER_CATEGORY[location.provider.kind];
    // A spawn location links its template, which the map selects as a group.
    const id =
      location.provider.kind === "monster_spawns"
        ? sourceEntity(model, "monster_spawns", location.provider.id)
            ?.monster_id
        : location.provider.kind === "resource_spawns"
          ? sourceEntity(
              model,
              "gathering_resource_spawns",
              location.provider.id,
            )?.resource_id
          : location.provider.id;
    if (category && category in mapLinks && typeof id === "string")
      mapLinks[category as keyof MapLinks].push(id);
  }
  // A quest's map selection highlights its NPCs, its kill targets and its discovery areas.
  const questIds = [
    ...new Set([...sources.quests, ...usages.quests].map((q) => q.quest_id)),
  ];
  if (questIds.length > 0)
    mapLinks.quest = (
      db
        .prepare(
          `SELECT q.id FROM quests q
           WHERE q.id IN (${questIds.map(() => "?").join(",")})
             AND (EXISTS (SELECT 1 FROM npc_quest_memberships m JOIN npc_spawns s ON s.npc_id = m.npc_id
                          WHERE m.quest_id = q.id AND s.position_x IS NOT NULL)
               OR EXISTS (SELECT 1 FROM quest_objectives o JOIN quest_objective_monsters t ON t.id = o.id
                          JOIN monster_spawns s ON s.monster_id = t.monster_id
                          WHERE o.quest_id = q.id AND o.withheld = 0 AND s.position_x IS NOT NULL)
               OR EXISTS (SELECT 1 FROM quest_objectives o JOIN quest_objective_locations l ON l.id = o.id
                          WHERE o.quest_id = q.id AND o.withheld = 0 AND l.area_shape IS NOT NULL))`,
        )
        .all(...questIds) as { id: string }[]
    ).map((row) => row.id);
  for (const key of Object.keys(mapLinks) as (keyof MapLinks)[])
    mapLinks[key] = [...new Set(mapLinks[key])];

  const recipeMaterials: ItemDetailPageData["recipeMaterials"] = {};
  for (const recipe of sources.recipes) {
    recipeMaterials[recipe.variant_id ?? recipe.recipe_id] =
      recipe.materials ?? [];
  }
  let taughtRecipes: ItemDetailPageData["taughtRecipes"] = [];
  if (item.recipe_potion_learned_id) {
    const taughtRecipe = db
      .prepare("SELECT id FROM alchemy_recipes WHERE result_item_id = ?")
      .get(item.recipe_potion_learned_id) as { id: string } | undefined;
    if (!taughtRecipe) {
      throw new Error(
        `Missing alchemy recipe for ${item.recipe_potion_learned_id}`,
      );
    }
    taughtRecipes = (await getRecipeDefinitions(db, [taughtRecipe.id])).map(
      (recipe) => ({
        variant_id: recipe.method_id,
        tier: recipe.tier,
        materials: recipe.materials,
      }),
    );
    recipeMaterials[item.recipe_potion_learned_id] =
      taughtRecipes[0]?.materials ?? [];
  }

  const inspection = projectDefinitionInspection(model, params.id);
  const acquisitionItems = await loadAcquisitionItems(execute, model);
  const hasWithheldRandomOutcomes = (
    model.rows.facts.item_pool_definitions ?? []
  ).some(
    (binding) =>
      binding.item_id === params.id &&
      binding.role === "random" &&
      model.entriesByPool
        .get(String(binding.pool_id))
        ?.some((entry) => entry.withheld),
  );
  const randomOutcomes = inspection.randomOutcomes.flatMap((outcome) =>
    outcome.itemId && outcome.probability !== null
      ? [
          {
            item_id: outcome.itemId,
            item_name: acquisitionItems[outcome.itemId]?.name ?? outcome.itemId,
            quality: acquisitionItems[outcome.itemId]?.quality ?? 0,
            probability: outcome.probability,
          },
        ]
      : [],
  );

  // Load treasure location for treasure map items
  let treasureLocation: {
    location_id: string;
    zone_id: string;
    zone_name: string;
    reward_id: string | null;
    reward_name: string | null;
    position_x: number;
    position_y: number;
  } | null = null;

  if (item.item_type === "treasure_map") {
    treasureLocation =
      (db
        .prepare(
          `
        SELECT
          tl.id as location_id,
          tl.zone_id,
          z.name as zone_name,
          tl.reward_id,
          reward.name as reward_name,
          tl.position_x,
          tl.position_y
        FROM treasure_locations tl
        JOIN zones z ON z.id = tl.zone_id
        LEFT JOIN items reward ON reward.id = tl.reward_id
        WHERE tl.required_map_id = ?
      `,
        )
        .get(params.id) as typeof treasureLocation) || null;
  }

  const packContents = inspection.fixedContents.flatMap((outcome) =>
    outcome.itemId && outcome.amount.kind === "exact"
      ? [
          {
            item_id: outcome.itemId,
            item_name: acquisitionItems[outcome.itemId]?.name ?? outcome.itemId,
            quality: acquisitionItems[outcome.itemId]?.quality ?? 0,
            amount: outcome.amount.value,
          },
        ]
      : [],
  );

  // Chest-key open count: how many chests this key opens, across how many zones.
  let chestKeyOpens: { chestCount: number; zoneCount: number } | undefined;
  if (item.is_chest_key) {
    const chests = new Map(
      model.rows.details.world_chest
        .filter((detail) => detail.key_item_id === params.id)
        .map((detail) => [
          detail.chest_id,
          model.entities.get("chests")?.get(detail.chest_id),
        ]),
    );
    chestKeyOpens = {
      chestCount: chests.size,
      zoneCount: new Set(
        [...chests.values()].flatMap((chest) =>
          chest?.zone_id ? [chest.zone_id] : [],
        ),
      ).size,
    };
  }

  const mergeResultName = usages.merges[0]?.result_item_name ?? null;
  // Source: server-scripts/BuffSkill.cs:7-12 — buffTime is a LinearFloat with baseValue = duration_base.
  // Source: server-scripts/PotionItem.cs:GetBuffLevelWithElixirEndurance — potion buff level is resolved at use time from the player's veteran rank.
  // Source: server-scripts/Pet.cs:2196-2209 — mercenary utility potions pass Networkowner to resolve that level. Runtime veteran rank is unknown here.
  const buffId =
    item.potion_buff_id || item.food_buff_id || item.relic_buff_id || null;
  let buffDurationSeconds: number | null = null;
  let relicIsCleanse = false;
  let foodBuffUsesTavernSpirit = false;
  let blockedDuringSeasons = false;
  if (buffId) {
    const row = db
      .prepare(
        "SELECT duration_base, is_cleanse, buff_category, is_double_exp_spell FROM skills WHERE id = ?",
      )
      .get(buffId) as
      | {
          duration_base: number;
          is_cleanse: number;
          buff_category: string | null;
          is_double_exp_spell: number;
        }
      | undefined;
    buffDurationSeconds = row?.duration_base ?? null;
    relicIsCleanse = Boolean(item.relic_buff_id && row?.is_cleanse);
    foodBuffUsesTavernSpirit = Boolean(
      item.food_buff_id &&
      (row?.buff_category === "Food" || row?.buff_category === "Drink"),
    );
    // Source: server-scripts/PotionItem.cs:CanUse — a Double XP potion cannot be used while Halloween or the Winter Festival grants its own Double XP buff.
    blockedDuringSeasons = Boolean(
      item.potion_buff_id && row?.is_double_exp_spell,
    );
  }
  const scrollSkillMaxRank = item.scroll_skill_id
    ? (
        db
          .prepare("SELECT max_level FROM skills WHERE id = ?")
          .get(item.scroll_skill_id) as { max_level: number }
      ).max_level
    : null;
  const consumableBuffId = item.potion_buff_id || item.food_buff_id;
  const consumableBuffEffect = consumableBuffId
    ? formatSkillEffect(
        skillEffectInputs([
          {
            id: consumableBuffId,
            runtimeLevel: item.potion_buff_id
              ? item.potion_buff_level
              : item.food_buff_level,
          },
        ])[0],
      )
    : null;

  const visualAsset =
    (db
      .prepare(
        `SELECT public_path, width, height, source_field, source_type
         FROM visual_assets
         WHERE domain = 'item' AND entity_id = ? AND kind = 'icon'`,
      )
      .get(params.id) as EntityVisualAsset | undefined) ?? null;

  // Pet whistles carry the creature they summon; the icon alone does not show
  // what the pet looks like, which is the first thing anyone wants to see.
  const petVisualAsset =
    (db
      .prepare(
        `SELECT public_path, width, height, source_field, source_type
         FROM visual_assets
         WHERE domain = 'item' AND entity_id = ? AND kind = 'pet'`,
      )
      .get(params.id) as EntityVisualAsset | undefined) ?? null;

  const setMembers = JSON.parse(
    item.augment_armor_set_members ?? "[]",
  ) as Array<{ item_id: string }>;
  if (setMembers.length) {
    const qualities = new Map(
      (
        db
          .prepare(
            "SELECT id, quality FROM items WHERE id IN (SELECT value FROM json_each(?))",
          )
          .all(
            JSON.stringify(setMembers.map((member) => member.item_id)),
          ) as Array<{ id: string; quality: number }>
      ).map((member) => [member.id, member.quality]),
    );
    item.augment_armor_set_members = JSON.stringify(
      setMembers.map((member) => ({
        ...member,
        quality: qualities.get(member.item_id),
      })),
    );
  }
  const itemIconPaths = getItemIconPaths(
    db,
    item.augment_armor_set_members
      ? (
          JSON.parse(item.augment_armor_set_members) as Array<{
            item_id: string;
          }>
        ).map((member) => member.item_id)
      : [],
  );
  db.close();

  const description = itemDescription(item, {
    usages,
    packContents,
    randomOutcomes: hasWithheldRandomOutcomes ? undefined : randomOutcomes,
    chestKeyOpens,
    mergeResultName,
    buffDurationSeconds,
    relicIsCleanse,
    scrollSkillMaxRank,
    sources,
    seasons: projectItemSeasons(model, params.id),
    treasureLocation,
    buffEffect: consumableBuffEffect,
    recipeIngredients: sources.recipes[0]
      ? recipeMaterials[
          sources.recipes[0].variant_id ?? sources.recipes[0].recipe_id
        ]
      : undefined,
  });
  const title = itemTitle(item);

  return {
    item,
    maxLevel: progression.max_level,
    chestRewards,
    consumableBuffEffect,
    regionalCooking: getItemRegionalCooking(item.id),
    description,
    title,
    sources,
    usages,
    hasKnownSource,
    acquisitionNotes,
    foodBuffUsesTavernSpirit,
    blockedDuringSeasons,
    hasMapLocation,
    mapLinks,
    fishing_role: fishingRole,
    fishing_effect: fishingEffect,
    recipeMaterials,
    taughtRecipes,
    randomOutcomes,
    packContents,
    treasureLocation,
    essenceTraders,
    veteranMasters,
    augmenters,
    priestesses,
    visualAsset,
    itemIconPaths,
    petVisualAsset,
  };
};
