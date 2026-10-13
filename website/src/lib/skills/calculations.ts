import {
  atRank,
  describeRankScaling,
  formatNumber as number,
  formatPercent as percent,
  formatSeconds as seconds,
  rankWorkingLines,
} from "$lib/calculation/format";
import {
  INTELLIGENCE,
  MAX_HEALTH,
  MAX_MANA,
  SPELL_HASTE,
  rankInput,
  situational,
} from "$lib/calculation/inputs";
import {
  addF32,
  ceilToInt,
  floorToInt,
  iround,
  multiplyF32,
} from "$lib/planner/engine-math";
import type { Calculation } from "$lib/types/calculation";
import type { LinearValue, SkillDetailView } from "$lib/types/skills";

// Source: server-scripts/UICharacterInfo.cs:Update — Mana is shown as current / maximum.
const CURRENT_MANA = situational("currentMana", "Current Mana", 400);

function requireLinear(
  value: LinearValue | null,
  field: string,
  skillId: string,
): LinearValue {
  if (!value) throw new Error(`${skillId} has no ${field}`);
  return value;
}

// Source: server-scripts/NecromancerDeathBloomSkill.cs:GetHealthCost,GetIntelligenceBonus,GetHealingAmount — CeilToInt(health.max × healthCostPercent), then RoundToInt(cost × (healingPercent.Get(level) + max(0, INT) × healingPercentPerIntelligence)).
// Source: server-scripts/TargetHealSkill.cs:Apply — critical healing and missing Health modify the final heal.
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
        name: "Health cost percentage",
        expression: describeRankScaling(cost, skill.max_level, percent),
      },
      {
        name: "Health spent",
        expression: "Maximum Health × Health cost percentage",
        rounding: "up",
      },
      {
        name: "Skill heal percentage",
        expression: describeRankScaling(healing, skill.max_level, percent),
      },
      {
        name: "Intelligence heal percentage",
        expression: `${percent(perIntelligence)} per point of Intelligence above 0`,
      },
      {
        name: "Heal percentage",
        expression: "Skill heal percentage + Intelligence heal percentage",
      },
      {
        name: "Healing",
        expression: "Health spent × Heal percentage",
        rounding: "nearest",
      },
    ],
    inputs: [rankInput(skill.max_level), MAX_HEALTH, INTELLIGENCE],
    example: ({ rank, maxHealth, intelligence }) => {
      const costShare = atRank(cost, rank);
      const spent = ceilToInt(multiplyF32(maxHealth, costShare));
      const intelligenceShare = multiplyF32(
        Math.max(0, intelligence),
        perIntelligence,
      );
      const healPercentage = addF32(atRank(healing, rank), intelligenceShare);
      const healed = iround(multiplyF32(spent, healPercentage));
      return {
        given: [
          `rank ${rank}`,
          `${number(maxHealth)} maximum Health`,
          `${number(intelligence)} Intelligence`,
        ],
        result: `Heals ${number(healed)} Health before critical heals and the missing-Health cap`,
        working: [
          ...rankWorkingLines("Health cost percentage", cost, rank, percent),
          `Health spent: ${number(maxHealth)} × ${percent(costShare)} = ${number(spent)}, rounded up`,
          ...rankWorkingLines("Skill heal percentage", healing, rank, percent),
          `Intelligence heal percentage: ${number(Math.max(0, intelligence))} × ${percent(perIntelligence)} = ${percent(intelligenceShare)}`,
          `Heal percentage: ${percent(atRank(healing, rank))} + ${percent(intelligenceShare)} = ${percent(healPercentage)}`,
          `Healing: ${number(spent)} × ${percent(healPercentage)} = ${number(healed)}, rounded`,
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
        expression: `${shared ? "Conversion" : "Health"} percentage × your maximum Health`,
        rounding: "up",
      },
      {
        name: "Mana from conversion",
        expression: `${shared ? "Conversion" : "Mana"} percentage × your maximum Mana`,
        rounding: "down",
      },
      {
        name: "Missing Mana",
        expression: "Maximum Mana − current Mana",
      },
      {
        name: "Mana restored",
        expression: "Smaller of Mana from conversion and your missing Mana",
      },
    ],
    inputs: [rankInput(skill.max_level), MAX_HEALTH, MAX_MANA, CURRENT_MANA],
    example: ({ rank, maxHealth, maxMana, currentMana }) => {
      const missing = Math.max(0, maxMana - currentMana);
      const spent = ceilToInt(multiplyF32(maxHealth, atRank(cost, rank)));
      const rolled = floorToInt(multiplyF32(maxMana, atRank(restore, rank)));
      const restored = Math.min(rolled, missing);
      return {
        given: [
          `rank ${rank}`,
          `${number(maxHealth)} maximum Health`,
          `${number(maxMana)} maximum Mana`,
          `${number(currentMana)} current Mana`,
        ],
        result: `Spends ${number(spent)} Health and restores ${number(restored)} Mana`,
        working: [
          ...(shared
            ? rankWorkingLines("Conversion percentage", cost, rank, percent)
            : [
                ...rankWorkingLines("Health percentage", cost, rank, percent),
                ...rankWorkingLines("Mana percentage", restore, rank, percent),
              ]),
          `Health spent: ${percent(atRank(cost, rank))} × ${number(maxHealth)} = ${number(spent)}, rounded up`,
          `Mana from conversion: ${percent(atRank(restore, rank))} × ${number(maxMana)} = ${number(rolled)}, rounded down`,
          `Missing Mana: ${number(maxMana)} − ${number(currentMana)} = ${number(missing)}`,
          `Mana restored: smaller of ${number(rolled)} and ${number(missing)} = ${number(restored)}`,
        ],
      };
    },
  };
}

