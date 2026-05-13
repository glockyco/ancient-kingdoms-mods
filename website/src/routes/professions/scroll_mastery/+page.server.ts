import Database from "better-sqlite3";
import type { PageServerLoad } from "./$types";
import { DB_STATIC_PATH } from "$lib/constants/constants";
import type { ObtainabilityNode } from "$lib/types/recipes";
import { buildObtainabilityTree } from "$lib/server/obtainability";

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
  recipe_id: string;
  obtainabilityTree: ObtainabilityNode;
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
    steam_achievement_id: string | null;
    steam_achievement_name: string | null;
  };
  recipes: ScribingRecipe[];
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
  { key: "defense_bonus", label: "Defense" },
  { key: "ward_bonus", label: "Ward" },
  { key: "magic_resist_bonus", label: "Magic resist" },
  { key: "damage_bonus", label: "Damage bonus" },
  { key: "magic_damage_bonus", label: "Magic damage" },
  { key: "speed_bonus", label: "Movement speed" },
  { key: "haste_bonus", label: "Attack speed" },
  { key: "spell_haste_bonus", label: "Cast speed" },
  { key: "healing_per_second_bonus", label: "Health/sec" },
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

function hasPerLevelScaling(json: string | null): boolean {
  const value = parseLinear(json);
  return (
    typeof value?.bonus_per_level === "number" && value.bonus_per_level !== 0
  );
}

function scalingLabel(
  row: RawScrollEffect,
  field: { key: keyof RawScrollEffect; label: string },
): string {
  if (field.key === "healing_per_second_bonus") {
    const value = parseLinear(row.healing_per_second_bonus);
    return typeof value?.base_value === "number" && value.base_value < 0
      ? "Damage/sec"
      : field.label;
  }

  if (field.key === "haste_bonus" || field.key === "spell_haste_bonus") {
    const value = parseLinear(row[field.key] as string | null);
    if (typeof value?.base_value === "number" && value.base_value < 0) {
      return field.key === "haste_bonus"
        ? "Attack speed reduction"
        : "Cast speed reduction";
    }
  }

  return field.label;
}

function scalingLabels(row: RawScrollEffect): string[] {
  const labels: string[] = [];

  if (row.duration_per_level !== 0) {
    labels.push("Duration");
  }

  for (const field of SCALING_FIELDS) {
    if (hasPerLevelScaling(row[field.key] as string | null)) {
      labels.push(scalingLabel(row, field));
    }
  }

  if (row.skill_is_dispel) {
    labels.push("Dispel Resist Reduction");
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

export const load: PageServerLoad = (): ScrollMasteryPageData => {
  const db = new Database(DB_STATIC_PATH, { readonly: true });

  const profession = db
    .prepare(
      `
    SELECT
      id,
      name,
      description,
      category,
      max_level,
      steam_achievement_id,
      steam_achievement_name
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
      s.healing_per_second_bonus
    FROM items i
    JOIN skills s ON s.id = i.scroll_skill_id
    LEFT JOIN scribing_recipes sr ON sr.result_item_id = i.id
    WHERE i.item_type = 'scroll'
      AND i.scroll_skill_id IS NOT NULL
    ORDER BY sr.id IS NULL, i.name
  `,
    )
    .all() as RawScrollEffect[];

  const recipes: ScribingRecipe[] = rawScrollEffects
    .filter((row) => row.recipe_id !== null)
    .map((row) => {
      const visited = new Set<string>();
      const obtainabilityTree = buildObtainabilityTree(
        db,
        row.item_id,
        1,
        0,
        visited,
        true,
      );

      return {
        ...toScrollEffect(row),
        recipe_id: row.recipe_id as string,
        obtainabilityTree,
      };
    });

  const locations = db
    .prepare(
      `
    SELECT id, zone_id, zone_name, sub_zone_name
    FROM scribing_tables
    ORDER BY zone_name, sub_zone_name
  `,
    )
    .all() as StationLocation[];

  db.close();

  return {
    profession,
    recipes,
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
