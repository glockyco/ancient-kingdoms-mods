import type Database from "better-sqlite3";
import {
  getItemSourceSummaries,
  getMinimumSourceLevel,
  groupItemSourceSummaries,
  type ItemSourceSummary,
} from "$lib/server/item-source-summary";

interface FishingSpot {
  id: string;
  resource_id: string;
  name: string;
  level: number;
  tool_required_id: string | null;
  tool_required_name: string | null;
  spawn_count: number;
  zones: Array<{ id: string; name: string }>;
  drops: FishDrop[];
}

interface FishDrop {
  item_id: string;
  item_name: string;
  quality: number;
  tooltip_html: string | null;
  configured_drop_rate: number;
  actual_drop_chance: number | null;
}

interface TrashFishItem {
  item_id: string;
  item_name: string;
  quality: number;
  tooltip_html: string | null;
}

interface FishingEquipmentItem {
  item_id: string;
  item_name: string;
  quality: number;
  level_required: number;
  tooltip_html: string | null;
  slot: string | null;
}

interface FishingRodItem extends FishingEquipmentItem {
  sources: ItemSourceSummary[];
  min_source_level: number | null;
}

interface FishRecipe {
  recipe_id: string;
  result_item_id: string;
  result_item_name: string;
  result_quality: number;
  result_tooltip_html: string | null;
  ingredient_item_id: string;
  ingredient_item_name: string;
  ingredient_tooltip_html: string | null;
  ingredient_quality: number;
  ingredient_amount: number;
  effect_skill_id: string | null;
  effect_skill_name: string | null;
}

export interface FishingPageData {
  profession: {
    id: string;
    name: string;
    description: string;
    category: string;
    max_level: number;
    steam_achievement_id: string | null;
    steam_achievement_name: string | null;
  };
  spots: FishingSpot[];
  trashFish: TrashFishItem[];
  rods: FishingRodItem[];
  costumePieces: FishingEquipmentItem[];
  foods: FishRecipe[];
  potions: FishRecipe[];
  stats: {
    spot_count: number;
    fish_count: number;
    food_count: number;
    rod_count: number;
    potion_count: number;
  };
}

