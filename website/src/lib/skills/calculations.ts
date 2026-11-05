import { formatStat, statName } from "$lib/stats";
import {
  atRank,
  describeRankScaling,
  formatSeconds as seconds,
  rankWorkingLines,
} from "$lib/calculation/format";
import {
  formatNumber as number,
  formatPercent as percent,
} from "$lib/utils/format";
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
} from "$lib/calculation/unity-math";
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
        name: `${statName("health")} Cost Percentage`,
        expression: describeRankScaling(cost, skill.max_level, (value) =>
          percent(value, { decimals: 2, preserveNonzero: true }),
        ),
      },
      {
        name: `${statName("health")} Spent`,
        expression: "Maximum Hit Points × Hit Points Cost Percentage",
        rounding: "up",
      },
      {
        name: "Skill Heal Percentage",
        expression: describeRankScaling(healing, skill.max_level, (value) =>
          percent(value, { decimals: 2, preserveNonzero: true }),
        ),
      },
      {
        name: `${statName("intelligence")} Heal Percentage`,
        expression: `${percent(perIntelligence, { decimals: 2, preserveNonzero: true })} per point of Intelligence above 0`,
      },
      {
        name: "Heal Percentage",
        expression: "Skill Heal Percentage + Intelligence Heal Percentage",
      },
      {
        name: "Healing",
        expression: "Hit Points Spent × Heal Percentage",
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
          `${formatStat("health", maxHealth)} maximum Hit Points`,
          `${formatStat("intelligence", intelligence)} Intelligence`,
        ],
        result: `Heals ${number(healed)} Hit Points before critical heals. Healing cannot exceed the recipient's missing Hit Points`,
        working: [
          ...rankWorkingLines(
            "Hit Points Cost Percentage",
            cost,
            rank,
            (value) => percent(value, { decimals: 2, preserveNonzero: true }),
          ),
          `${statName("health")} Spent: ${formatStat("health", maxHealth)} × ${percent(costShare, { decimals: 2, preserveNonzero: true })} = ${number(spent)}, rounded up`,
          ...rankWorkingLines("Skill Heal Percentage", healing, rank, (value) =>
            percent(value, { decimals: 2, preserveNonzero: true }),
          ),
          `${statName("intelligence")} Heal Percentage: ${formatStat("intelligence", Math.max(0, intelligence))} × ${percent(perIntelligence, { decimals: 2, preserveNonzero: true })} = ${percent(intelligenceShare, { decimals: 2, preserveNonzero: true })}`,
          `Heal Percentage: ${percent(atRank(healing, rank), { decimals: 2, preserveNonzero: true })} + ${percent(intelligenceShare, { decimals: 2, preserveNonzero: true })} = ${percent(healPercentage, { decimals: 2, preserveNonzero: true })}`,
          `Healing: ${number(spent)} × ${percent(healPercentage, { decimals: 2, preserveNonzero: true })} = ${number(healed)}, rounded`,
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
          name: "Conversion Percentage",
          expression: describeRankScaling(cost, skill.max_level, (value) =>
            percent(value, { decimals: 2, preserveNonzero: true }),
          ),
        },
      ]
    : [
        {
          name: `${statName("health")} Percentage`,
          expression: describeRankScaling(cost, skill.max_level, (value) =>
            percent(value, { decimals: 2, preserveNonzero: true }),
          ),
        },
        {
          name: `${statName("mana")} Percentage`,
          expression: describeRankScaling(restore, skill.max_level, (value) =>
            percent(value, { decimals: 2, preserveNonzero: true }),
          ),
        },
      ];

  return {
    steps: [
      ...percentageSteps,
      {
        name: `${statName("health")} Spent`,
        expression: `${shared ? "Conversion" : "Hit Points"} Percentage × your maximum Hit Points`,
        rounding: "up",
      },
      {
        name: `${statName("mana")} from Conversion`,
        expression: `${shared ? "Conversion" : "Mana"} Percentage × your maximum Mana`,
        rounding: "down",
      },
      {
        name: `Missing ${statName("mana")}`,
        expression: "Your maximum Mana − current Mana",
      },
      {
        name: `${statName("mana")} Restored`,
        expression: "Smaller of Mana from Conversion and your Missing Mana",
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
          `${formatStat("health", maxHealth)} maximum Hit Points`,
          `${formatStat("mana", maxMana)} maximum Mana`,
          `${formatStat("mana", currentMana)} current Mana`,
        ],
        result: `Spends ${number(spent)} Hit Points and restores ${number(restored)} Mana`,
        working: [
          ...(shared
            ? rankWorkingLines("Conversion Percentage", cost, rank, (value) =>
                percent(value, { decimals: 2, preserveNonzero: true }),
              )
            : [
                ...rankWorkingLines(
                  "Hit Points Percentage",
                  cost,
                  rank,
                  (value) =>
                    percent(value, { decimals: 2, preserveNonzero: true }),
                ),
                ...rankWorkingLines(
                  `${statName("mana")} Percentage`,
                  restore,
                  rank,
                  (value) =>
                    percent(value, { decimals: 2, preserveNonzero: true }),
                ),
              ]),
          `${statName("health")} Spent: ${percent(atRank(cost, rank), { decimals: 2, preserveNonzero: true })} × ${formatStat("health", maxHealth)} = ${number(spent)}, rounded up`,
          `${statName("mana")} from Conversion: ${percent(atRank(restore, rank), { decimals: 2, preserveNonzero: true })} × ${formatStat("mana", maxMana)} = ${number(rolled)}, rounded down`,
          `Missing ${statName("mana")}: ${formatStat("mana", maxMana)} − ${formatStat("mana", currentMana)} = ${number(missing)}`,
          `${statName("mana")} Restored: smaller of ${number(rolled)} and ${number(missing)} = ${number(restored)}`,
        ],
      };
    },
  };
}

