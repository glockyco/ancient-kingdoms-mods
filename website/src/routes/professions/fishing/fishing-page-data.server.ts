import type Database from "better-sqlite3";

interface FishingSpot {
  id: string;
  name: string;
  level: number;
  tool_required_id: string | null;
  tool_required_name: string | null;
  spawn_count: number;
  zone_count: number;
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

interface FishItem {
  item_id: string;
  item_name: string;
  quality: number;
  tooltip_html: string | null;
  is_trash: boolean;
  cooking_recipe_count: number;
  alchemy_recipe_count: number;
  cooked_recipe_count: number;
}

interface FishingEquipmentItem {
  item_id: string;
  item_name: string;
  quality: number;
  level_required: number;
  tooltip_html: string | null;
  slot: string | null;
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
  fish: FishItem[];
  rod: FishingEquipmentItem | null;
  rods: FishingEquipmentItem[];
  costumePieces: FishingEquipmentItem[];
  foods: FishRecipe[];
  recipes: FishRecipe[];
  potions: FishRecipe[];
  stats: {
    spot_count: number;
    fish_count: number;
    trash_fish_count: number;
    food_count: number;
    potion_count: number;
    recipe_count: number;
    rod_count?: number;
    zone_count: number;
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
        gr.id,
        gr.name,
        gr.level,
        gr.tool_required_id,
        tool.name AS tool_required_name,
        COUNT(DISTINCT grs.id) AS spawn_count,
        COUNT(DISTINCT grs.zone_id) AS zone_count
      FROM gathering_resources gr
      LEFT JOIN gathering_resource_spawns grs ON grs.resource_id = gr.id
      LEFT JOIN items tool ON tool.id = gr.tool_required_id
      WHERE gr.is_fishing_spot = 1
      GROUP BY gr.id
      ORDER BY gr.level, gr.name
    `,
    )
    .all() as Omit<FishingSpot, "zones" | "drops">[];

  const zoneRows = db
    .prepare(
      `
      SELECT DISTINCT gr.id AS spot_id, z.id AS zone_id, z.name AS zone_name
      FROM gathering_resources gr
      JOIN gathering_resource_spawns grs ON grs.resource_id = gr.id
      JOIN zones z ON z.id = grs.zone_id
      WHERE gr.is_fishing_spot = 1
      ORDER BY z.name
    `,
    )
    .all() as Array<{ spot_id: string; zone_id: string; zone_name: string }>;

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

  const fish = db
    .prepare(
      `
      SELECT
        f.item_id,
        i.name AS item_name,
        i.quality,
        i.tooltip_html,
        f.is_trash,
        COUNT(DISTINCT CASE WHEN iur.recipe_type = 'crafting' THEN iur.recipe_id END) AS cooking_recipe_count,
        COUNT(DISTINCT CASE WHEN iur.recipe_type = 'alchemy' THEN iur.recipe_id END) AS alchemy_recipe_count,
        COUNT(DISTINCT CASE WHEN iur.recipe_type = 'crafting' THEN iur.recipe_id END) AS cooked_recipe_count
      FROM fish f
      JOIN items i ON i.id = f.item_id
      LEFT JOIN item_usages_recipe iur ON iur.item_id = f.item_id
      GROUP BY f.item_id
      ORDER BY f.is_trash, i.quality, i.name
    `,
    )
    .all() as FishItem[];

  const rods = db
    .prepare(
      `
      SELECT id AS item_id, name AS item_name, quality, level_required, tooltip_html, slot
      FROM items
      WHERE weapon_category = 'Fishing Rod'
      ORDER BY quality, level_required, name
    `,
    )
    .all() as FishingEquipmentItem[];

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

  const zonesBySpot = new Map<string, FishingSpot["zones"]>();
  for (const row of zoneRows) {
    const zones = zonesBySpot.get(row.spot_id) ?? [];
    zones.push({ id: row.zone_id, name: row.zone_name });
    zonesBySpot.set(row.spot_id, zones);
  }

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

  const spots = spotRows.map((spot) => ({
    ...spot,
    zones: zonesBySpot.get(spot.id) ?? [],
    drops: dropsBySpot.get(spot.id) ?? [],
  }));

  return {
    profession,
    spots,
    fish,
    rod: rods[0] ?? null,
    rods,
    costumePieces,
    foods,
    recipes: foods,
    potions,
    stats: {
      spot_count: spots.length,
      fish_count: fish.filter((item) => !item.is_trash).length,
      trash_fish_count: fish.filter((item) => item.is_trash).length,
      food_count: foods.length,
      potion_count: potions.length,
      recipe_count: foods.length,
      zone_count: new Set(zoneRows.map((row) => row.zone_id)).size,
    },
  };
}