export function loadFishingPageData(db: Database.Database): FishingPageData {
  const profession = db
    .prepare(
      `
      SELECT id, name, description, category, max_level, steam_achievement_id, steam_achievement_name
      FROM professions
      WHERE id = 'fishing'
    `,
    )
    .get() as FishingPageData["profession"];

  const spotRows = db
    .prepare(
      `
      SELECT
        grs.id,
        gr.id AS resource_id,
        gr.name,
        gr.level,
        gr.tool_required_id,
        tool.name AS tool_required_name,
        1 AS spawn_count,
        z.id AS zone_id,
        z.name AS zone_name
      FROM gathering_resources gr
      JOIN gathering_resource_spawns grs ON grs.resource_id = gr.id
      JOIN zones z ON z.id = grs.zone_id
      LEFT JOIN items tool ON tool.id = gr.tool_required_id
      WHERE gr.is_fishing_spot = 1
      ORDER BY gr.level, gr.name, z.name, gr.id, grs.id
    `,
    )
    .all() as Array<
    Omit<FishingSpot, "zones" | "drops"> & {
      zone_id: string;
      zone_name: string;
    }
  >;

  const dropRows = db
    .prepare(
      `
      SELECT
        isg.resource_id,
        i.id AS item_id,
        i.name AS item_name,
        i.quality,
        i.tooltip_html,
        isg.drop_rate AS configured_drop_rate,
        isg.actual_drop_chance
      FROM item_sources_gather isg
      JOIN gathering_resources gr ON gr.id = isg.resource_id
      JOIN items i ON i.id = isg.item_id
      WHERE gr.is_fishing_spot = 1
      ORDER BY gr.level, isg.actual_drop_chance DESC, i.name
    `,
    )
    .all() as Array<FishDrop & { resource_id: string }>;

  const trashFish = db
    .prepare(
      `
      SELECT
        f.item_id,
        i.name AS item_name,
        i.quality,
        i.tooltip_html
      FROM fish f
      JOIN items i ON i.id = f.item_id
      WHERE f.is_trash = 1
      ORDER BY i.quality, i.name
    `,
    )
    .all() as TrashFishItem[];

  const fishStats = db
    .prepare(
      `
      SELECT COUNT(*) AS fish_count
      FROM fish
      WHERE is_trash = 0
    `,
    )
    .get() as { fish_count: number };

  const rodRows = db
    .prepare(
      `
      SELECT id AS item_id, name AS item_name, quality, level_required, tooltip_html, slot
      FROM items
      WHERE weapon_category = 'Fishing Rod'
      ORDER BY quality, level_required, name
    `,
    )
    .all() as FishingEquipmentItem[];

  const sourcesByRodId = groupItemSourceSummaries(
    getItemSourceSummaries(
      db,
      rodRows.map((rod) => rod.item_id),
    ),
  );
  const rods = rodRows.map((rod) => {
    const sources = sourcesByRodId.get(rod.item_id) ?? [];
    return {
      ...rod,
      min_source_level: getMinimumSourceLevel(sources),
      sources,
    };
  });

  const costumePieces = db
    .prepare(
      `
      SELECT id AS item_id, name AS item_name, quality, level_required, tooltip_html, slot
      FROM items
      WHERE id IN ('fishermans_garb', 'fishermans_hat', 'fishermans_trousers')
      ORDER BY CASE id
        WHEN 'fishermans_garb' THEN 1
        WHEN 'fishermans_hat' THEN 2
        WHEN 'fishermans_trousers' THEN 3
        ELSE 4
      END
    `,
    )
    .all() as FishingEquipmentItem[];

  const foods = db
    .prepare(
      `
      SELECT
        cr.id AS recipe_id,
        result.id AS result_item_id,
        result.name AS result_item_name,
        result.quality AS result_quality,
        result.tooltip_html AS result_tooltip_html,
        ingredient.id AS ingredient_item_id,
        ingredient.name AS ingredient_item_name,
        ingredient.tooltip_html AS ingredient_tooltip_html,
        ingredient.quality AS ingredient_quality,
        iur.amount AS ingredient_amount,
        result.food_buff_id AS effect_skill_id,
        result.food_buff_name AS effect_skill_name
      FROM item_usages_recipe iur
      JOIN fish f ON f.item_id = iur.item_id
      JOIN crafting_recipes cr ON cr.id = iur.recipe_id
      JOIN items result ON result.id = cr.result_item_id
      JOIN items ingredient ON ingredient.id = iur.item_id
      WHERE iur.recipe_type = 'crafting'
        AND cr.station_type = 'cooking'
      ORDER BY result.quality, result.name, ingredient.name
    `,
    )
    .all() as FishRecipe[];

  const potions = db
    .prepare(
      `
      SELECT
        ar.id AS recipe_id,
        result.id AS result_item_id,
        result.name AS result_item_name,
        result.quality AS result_quality,
        result.tooltip_html AS result_tooltip_html,
        ingredient.id AS ingredient_item_id,
        ingredient.name AS ingredient_item_name,
        ingredient.tooltip_html AS ingredient_tooltip_html,
        ingredient.quality AS ingredient_quality,
        iur.amount AS ingredient_amount,
        result.potion_buff_id AS effect_skill_id,
        result.potion_buff_name AS effect_skill_name
      FROM item_usages_recipe iur
      JOIN fish f ON f.item_id = iur.item_id
      JOIN alchemy_recipes ar ON ar.id = iur.recipe_id
      JOIN items result ON result.id = ar.result_item_id
      JOIN items ingredient ON ingredient.id = iur.item_id
      WHERE iur.recipe_type = 'alchemy'
      ORDER BY result.quality, result.name, ingredient.name
    `,
    )
    .all() as FishRecipe[];

  const dropsBySpot = new Map<string, FishDrop[]>();
  for (const row of dropRows) {
    const drops = dropsBySpot.get(row.resource_id) ?? [];
    drops.push({
      item_id: row.item_id,
      item_name: row.item_name,
      quality: row.quality,
      tooltip_html: row.tooltip_html,
      configured_drop_rate: row.configured_drop_rate,
      actual_drop_chance: row.actual_drop_chance,
    });
    dropsBySpot.set(row.resource_id, drops);
  }

  const spots = spotRows.map(({ zone_id, zone_name, ...spot }) => ({
    ...spot,
    zones: [{ id: zone_id, name: zone_name }],
    drops: dropsBySpot.get(spot.resource_id) ?? [],
  }));

  return {
    profession,
    spots,
    trashFish,
    rods,
    costumePieces,
    foods,
    potions,
    stats: {
      spot_count: spots.reduce((total, spot) => total + spot.spawn_count, 0),
      fish_count: fishStats.fish_count,
      food_count: foods.length,
      rod_count: rods.length,
      potion_count: potions.length,
    },
  };
}