// Source: server-scripts/PlayerSkills.cs:414-415,451-461 — channel duration is Max(0.05, castTime × (1 − spellHasteBonus)) for spells; pulse k lands at duration × (k + 1) / pulses, the last at cast end.
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
        name: "Base Cast Time",
        expression: describeRankScaling(castTime, skill.max_level, seconds),
      },
      {
        name: "Channel Time",
        expression: skill.is_spell
          ? "Base Cast Time × (100% − Spell Casting Haste)"
          : "Base Cast Time",
        limit: `at least ${seconds(0.05)}`,
      },
      {
        name: "Pulse Interval",
        expression: `Channel Time ÷ ${pulses}`,
      },
    ],
    ...(inputs.length > 0 ? { inputs } : {}),
    note: "The first pulse lands one interval after the channel starts, and the last when it ends.",
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
            ? [
                `${percent(spellHaste, { decimals: 2, preserveNonzero: true })} Spell Casting Haste`,
              ]
            : []),
        ],
        result:
          pulses > 1
            ? `Pulses land at ${times.slice(0, -1).join(", ")} and ${times.at(-1)}`
            : `The pulse lands at ${times[0]}`,
        working: [
          ...rankWorkingLines("Base Cast Time", castTime, rank, seconds),
          ...(skill.is_spell
            ? [
                `Channel Time: ${seconds(baseCast)} × (100% − ${percent(spellHaste, { decimals: 2, preserveNonzero: true })}) = ${seconds(rawChannelTime)}${channelTime !== rawChannelTime ? `, raised to the ${seconds(channelTime)} minimum` : ""}`,
              ]
            : channelTime !== baseCast
              ? [
                  `Channel Time: larger of ${seconds(baseCast)} and ${seconds(0.05)} = ${seconds(channelTime)}`,
                ]
              : []),
          `Pulse Interval: ${seconds(channelTime)} ÷ ${pulses} = ${seconds(channelTime / pulses)}`,
        ],
      };
    },
  };
}
