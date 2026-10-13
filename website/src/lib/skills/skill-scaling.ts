import type { LinearValue, SkillDetailView } from "$lib/types/skills";
import { formatNumber, formatPercent } from "./skill-format";

// Level scaling table: columns for fields with non-zero bonus_per_level
export interface ScalingColumn {
  label: string;
  field: LinearValue;
  isPercent: boolean;
  suffix: string;
}

const SCALING_FIELDS: Array<{
  key: keyof SkillDetailView;
  label: string;
  isPercent: boolean;
  suffix: string;
}> = [
  {
    key: "health_cost_percent",
    label: "Health cost %",
    isPercent: true,
    suffix: "",
  },
  {
    key: "mana_restored_percent",
    label: "Max Mana restored %",
    isPercent: true,
    suffix: "",
  },
  {
    key: "healing_percent",
    label: "Skill heal %",
    isPercent: true,
    suffix: "",
  },
  {
    key: "lifetap_healing_percent_bonus",
    label: "Lifetap healing bonus",
    isPercent: true,
    suffix: "",
  },
  {
    key: "damage_over_time_execute_bonus",
    label: "DoT execute bonus",
    isPercent: true,
    suffix: "",
  },
  { key: "damage", label: "Damage", isPercent: false, suffix: "" },
  {
    key: "damage_percent",
    label: "Damage %",
    isPercent: true,
    suffix: "",
  },
  { key: "mana_cost", label: "Mana Cost", isPercent: false, suffix: "" },
  {
    key: "energy_cost",
    label: "Rage Cost",
    isPercent: false,
    suffix: "",
  },
  { key: "cast_time", label: "Cast Time", isPercent: false, suffix: "s" },
  { key: "cooldown", label: "Cooldown", isPercent: false, suffix: "s" },
  { key: "cast_range", label: "Range", isPercent: false, suffix: "" },
  {
    key: "heals_health",
    label: "Heals Health",
    isPercent: false,
    suffix: "",
  },
  {
    key: "heals_mana",
    label: "Heals Mana",
    isPercent: false,
    suffix: "",
  },
  { key: "aggro", label: "Aggro", isPercent: false, suffix: "" },
  {
    key: "lifetap_percent",
    label: "Lifetap",
    isPercent: true,
    suffix: "",
  },
  {
    key: "stun_chance",
    label: "Stun Chance",
    isPercent: true,
    suffix: "",
  },
  {
    key: "stun_time",
    label: "Stun Duration",
    isPercent: false,
    suffix: "s",
  },
  {
    key: "fear_chance",
    label: "Fear Chance",
    isPercent: true,
    suffix: "",
  },
  {
    key: "fear_time",
    label: "Fear Duration",
    isPercent: false,
    suffix: "s",
  },
  {
    key: "knockback_chance",
    label: "Knockback",
    isPercent: true,
    suffix: "",
  },
  {
    key: "health_max_bonus",
    label: "Max Health",
    isPercent: false,
    suffix: "",
  },
  {
    key: "health_max_percent_bonus",
    label: "Max Health %",
    isPercent: true,
    suffix: "",
  },
  {
    key: "mana_max_bonus",
    label: "Max Mana",
    isPercent: false,
    suffix: "",
  },
  {
    key: "mana_max_percent_bonus",
    label: "Max Mana %",
    isPercent: true,
    suffix: "",
  },
  {
    key: "energy_max_bonus",
    label: "Max Rage",
    isPercent: false,
    suffix: "",
  },
  {
    key: "defense_bonus",
    label: "Armor Class",
    isPercent: false,
    suffix: "",
  },
  { key: "ward_bonus", label: "Ward", isPercent: false, suffix: "" },
  {
    key: "magic_resist_bonus",
    label: "Magic Resist",
    isPercent: false,
    suffix: "",
  },
  {
    key: "damage_bonus",
    label: "Attack Power",
    isPercent: false,
    suffix: "",
  },
  {
    key: "damage_percent_bonus",
    label: "Attack Power %",
    isPercent: true,
    suffix: "",
  },
  {
    key: "magic_damage_bonus",
    label: "Spell Power",
    isPercent: false,
    suffix: "",
  },
  {
    key: "magic_damage_percent_bonus",
    label: "Spell Power %",
    isPercent: true,
    suffix: "",
  },
  {
    key: "haste_bonus",
    label: "Haste",
    isPercent: true,
    suffix: "",
  },
  {
    key: "spell_haste_bonus",
    label: "Spell Casting Haste",
    isPercent: true,
    suffix: "",
  },
  {
    key: "speed_bonus",
    label: "Movement Speed",
    isPercent: false,
    suffix: "",
  },
  {
    key: "critical_chance_bonus",
    label: "Critical Strike",
    isPercent: true,
    suffix: "",
  },
  {
    key: "critical_resist_bonus",
    label: "Critical Resist",
    isPercent: true,
    suffix: "",
  },
  {
    key: "accuracy_bonus",
    label: "Accuracy",
    isPercent: true,
    suffix: "",
  },
  {
    key: "block_chance_bonus",
    label: "Block Chance",
    isPercent: true,
    suffix: "",
  },
  {
    key: "fear_resist_chance_bonus",
    label: "Fear Resist",
    isPercent: true,
    suffix: "",
  },
  {
    key: "damage_shield",
    label: "Damage Shield",
    isPercent: false,
    suffix: "",
  },
  {
    key: "cooldown_reduction_percent",
    label: "Cooldown Reduction",
    isPercent: true,
    suffix: "",
  },
  {
    key: "heal_on_hit_percent",
    label: "Heal on Hit",
    isPercent: true,
    suffix: "",
  },
  {
    key: "healing_per_second_bonus",
    label: "Health/sec",
    isPercent: false,
    suffix: "",
  },
  {
    key: "health_percent_per_second_bonus",
    label: "Health %/sec",
    isPercent: true,
    suffix: "",
  },
  {
    key: "mana_per_second_bonus",
    label: "Mana/sec",
    isPercent: false,
    suffix: "",
  },
  {
    key: "mana_percent_per_second_bonus",
    label: "Mana %/sec",
    isPercent: true,
    suffix: "",
  },
  {
    key: "energy_per_second_bonus",
    label: "Rage/sec",
    isPercent: false,
    suffix: "",
  },
  {
    key: "energy_percent_per_second_bonus",
    label: "Rage %/sec",
    isPercent: true,
    suffix: "",
  },
  {
    key: "strength_bonus",
    label: "Strength",
    isPercent: false,
    suffix: "",
  },
  {
    key: "intelligence_bonus",
    label: "Intelligence",
    isPercent: false,
    suffix: "",
  },
  {
    key: "dexterity_bonus",
    label: "Dexterity",
    isPercent: false,
    suffix: "",
  },
  {
    key: "constitution_bonus",
    label: "Constitution",
    isPercent: false,
    suffix: "",
  },
  {
    key: "wisdom_bonus",
    label: "Wisdom",
    isPercent: false,
    suffix: "",
  },
  {
    key: "charisma_bonus",
    label: "Charisma",
    isPercent: false,
    suffix: "",
  },
  {
    key: "poison_resist_bonus",
    label: "Poison Resist",
    isPercent: false,
    suffix: "",
  },
  {
    key: "fire_resist_bonus",
    label: "Fire Resist",
    isPercent: false,
    suffix: "",
  },
  {
    key: "cold_resist_bonus",
    label: "Cold Resist",
    isPercent: false,
    suffix: "",
  },
  {
    key: "disease_resist_bonus",
    label: "Disease Resist",
    isPercent: false,
    suffix: "",
  },
];

