import {
  addF32,
  ceilToInt,
  floorToInt,
  iround,
  multiplyF32,
} from "$lib/planner/engine-math";
import type { Calculation, CalculationInput } from "$lib/types/calculation";
import type { LinearValue, SkillDetailView } from "$lib/types/skills";

/*
 * Example inputs. Round numbers keep the arithmetic easy to follow; they
 * illustrate the rule and are not typical values for any level. Inputs that
 * describe the reader's character share a key, so a value typed on one page
 * carries to the next.
 */
const MAX_HEALTH: CalculationInput = {
  key: "maxHealth",
  label: "Maximum Health",
  value: 2000,
  min: 1,
  max: 1_000_000,
  step: 1,
  remember: true,
};
const MAX_MANA: CalculationInput = {
  key: "maxMana",
  label: "Maximum Mana",
  value: 1500,
  min: 1,
  max: 1_000_000,
  step: 1,
  remember: true,
};
const MISSING_MANA: CalculationInput = {
  key: "missingMana",
  label: "Missing Mana",
  value: 600,
  min: 0,
  max: 1_000_000,
  step: 1,
};
const INTELLIGENCE: CalculationInput = {
  key: "intelligence",
  label: "Intelligence",
  value: 100,
  min: 0,
  max: 100_000,
  step: 1,
  remember: true,
};
const SPELL_HASTE: CalculationInput = {
  key: "spellHaste",
  label: "Spell haste",
  value: 0.2,
  min: -1,
  max: 1,
  step: 1,
  unit: "%",
  remember: true,
};
const SKILL_DAMAGE: CalculationInput = {
  key: "skillDamage",
  label: "Full skill damage",
  value: 1000,
  min: 0,
  max: 10_000_000,
  step: 1,
};

function rankInput(skill: SkillDetailView): CalculationInput {
  return {
    key: "rank",
    label: "Rank",
    value: 1,
    min: 1,
    max: skill.max_level,
    step: 1,
  };
}

const number = (value: number): string => value.toLocaleString("en-US");
const percent = (value: number): string =>
  `${Number((value * 100).toFixed(2))}%`;
const seconds = (value: number): string => `${Number(value.toFixed(2))}s`;

// Source: server-scripts/LinearFloat.cs:10-13 — Get returns bonusPerLevel * (level - 1) + baseValue in float.
function atRank(value: LinearValue, rank: number): number {
  return addF32(multiplyF32(value.bonus_per_level, rank - 1), value.base_value);
}

/** "150% at rank 1, +12.5% per rank (200% at rank 5)". */
export function describeRankScaling(
  value: LinearValue,
  maxRank: number,
  format: (value: number) => string,
): string {
  if (value.bonus_per_level === 0 || maxRank <= 1) {
    return format(value.base_value);
  }
  const sign = value.bonus_per_level > 0 ? "+" : "−";
  return `${format(value.base_value)} at rank 1, ${sign}${format(Math.abs(value.bonus_per_level))} per rank (${format(atRank(value, maxRank))} at rank ${maxRank})`;
}

function requireLinear(
  value: LinearValue | null,
  field: string,
  skillId: string,
): LinearValue {
  if (!value) throw new Error(`${skillId} has no ${field}`);
  return value;
}

// Source: server-scripts/NecromancerDeathBloomSkill.cs:GetHealthCost,GetIntelligenceBonus,GetHealingAmount — CeilToInt(health.max × healthCostPercent), then RoundToInt(cost × (healingPercent.Get(level) + max(0, INT) × healingPercentPerIntelligence)).
export function deathBloomCalculation(skill: SkillDetailView): Calculation {
  const cost = requireLinear(
    skill.health_cost_percent,
    "health_cost_percent",
    skill.id,
  );
  const healing = requireLinear(
    skill.healing_percent,
    "healing_percent",
    skill.id,
  );
  const perIntelligence = skill.healing_percent_per_intelligence;

  return {
    steps: [
      {
        name: "Health spent",
        expression: `${describeRankScaling(cost, skill.max_level, percent)} of your maximum Health`,
        rounding: "up",
      },
      {
        name: "Heal percentage",
        expression: `${describeRankScaling(healing, skill.max_level, percent)}, plus ${percent(perIntelligence)} per point of Intelligence`,
      },
      {
        name: "Healing",
        expression: "Health spent × heal percentage",
        rounding: "nearest",
      },
    ],
    inputs: [rankInput(skill), MAX_HEALTH, INTELLIGENCE],
    example: ({ rank, maxHealth, intelligence }) => {
      const costShare = atRank(cost, rank);
      const spent = ceilToInt(multiplyF32(maxHealth, costShare));
      const healPercentage = addF32(
        atRank(healing, rank),
        multiplyF32(Math.max(0, intelligence), perIntelligence),
      );
      const healed = iround(multiplyF32(spent, healPercentage));
      return {
        given: [
          `rank ${rank}`,
          `${number(maxHealth)} maximum Health`,
          `${number(intelligence)} Intelligence`,
        ],
        result: `Heals ${number(healed)} Health`,
        working: [
          `Health spent: ${percent(costShare)} of ${number(maxHealth)} = ${number(spent)}`,
          `Heal percentage: ${percent(atRank(healing, rank))} + ${number(Math.max(0, intelligence))} × ${percent(perIntelligence)} = ${percent(healPercentage)}`,
          `Healing: ${number(spent)} × ${percent(healPercentage)} = ${number(healed)}`,
        ],
      };
    },
  };
}

