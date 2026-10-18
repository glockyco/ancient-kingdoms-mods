import Database from "better-sqlite3";
import type { PageServerLoad } from "./$types";
import { DB_SOURCE_PATH } from "$lib/constants/constants";
import type { AcquisitionQuery, MethodView } from "$lib/acquisition/types";
import { loadAcquisition } from "$lib/server/acquisition";
import {
  loadAcquisitionItems,
  type AcquisitionItem,
} from "$lib/acquisition/items";
import { statField, statFieldName } from "$lib/stats";
import { projectAcquisitionNames } from "$lib/acquisition/projections";

export const prerender = true;

interface ScrollEffect {
  item_id: string;
  item_name: string;
  tooltip_html: string | null;
  quality: number;
  skill_id: string;
  skill_name: string;
  skill_type: string;
  skill_max_level: number;
  skill_is_dispel: boolean;
  scaling_labels: string[];
}

interface ScribingRecipe extends ScrollEffect {
  id: string;
  recipe_id: string;
  methods: readonly MethodView[];
}

interface StationLocation {
  id: string;
  zone_id: string;
  zone_name: string;
  sub_zone_name: string | null;
}

interface ScrollMasteryPageData {
  profession: {
    id: string;
    name: string;
    description: string;
    category: string;
    max_level: number;
    achievement_id: string;
    achievement_name: string;
  };
  recipes: ScribingRecipe[];
  acquisitionItems: Record<string, AcquisitionItem>;
  acquisitionNames: Readonly<Record<string, string>>;
  locations: StationLocation[];
  stats: {
    craftable_scroll_count: number;
    scaling_scroll_count: number;
    fixed_rank_scroll_count: number;
    scribing_table_count: number;
  };
}

interface RawScrollEffect {
  item_id: string;
  item_name: string;
  tooltip_html: string | null;
  quality: number;
  recipe_id: string | null;
  definition_id: string | null;
  result_amount: number | null;
  skill_id: string;
  skill_name: string;
  skill_type: string;
  skill_max_level: number;
  skill_is_dispel: number;
  duration_per_level: number;
  damage: string | null;
  damage_percent: string | null;
  heals_health: string | null;
  heals_mana: string | null;
  cooldown: string | null;
  cast_time: string | null;
  cast_range: string | null;
  stun_chance: string | null;
  stun_time: string | null;
  fear_chance: string | null;
  fear_time: string | null;
  defense_bonus: string | null;
  ward_bonus: string | null;
  magic_resist_bonus: string | null;
  damage_bonus: string | null;
  magic_damage_bonus: string | null;
  speed_bonus: string | null;
  healing_per_second_bonus: string | null;
  haste_bonus: string | null;
  damage_over_time_type: string | null;
  spell_haste_bonus: string | null;
}

const SCALING_FIELDS: Array<{ key: keyof RawScrollEffect; label: string }> = [
  { key: "damage", label: "Damage" },
  { key: "damage_percent", label: "Damage %" },
  { key: "heals_health", label: "Healing" },
  { key: "heals_mana", label: "Mana heal" },
  { key: "cooldown", label: "Cooldown" },
  { key: "cast_time", label: "Cast time" },
  { key: "cast_range", label: "Range" },
  { key: "stun_chance", label: "Stun chance" },
  { key: "stun_time", label: "Stun duration" },
  { key: "fear_chance", label: "Fear chance" },
  { key: "fear_time", label: "Fear duration" },
  ...(
    [
      "defense_bonus",
      "ward_bonus",
      "magic_resist_bonus",
      "damage_bonus",
      "magic_damage_bonus",
      "speed_bonus",
      "haste_bonus",
      "spell_haste_bonus",
      "healing_per_second_bonus",
    ] satisfies (keyof RawScrollEffect)[]
  ).map((key) => ({ key, label: statFieldName(statField("skill", key)) })),
];

function parseLinear(json: string | null): {
  base_value?: unknown;
  bonus_per_level?: unknown;
} | null {
  if (!json) return null;

  try {
    return JSON.parse(json) as {
      base_value?: unknown;
      bonus_per_level?: unknown;
    };
  } catch {
    return null;
  }
}

function scalingLabels(row: RawScrollEffect): string[] {
  const labels: string[] = [];

  if (row.duration_per_level !== 0) {
    labels.push("Duration");
  }

  for (const field of SCALING_FIELDS) {
    const value = parseLinear(row[field.key] as string | null);
    if (
      typeof value?.bonus_per_level === "number" &&
      value.bonus_per_level !== 0
    ) {
      if (
        field.key === "healing_per_second_bonus" &&
        typeof value?.base_value === "number" &&
        value.base_value < 0
      ) {
        const debuff =
          row.skill_type === "target_debuff" ||
          row.skill_type === "area_debuff";
        if (debuff && !row.damage_over_time_type) {
          throw new Error(
            `Missing damage type for scroll effect ${row.skill_id}`,
          );
        }
        labels.push(
          statFieldName(statField("skill", field.key), "character", {
            damageType: debuff ? row.damage_over_time_type! : undefined,
            drain: !debuff,
          }),
        );
      } else {
        labels.push(field.label);
      }
    }
  }

  if (row.skill_is_dispel) {
    labels.push("Cleanse Resist Reduction");
  }

  return labels;
}