export function scalingColumns(
  skill: SkillDetailView,
  scrollOnly = false,
): ScalingColumn[] {
  const cols: ScalingColumn[] = [];

  // Duration has its own format (not a LinearValue)
  if (!skill.is_necromancer_reaper_form && skill.duration_per_level > 0) {
    cols.push({
      label: "Duration",
      field: {
        base_value: skill.duration_base,
        bonus_per_level: skill.duration_per_level,
      },
      isPercent: false,
      suffix: "s",
    });
  }

  for (const def of SCALING_FIELDS) {
    // Source: server-scripts/ScrollItem.cs:UseAfterCast; server-scripts/PlayerInventory.cs:StartScrollCast — scrolls apply directly, without skill costs or timers.
    if (
      scrollOnly &&
      ["mana_cost", "energy_cost", "cast_time", "cooldown"].includes(def.key)
    )
      continue;
    const sharedConversion =
      skill.is_necromancer_blood_pact &&
      skill.health_cost_percent?.base_value ===
        skill.mana_restored_percent?.base_value &&
      skill.health_cost_percent?.bonus_per_level ===
        skill.mana_restored_percent?.bonus_per_level;
    if (sharedConversion && def.key === "mana_restored_percent") continue;
    const val = skill[def.key] as LinearValue | null;
    if (val && val.bonus_per_level !== 0) {
      const isNegativeRegen =
        def.key === "healing_per_second_bonus" ||
        def.key === "health_percent_per_second_bonus";
      const field =
        isNegativeRegen && val.base_value < 0
          ? {
              base_value: Math.abs(val.base_value),
              bonus_per_level: Math.abs(val.bonus_per_level),
            }
          : val;
      // Source: server-scripts/Skills.cs:1617-1623 — Reaper Form drains the caster's maximum Health each second.
      const label =
        def.key === "healing_per_second_bonus" && val.base_value < 0
          ? "Damage/sec"
          : def.key === "health_percent_per_second_bonus" && val.base_value < 0
            ? skill.is_necromancer_reaper_form
              ? "Self Health drain %/sec"
              : "Damage %/sec"
            : sharedConversion && def.key === "health_cost_percent"
              ? "Conversion %"
              : def.label;

      cols.push({
        label,
        field,
        isPercent: def.isPercent,
        suffix: def.suffix,
      });
    }
  }

  return cols;
}

export function computeScalingValue(col: ScalingColumn, level: number): string {
  const raw = col.field.base_value + col.field.bonus_per_level * (level - 1);
  if (col.isPercent) {
    return formatPercent(raw);
  }
  return `${formatNumber(col.suffix === "s" ? Math.max(0, raw) : raw)}${col.suffix}`;
}

export function showLevelScaling(
  skill: SkillDetailView,
  columns: ScalingColumn[],
  hasScrollMasteryScaling: boolean,
): boolean {
  return skill.max_level > 1 && (columns.length > 0 || hasScrollMasteryScaling);
}