// Source: server-scripts/PlayerSkills.cs:361-362,386-396 — channel duration is Max(0.05, castTime × (1 − spellHasteBonus)) for spells; pulse k lands at duration × (k + 1) / pulses, the last at cast end.
export function channelCalculation(skill: SkillDetailView): Calculation {
  const pulses = skill.channel_pulses;
  const castTime = requireLinear(skill.cast_time, "cast_time", skill.id);
  const castScales = castTime.bonus_per_level !== 0;
  const inputs = [
    ...(castScales ? [rankInput(skill.max_level)] : []),
    ...(skill.is_spell ? [SPELL_HASTE] : []),
  ];

  return {
    steps: [
      {
        name: "Base cast time",
        expression: describeRankScaling(castTime, skill.max_level, seconds),
      },
      {
        name: "Channel time",
        expression: skill.is_spell
          ? "Base cast time × (100% − Spell Casting Haste)"
          : "Base cast time",
        limit: `at least ${seconds(0.05)}`,
      },
      {
        name: "Pulse interval",
        expression: `Channel time ÷ ${pulses}. The first pulse lands one interval after the channel starts, and the last when it ends`,
      },
    ],
    ...(inputs.length > 0 ? { inputs } : {}),
    example: ({ rank = skill.max_level, spellHaste = 0 }) => {
      const baseCast = atRank(castTime, rank);
      const rawChannelTime = skill.is_spell
        ? multiplyF32(baseCast, addF32(1, -spellHaste))
        : baseCast;
      const channelTime = Math.max(0.05, rawChannelTime);
      const times = Array.from({ length: pulses }, (_, index) =>
        seconds((channelTime * (index + 1)) / pulses),
      );
      return {
        given: [
          ...(castScales ? [`rank ${rank}`] : []),
          `${seconds(baseCast)} cast time`,
          ...(skill.is_spell
            ? [`${percent(spellHaste)} Spell Casting Haste`]
            : []),
        ],
        result:
          pulses > 1
            ? `Pulses land at ${times.slice(0, -1).join(", ")} and ${times.at(-1)}`
            : `The pulse lands at ${times[0]}`,
        working: [
          ...rankWorkingLines("Base cast time", castTime, rank, seconds),
          ...(skill.is_spell
            ? [
                `Channel time: ${seconds(baseCast)} × (100% − ${percent(spellHaste)}) = ${seconds(rawChannelTime)}${channelTime !== rawChannelTime ? `, limited to ${seconds(channelTime)}` : ""}`,
              ]
            : channelTime !== baseCast
              ? [
                  `Channel time: larger of ${seconds(baseCast)} and ${seconds(0.05)} = ${seconds(channelTime)}`,
                ]
              : []),
          `Pulse interval: ${seconds(channelTime)} ÷ ${pulses} = ${seconds(channelTime / pulses)}`,
        ],
      };
    },
  };
}