function toScrollEffect(row: RawScrollEffect): ScrollEffect {
  return {
    item_id: row.item_id,
    item_name: row.item_name,
    tooltip_html: row.tooltip_html,
    quality: row.quality,
    skill_id: row.skill_id,
    skill_name: row.skill_name,
    skill_type: row.skill_type,
    skill_max_level: row.skill_max_level,
    skill_is_dispel: Boolean(row.skill_is_dispel),
    scaling_labels: scalingLabels(row),
  };
}

export const load: PageServerLoad =
  async (): Promise<ScrollMasteryPageData> => {
    const db = new Database(DB_SOURCE_PATH, { readonly: true });
    const execute: AcquisitionQuery = async (sql, params) =>
      db.prepare(sql).all(...params) as Record<string, unknown>[];

    const profession = db
      .prepare(
        `
    SELECT
      id,
      name,
      description,
      category,
      max_level,
      achievement_id,
      (SELECT name FROM achievements WHERE id = achievement_id) AS achievement_name
    FROM professions
    WHERE id = 'scroll_mastery'
  `,
      )
      .get() as ScrollMasteryPageData["profession"];

    const rawScrollEffects = db
      .prepare(
        `
    SELECT
      i.id AS item_id,
      i.name AS item_name,
      i.tooltip_html,
      i.quality,
      sr.id AS recipe_id,
      d.id AS definition_id,
      d.result_amount,
      s.id AS skill_id,
      s.name AS skill_name,
      s.skill_type,
      s.max_level AS skill_max_level,
      s.is_dispel AS skill_is_dispel,
      s.duration_per_level,
      s.damage,
      s.damage_percent,
      s.heals_health,
      s.heals_mana,
      s.cooldown,
      s.cast_time,
      s.cast_range,
      s.stun_chance,
      s.stun_time,
      s.fear_chance,
      s.fear_time,
      s.defense_bonus,
      s.ward_bonus,
      s.magic_resist_bonus,
      s.damage_bonus,
      s.magic_damage_bonus,
      s.speed_bonus,
      s.haste_bonus,
      s.spell_haste_bonus,
      s.healing_per_second_bonus,
      s.damage_over_time_type
    FROM items i
    JOIN skills s ON s.id = i.scroll_skill_id
    LEFT JOIN scribing_recipes sr ON sr.result_item_id = i.id
    LEFT JOIN acquisition_recipe_details d ON d.scribing_recipe_id = sr.id
    WHERE i.item_type = 'scroll'
      AND i.scroll_skill_id IS NOT NULL
    ORDER BY sr.id IS NULL, i.name
  `,
      )
      .all() as RawScrollEffect[];

    const recipeModel = await loadAcquisition(execute, {
      kind: "recipes",
      recipeIds: rawScrollEffects.flatMap((row) =>
        row.recipe_id ? [row.recipe_id] : [],
      ),
    });
    const recipes: ScribingRecipe[] = rawScrollEffects
      .filter((row) => row.definition_id !== null)
      .map((row) => {
        const method = recipeModel.methodViews.get(row.definition_id as string);
        if (!method)
          throw new Error(`Missing scribing method ${row.definition_id}`);
        return {
          ...toScrollEffect(row),
          id: row.definition_id as string,
          recipe_id: row.recipe_id as string,
          methods: [method],
        };
      });
    const acquisitionItems = await loadAcquisitionItems(execute, recipeModel);

    const locations = db
      .prepare(
        `
    SELECT DISTINCT s.id, s.zone_id, s.zone_name, s.sub_zone_name
    FROM scribing_tables s
    JOIN acquisition_providers_scribing_tables p ON p.scribing_table_id = s.id
    JOIN acquisition_recipe_details d ON d.id = p.method_id
    ORDER BY s.zone_name, s.sub_zone_name
  `,
      )
      .all() as StationLocation[];

    db.close();

    return {
      profession,
      recipes,
      acquisitionItems,
      acquisitionNames: projectAcquisitionNames(recipeModel),
      locations,
      stats: {
        craftable_scroll_count: recipes.length,
        scaling_scroll_count: recipes.filter(
          (recipe) => recipe.skill_max_level > 1,
        ).length,
        fixed_rank_scroll_count: recipes.filter(
          (recipe) => recipe.skill_max_level <= 1,
        ).length,
        scribing_table_count: locations.length,
      },
    };
  };
