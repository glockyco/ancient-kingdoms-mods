import Database from "better-sqlite3";
import { error } from "@sveltejs/kit";
import type { PageServerLoad, EntryGenerator } from "./$types";
import { DB_SOURCE_PATH } from "$lib/constants/constants";
import type { ItemDetailPageData } from "$lib/types/items";
import type { EntityVisualAsset } from "$lib/types/visual-assets";
import type { Item } from "$lib/queries/items";
import { itemDescription, itemTitle } from "$lib/server/meta-description";
import { loadItemAcquisition, loadAcquisition } from "$lib/server/acquisition";
import { loadAcquisitionItems } from "$lib/acquisition/items";
import { projectAcquisitionNames } from "$lib/acquisition/projections";
import { getItemIconPaths } from "$lib/server/item-icon-paths";
import { getItemMapBounds } from "$lib/queries/map-search";
import { skillEffectInputs } from "$lib/skills/skillEffects.server";
import { formatSkillEffect } from "$lib/utils/formatSkillEffect";

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

// Load item data at build time (for SSR/prerendering)
export const load: PageServerLoad = async ({
  params,
}): Promise<
  ItemDetailPageData & {
    hasMapLocation: boolean;
    hasKnownSource: boolean;
    foodBuffUsesTavernSpirit: boolean;
    /** Effect summary of the potion or food buff at the rank the item applies. */
    consumableBuffEffect: string | null;
  }
> => {
  const db = new Database(DB_SOURCE_PATH, { readonly: true });

  const item = db.prepare("SELECT * FROM items WHERE id = ?").get(params.id) as
    Item | undefined;

  if (!item) {
    db.close();
    throw error(404, `Item not found: ${params.id}`);
  }

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
          "Each Fisherman set piece adds 2 percentage points to the catch chance of every fish available at the Fishing Spot.",
          "This bonus applies only after you get a bite. Bite chance is determined by your Fishing skill, the Fishing Spot tier, and your rod.",
        ],
        fishing_page_href: "/professions/fishing#calculator",
      }
    : null;

  const progression = db
    .prepare("SELECT max_level FROM progression_rules WHERE id = 1")
    .get() as { max_level: number } | undefined;
  if (!progression) throw new Error("Missing progression_rules.max_level");

  const execute = async (
    sql: string,
    bindings: readonly (string | number | null)[],
  ) => db.prepare(sql).all(...bindings) as Record<string, unknown>[];
  const acquisition = await loadItemAcquisition(execute, [params.id]);
  const sources = acquisition.sources[params.id];
  const usages = acquisition.usages[params.id];
  const acquisitionItems = await loadAcquisitionItems(
    execute,
    acquisition.model,
  );
  const hasKnownSource = sources.hasKnownSource;
  const hasMapLocation = (await getItemMapBounds(params.id, execute)) !== null;
  const packContents = sources.inspection.fixedContents.flatMap((outcome) =>
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
  const randomOutcomes = sources.inspection.randomOutcomes.flatMap((outcome) =>
    outcome.itemId
      ? [
          {
            item_id: outcome.itemId,
            item_name: acquisitionItems[outcome.itemId]?.name ?? outcome.itemId,
          },
        ]
      : [],
  );
  const recipeMethods = sources.methods.filter(
    (method) => method.kind === "recipe",
  );
  const recipeIngredients =
    recipeMethods.length === 1
      ? recipeMethods[0].costGroups
          .flatMap((group) => group.inputs)
          .flatMap((input) =>
            input.item_id
              ? [
                  {
                    item_name:
                      acquisitionItems[input.item_id]?.name ?? input.item_id,
                    amount: input.amount,
                  },
                ]
              : [],
          )
      : undefined;

  const requirementModel = await loadAcquisition(execute, {
    kind: "requirements",
    entities: [{ kind: "item", id: params.id }],
  });
  const itemRequirements =
    requirementModel.requirements.get(`item:${params.id}`) ?? [];
  const taughtRecipeId = item.recipe_potion_learned_id
    ? ((
        db
          .prepare("SELECT id FROM alchemy_recipes WHERE result_item_id = ?")
          .get(item.recipe_potion_learned_id) as { id: string } | undefined
      )?.id ?? null)
    : null;
  const recipeTeachers = db
    .prepare(
      `SELECT i.id,i.name,v.public_path AS icon_path FROM items i
    LEFT JOIN visual_assets v ON v.domain='item' AND v.entity_id=i.id AND v.kind='icon'
    WHERE i.recipe_potion_learned_id=? ORDER BY i.name,i.id`,
    )
    .all(params.id) as ItemDetailPageData["recipeTeachers"];
  const digUse = usages.find((use) => use.method?.kind === "treasure_dig");
  const digLocation = digUse?.useLocations[0];
  const digRewardId = digUse?.method?.outputs.find(
    (output) => output.item_id,
  )?.item_id;
  const treasureLocation = digLocation
    ? {
        zone_name: digLocation.name,
        reward_name: digRewardId
          ? (acquisitionItems[digRewardId]?.name ?? null)
          : null,
      }
    : null;

  const mergeOutputId = usages
    .find((use) => use.method?.kind === "merge")
    ?.method?.outputs.find((output) => output.item_id)?.item_id;
  const mergeResultName = mergeOutputId
    ? (acquisitionItems[mergeOutputId]?.name ?? null)
    : null;
  // Source: server-scripts/BuffSkill.cs:7-12 — buffTime is a LinearFloat with
  // baseValue = duration_base. Potion buff level is resolved at use time by
  // GetBuffLevelWithElixirEndurance (server-scripts/PotionItem.cs:24-39,
  // 143-145); mercenary utility potions pass Networkowner
  // (server-scripts/Pet.cs:2089-2113). Runtime veteran rank is unknown here.
  const buffId =
    item.potion_buff_id || item.food_buff_id || item.relic_buff_id || null;
  let buffDurationSeconds: number | null = null;
  let relicIsCleanse = false;
  let foodBuffUsesTavernSpirit = false;
  if (buffId) {
    const row = db
      .prepare(
        "SELECT duration_base, is_cleanse, buff_category FROM skills WHERE id = ?",
      )
      .get(buffId) as
      | {
          duration_base: number;
          is_cleanse: number;
          buff_category: string | null;
        }
      | undefined;
    buffDurationSeconds = row?.duration_base ?? null;
    relicIsCleanse = Boolean(item.relic_buff_id && row?.is_cleanse);
    foodBuffUsesTavernSpirit = Boolean(
      item.food_buff_id &&
      (row?.buff_category === "Food" || row?.buff_category === "Drink"),
    );
  }
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
    randomOutcomes,
    requirements: itemRequirements,
    mergeResultName,
    buffDurationSeconds,
    relicIsCleanse,
    sources,
    treasureLocation,
    buffEffect: consumableBuffEffect,
    recipeIngredients,
  });
  const title = itemTitle(item, { family: "Item" });

  return {
    item,
    maxLevel: progression.max_level,
    consumableBuffEffect,
    description,
    title,
    sources,
    usages,
    hasKnownSource,
    foodBuffUsesTavernSpirit,
    hasMapLocation,
    fishing_role: fishingRole,
    fishing_effect: fishingEffect,
    acquisitionItems,
    acquisitionNames: projectAcquisitionNames(acquisition.model),
    itemRequirements,
    taughtRecipeId,
    recipeTeachers,
    veteranMasters,
    augmenters,
    visualAsset,
    itemIconPaths,
    petVisualAsset,
  };
};
