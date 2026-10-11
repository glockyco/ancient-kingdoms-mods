import {
  addF32,
  ceilToInt,
  floorToInt,
  iround,
  multiplyF32,
} from "$lib/planner/engine-math";
import type { Calculation } from "$lib/types/calculation";
import type { LinearValue, SkillDetailView } from "$lib/types/skills";

/**
 * Inputs for worked examples. Round numbers keep the arithmetic easy to follow;
 * they illustrate the rule and are not typical values for any level.
 */
const EXAMPLE = {
  maxHealth: 2000,
  maxMana: 1500,
  missingMana: 600,
  intelligence: 100,
  spellHaste: 0.2,
  skillDamage: 1000,
} as const;

const number = (value: number): string => value.toLocaleString("en-US");
const percent = (value: number): string =>
  `${Number((value * 100).toFixed(2))}%`;
const seconds = (value: number): string => `${Number(value.toFixed(2))}s`;

// Source: server-scripts/LinearFloat.cs:10-13 — Get returns bonusPerLevel * (level - 1) + baseValue in float.
function atLevel(value: LinearValue, level: number): number {
  return addF32(
    multiplyF32(value.bonus_per_level, level - 1),
    value.base_value,
  );
}

/** "150% at skill level 1, +12.5% per level (200% at level 5)". */
export function describeLevelScaling(
  value: LinearValue,
  maxLevel: number,
  format: (value: number) => string,
): string {
  if (value.bonus_per_level === 0 || maxLevel <= 1) {
    return format(value.base_value);
  }
  const sign = value.bonus_per_level > 0 ? "+" : "−";
  return `${format(value.base_value)} at skill level 1, ${sign}${format(Math.abs(value.bonus_per_level))} per level (${format(atLevel(value, maxLevel))} at level ${maxLevel})`;
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

  const spent = ceilToInt(multiplyF32(EXAMPLE.maxHealth, atLevel(cost, 1)));
  const intelligenceBonus = multiplyF32(
    Math.max(0, EXAMPLE.intelligence),
    perIntelligence,
  );
  const healPercentage = addF32(atLevel(healing, 1), intelligenceBonus);
  const healed = iround(multiplyF32(spent, healPercentage));

  return {
    steps: [
      {
        name: "Health spent",
        expression: `${describeLevelScaling(cost, skill.max_level, percent)} of your maximum Health`,
        rounding: "up",
      },
      {
        name: "Heal percentage",
        expression: `${describeLevelScaling(healing, skill.max_level, percent)}, plus ${percent(perIntelligence)} per point of Intelligence`,
      },
      {
        name: "Healing",
        expression: "Health spent × heal percentage",
        rounding: "nearest",
      },
    ],
    example: {
      given: [
        "skill level 1",
        `${number(EXAMPLE.maxHealth)} maximum Health`,
        `${number(EXAMPLE.intelligence)} Intelligence`,
      ],
      result: `Heals ${number(healed)} Health`,
      working: [
        `Health spent: ${percent(atLevel(cost, 1))} of ${number(EXAMPLE.maxHealth)} = ${number(spent)}`,
        `Heal percentage: ${percent(atLevel(healing, 1))} + ${number(EXAMPLE.intelligence)} × ${percent(perIntelligence)} = ${percent(healPercentage)}`,
        `Healing: ${number(spent)} × ${percent(healPercentage)} = ${number(healed)}`,
      ],
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

  const spent = ceilToInt(multiplyF32(EXAMPLE.maxHealth, atLevel(cost, 1)));
  const rolled = floorToInt(multiplyF32(EXAMPLE.maxMana, atLevel(restore, 1)));
  const restored = Math.min(rolled, EXAMPLE.missingMana);

  const percentageSteps = shared
    ? [
        {
          name: "Conversion percentage",
          expression: describeLevelScaling(cost, skill.max_level, percent),
        },
      ]
    : [
        {
          name: "Health percentage",
          expression: describeLevelScaling(cost, skill.max_level, percent),
        },
        {
          name: "Mana percentage",
          expression: describeLevelScaling(restore, skill.max_level, percent),
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
    example: {
      given: [
        "skill level 1",
        `${number(EXAMPLE.maxHealth)} maximum Health`,
        `${number(EXAMPLE.maxMana)} maximum Mana`,
        `${number(EXAMPLE.missingMana)} missing Mana`,
      ],
      result: `Spends ${number(spent)} Health and restores ${number(restored)} Mana`,
      working: [
        `Health spent: ${percent(atLevel(cost, 1))} of ${number(EXAMPLE.maxHealth)} = ${number(spent)}`,
        `Mana restored: ${percent(atLevel(restore, 1))} of ${number(EXAMPLE.maxMana)} = ${number(rolled)}${rolled > EXAMPLE.missingMana ? `, capped at ${number(restored)}` : ""}`,
      ],
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
  const baseCast = atLevel(castTime, 1);
  const channelTime = Math.max(
    0.05,
    skill.is_spell ? multiplyF32(baseCast, 1 - EXAMPLE.spellHaste) : baseCast,
  );
  const pulseTimes = Array.from(
    { length: pulses },
    (_, index) => (channelTime * (index + 1)) / pulses,
  );
  const share = Math.floor(EXAMPLE.skillDamage / pulses);
  const remainder = EXAMPLE.skillDamage % pulses;
  const pulseDamage = Array.from(
    { length: pulses },
    (_, index) => share + (index < remainder ? 1 : 0),
  );
  const fraction = PULSE_FRACTIONS[pulses] ?? `1/${pulses}`;

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
    example: {
      given: [
        `${seconds(baseCast)} cast time`,
        ...(skill.is_spell
          ? [`${percent(EXAMPLE.spellHaste)} spell haste`]
          : []),
        `${number(EXAMPLE.skillDamage)} full skill damage`,
      ],
      result: `Pulses deal ${pulseDamage
        .map(
          (damage, index) =>
            `${number(damage)}${index === 0 ? " damage" : ""} at ${seconds(pulseTimes[index])}`,
        )
        .join(", ")}`,
      working: [
        skill.is_spell
          ? `Channel time: ${seconds(baseCast)} × (1 − ${percent(EXAMPLE.spellHaste)}) = ${seconds(channelTime)}`
          : `Channel time: ${seconds(channelTime)}`,
        `Pulse damage: ${number(EXAMPLE.skillDamage)} ÷ ${pulses} = ${number(share)}${remainder > 0 ? ` with ${number(remainder)} left over` : ""}`,
      ],
    },
  };
}