// Source: server-scripts/NecromancerBloodPactSkill.cs:GetHealthCost,GetManaRestored,Apply — CeilToInt(health.max × healthCostPercent), FloorToInt(mana.max × manaRestoredPercent), mana gain capped at missing mana.
export function bloodPactCalculation(skill: SkillDetailView): Calculation {
  const cost = requireLinear(
    skill.health_cost_percent,
    "health_cost_percent",
    skill.id,
  );
  const restore = requireLinear(
    skill.mana_restored_percent,
    "mana_restored_percent",
    skill.id,
  );
  const shared =
    cost.base_value === restore.base_value &&
    cost.bonus_per_level === restore.bonus_per_level;

  const percentageSteps = shared
    ? [
        {
          name: "Conversion percentage",
          expression: describeRankScaling(cost, skill.max_level, percent),
        },
      ]
    : [
        {
          name: "Health percentage",
          expression: describeRankScaling(cost, skill.max_level, percent),
        },
        {
          name: "Mana percentage",
          expression: describeRankScaling(restore, skill.max_level, percent),
        },
      ];

  return {
    steps: [
      ...percentageSteps,
      {
        name: "Health spent",
        expression: `${shared ? "conversion" : "Health"} percentage of your maximum Health`,
        rounding: "up",
      },
      {
        name: "Mana restored",
        expression: `${shared ? "conversion" : "Mana"} percentage of your maximum Mana`,
        rounding: "down",
        limit: "at most your missing Mana",
      },
    ],
    inputs: [rankInput(skill), MAX_HEALTH, MAX_MANA, MISSING_MANA],
    example: ({ rank, maxHealth, maxMana, missingMana }) => {
      const missing = Math.min(missingMana, maxMana);
      const spent = ceilToInt(multiplyF32(maxHealth, atRank(cost, rank)));
      const rolled = floorToInt(multiplyF32(maxMana, atRank(restore, rank)));
      const restored = Math.min(rolled, missing);
      return {
        given: [
          `rank ${rank}`,
          `${number(maxHealth)} maximum Health`,
          `${number(maxMana)} maximum Mana`,
          `${number(missing)} missing Mana`,
        ],
        result: `Spends ${number(spent)} Health and restores ${number(restored)} Mana`,
        working: [
          `Health spent: ${percent(atRank(cost, rank))} of ${number(maxHealth)} = ${number(spent)}`,
          `Mana restored: ${percent(atRank(restore, rank))} of ${number(maxMana)} = ${number(rolled)}${rolled > missing ? `, capped at ${number(restored)}` : ""}`,
        ],
      };
    },
  };
}

const PULSE_FRACTIONS: Record<number, string> = {
  2: "half",
  3: "third",
  4: "quarter",
};

// Source: server-scripts/PlayerSkills.cs:361-362,386-396 — channel duration is Max(0.05, castTime × (1 − spellHasteBonus)) for spells; pulse k lands at duration × (k + 1) / pulses, the last at cast end.
// Source: server-scripts/TargetDamageSkill.cs:245-248 — each pulse deals finalDamage / pulses, plus 1 while pulse < finalDamage % pulses.
export function channelCalculation(skill: SkillDetailView): Calculation {
  const pulses = skill.channel_pulses;
  const castTime = requireLinear(skill.cast_time, "cast_time", skill.id);
  const fraction = PULSE_FRACTIONS[pulses] ?? `1/${pulses}`;
  const castScales = castTime.bonus_per_level !== 0;

  return {
    steps: [
      {
        name: "Channel time",
        expression: skill.is_spell
          ? "cast time × (1 − spell haste)"
          : "cast time",
        limit: "at least 0.05s",
      },
      {
        name: "Pulse times",
        expression: `${pulses} pulses, one at the end of each ${fraction} of the channel time`,
      },
      {
        name: "Pulse damage",
        expression: `full skill damage split into ${pulses} whole-number parts, with any remainder added 1 at a time to the earliest pulses`,
      },
    ],
    inputs: [
      ...(castScales ? [rankInput(skill)] : []),
      ...(skill.is_spell ? [SPELL_HASTE] : []),
      SKILL_DAMAGE,
    ],
    example: ({ rank = 1, spellHaste = 0, skillDamage }) => {
      const baseCast = atRank(castTime, rank);
      const channelTime = Math.max(
        0.05,
        skill.is_spell ? multiplyF32(baseCast, 1 - spellHaste) : baseCast,
      );
      const damage = Math.max(0, Math.floor(skillDamage));
      const share = Math.floor(damage / pulses);
      const remainder = damage % pulses;
      return {
        given: [
          ...(castScales ? [`rank ${rank}`] : []),
          `${seconds(baseCast)} cast time`,
          ...(skill.is_spell ? [`${percent(spellHaste)} spell haste`] : []),
          `${number(damage)} full skill damage`,
        ],
        result: `Pulses deal ${Array.from({ length: pulses }, (_, index) => {
          const pulseDamage = share + (index < remainder ? 1 : 0);
          const time = (channelTime * (index + 1)) / pulses;
          return `${number(pulseDamage)}${index === 0 ? " damage" : ""} at ${seconds(time)}`;
        }).join(", ")}`,
        working: [
          skill.is_spell
            ? `Channel time: ${seconds(baseCast)} × (1 − ${percent(spellHaste)}) = ${seconds(channelTime)}`
            : `Channel time: ${seconds(channelTime)}`,
          `Pulse damage: ${number(damage)} ÷ ${pulses} = ${number(share)}${remainder > 0 ? ` with ${number(remainder)} left over` : ""}`,
        ],
      };
    },
  };
}
