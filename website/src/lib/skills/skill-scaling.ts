import type { LinearValue, SkillDetailView } from "$lib/types/skills";
import { formatNumber, formatPercent } from "$lib/utils/format";
import type { StatField } from "$lib/generated/stat-vocabulary";
import { statField, statFieldName, formatStatField } from "$lib/stats";

// Level scaling table: columns for fields with non-zero bonus_per_level
export interface ScalingColumn {
  label: string;
  field: LinearValue;
  isPercent: boolean;
  suffix: string;
  stat?: StatField;
}

const SCALING_FIELDS: Array<{
  key: keyof SkillDetailView;
  label: string;
  isPercent: boolean;
  suffix: string;
  stat?: StatField;
}> = [
  {
    key: "health_cost_percent",
    label: "Hit Points cost %",
    isPercent: true,
    suffix: "",
  },
  {
    key: "mana_restored_percent",
    label: "Mana restored %",
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
  { key: "damage", label: "Skill damage", isPercent: false, suffix: "" },
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
    label: "Heals Hit Points",
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
  ...[
    "health_max_bonus",
    "health_max_percent_bonus",
    "mana_max_bonus",
    "mana_max_percent_bonus",
    "energy_max_bonus",
    "defense_bonus",
    "ward_bonus",
    "magic_resist_bonus",
    "damage_bonus",
    "damage_percent_bonus",
    "magic_damage_bonus",
    "magic_damage_percent_bonus",
    "haste_bonus",
    "spell_haste_bonus",
    "speed_bonus",
    "critical_chance_bonus",
    "critical_resist_bonus",
    "accuracy_bonus",
    "block_chance_bonus",
    "fear_resist_chance_bonus",
    "damage_shield",
    "cooldown_reduction_percent",
    "heal_on_hit_percent",
    "healing_per_second_bonus",
    "health_percent_per_second_bonus",
    "mana_per_second_bonus",
    "mana_percent_per_second_bonus",
    "energy_per_second_bonus",
    "energy_percent_per_second_bonus",
    "strength_bonus",
    "intelligence_bonus",
    "dexterity_bonus",
    "constitution_bonus",
    "wisdom_bonus",
    "charisma_bonus",
    "poison_resist_bonus",
    "fire_resist_bonus",
    "cold_resist_bonus",
    "disease_resist_bonus",
  ].map((key) => {
    const stat = statField("skill", key);
    return {
      key: key as keyof SkillDetailView,
      label: statFieldName(stat),
      stat,
      isPercent: false,
      suffix: "",
    };
  }),
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
      const field = val;
      const label =
        sharedConversion && def.key === "health_cost_percent"
          ? "Conversion %"
          : def.label;

      cols.push({
        label,
        field,
        isPercent: def.isPercent,
        suffix: def.suffix,
        stat: def.stat,
      });
    }
  }

  return cols;
}

export function computeScalingValue(col: ScalingColumn, level: number): string {
  const raw = col.field.base_value + col.field.bonus_per_level * (level - 1);
  if (col.stat) return formatStatField(col.stat, raw, { signed: true });
  if (col.isPercent) {
    return formatPercent(raw, { decimals: 2, preserveNonzero: true });
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
