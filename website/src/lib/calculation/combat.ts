import {
  applyCompassion,
  compassionHealingBonus,
} from "$lib/calculation/virtues";
import type { Calculation, CalculationInput } from "$lib/types/calculation";
import { STATS } from "$lib/generated/stat-vocabulary";
import type { StatId } from "$lib/generated/stat-vocabulary";
import { statName, formatStat } from "$lib/stats";
import {
  addF32,
  multiplyF32,
  divideF32,
  f32,
  iround,
  ceilToInt,
  floorToInt,
  clamp,
} from "$lib/calculation/unity-math";
import {
  WISDOM,
  INTELLIGENCE,
  CONSTITUTION,
  CHARISMA,
  HASTE,
  SPELL_HASTE,
  situational,
} from "$lib/calculation/inputs";
import {
  formatNumber as number,
  formatPercent as percent,
} from "$lib/utils/format";
import {
  formatPercent as rate,
  formatSeconds as seconds,
} from "$lib/calculation/format";

const blockPerArmorClass = STATS.block_chance.perPointOf.find(
  (term) => term.stat === "armor_class",
)!.amount;
const listedValue = (label: string) => situational("baseValue", label, 100);
const percentage = (
  key: string,
  label: string,
  value: number,
): CalculationInput => ({
  ...situational(key, label, value),
  unit: "%",
  max: 10,
});

// Source: server-scripts/Combat.cs:DealDamageAt,GetProbResistMagic — each Armor Class or resist point removes 0.0005 of a landed hit, at most 0.9, and adds 0.0005 to the resist chance; the level term is 0.005 per level within ±0.1; the avoidance chance stays within 0–0.9.
/** Share of a landed hit that each point of Armor Class or the matching resist removes. */
export const REDUCTION_PER_POINT = 0.0005;
/** The largest share of a hit Armor Class or a resist can remove. */
export const MAX_REDUCTION = 0.9;
/** Chance to resist a hit or debuff that each point of the matching resist adds. */
export const RESIST_CHANCE_PER_POINT = 0.0005;
/** Avoidance chance added per level the target is above the attacker. */
export const LEVEL_TERM_PER_LEVEL = 0.005;
/** The largest avoidance change the level difference can make either way. */
export const MAX_LEVEL_TERM = 0.1;
/** The highest block, miss or resist chance. */
export const MAX_AVOIDANCE = 0.9;

/** The defense rates as the reader sees them, for prose that states them. */
export const DEFENSE_RATES = {
  reductionPerPoint: rate(REDUCTION_PER_POINT),
  maxReduction: rate(MAX_REDUCTION),
  pointsForMaxReduction: number(
    Math.round(MAX_REDUCTION / REDUCTION_PER_POINT),
  ),
  resistChancePerPoint: rate(RESIST_CHANCE_PER_POINT),
  levelTermPerLevel: rate(LEVEL_TERM_PER_LEVEL),
  maxLevelTerm: rate(MAX_LEVEL_TERM),
  maxAvoidance: rate(MAX_AVOIDANCE),
};

/** The avoidance chance a level difference adds, within its limits. */
export function levelTerm(levelDifference: number) {
  return clamp(
    multiplyF32(levelDifference, LEVEL_TERM_PER_LEVEL),
    f32(-MAX_LEVEL_TERM),
    f32(MAX_LEVEL_TERM),
  );
}

// Source: server-scripts/Combat.cs:DealDamageAt — stat reduction is clamped to 0–90% before prevented damage rounds up.
export function mitigate(damage: number, stat: number) {
  const share = clamp(
    multiplyF32(stat, REDUCTION_PER_POINT),
    0,
    f32(MAX_REDUCTION),
  );
  const prevented = ceilToInt(multiplyF32(damage, share));
  return { share, prevented, taken: damage - prevented };
}
export function mitigationCalculation(
  stat: CalculationInput,
  id: StatId,
): Calculation {
  return {
    steps: [
      {
        name: "Reduction",
        expression: `Your ${statName(id)} × ${DEFENSE_RATES.reductionPerPoint}`,
        limit: `between 0% and ${DEFENSE_RATES.maxReduction}`,
      },
      {
        name: "Damage Prevented",
        expression: "Incoming Damage × Reduction",
        rounding: "up",
      },
      {
        name: "Damage Taken",
        expression: "Incoming Damage − Damage Prevented",
      },
    ],
    inputs: [
      stat,
      situational("incomingDamage", "Incoming Damage Before Reduction", 201),
    ],
    example: (values) => {
      const incomingDamage = values.incomingDamage;
      const statValue = values[stat.key];
      const result = mitigate(incomingDamage, statValue);
      return {
        given: [
          `${number(incomingDamage)} incoming damage`,
          `${formatStat(id, statValue)} ${statName(id)}`,
        ],
        result: `You take ${number(result.taken)} of ${number(incomingDamage)} damage`,
        working: [
          `Reduction: ${formatStat(id, statValue)} × ${DEFENSE_RATES.reductionPerPoint} = ${percent(result.share, { decimals: 2, preserveNonzero: true })}`,
          `Damage Prevented: ${number(incomingDamage)} × ${percent(result.share, { decimals: 2, preserveNonzero: true })} = ${number(result.prevented)}, rounded up`,
          `Damage Taken: ${number(incomingDamage)} − ${number(result.prevented)} = ${number(result.taken)}`,
        ],
      };
    },
  };
}

// Source: server-scripts/Combat.cs:blockChance,GetProbResistMeleeDamage,GetProbResistMagic; UICharacterInfo.cs:Update — the window displays the capped Block Chance used by the hit roll, before level and Accuracy adjustments.
function statAvoidance(
  stat: number,
  physical: boolean,
  baseBlock: number,
  blockBonuses: number,
) {
  return physical
    ? clamp(
        addF32(
          baseBlock,
          addF32(multiplyF32(stat, blockPerArmorClass), blockBonuses),
        ),
        0,
        f32(STATS.block_chance.max!),
      )
    : multiplyF32(stat, RESIST_CHANCE_PER_POINT);
}
export function avoidanceChance(
  stat: number,
  levelDifference: number,
  accuracy: number,
  physical = false,
  baseBlock = 0,
  blockBonuses = 0,
) {
  return clamp(
    addF32(
      addF32(
        statAvoidance(stat, physical, baseBlock, blockBonuses),
        levelTerm(levelDifference),
      ),
      -accuracy,
    ),
    0,
    f32(MAX_AVOIDANCE),
  );
}
export function avoidanceCalculation(physical = false): Calculation {
  const stat = 100;
  const levelDifference = 4;
  const accuracy = 0.03;
  const [baseBlock, blockBonuses] = [0.05, 0.02];
  const chance = (value: number) =>
    percent(value, { decimals: 2, preserveNonzero: true });
  const avoidanceName = physical ? "Block or Miss Chance" : "Resist Chance";
  return {
    steps: [
      {
        name: physical ? statName("block_chance") : "Resist Contribution",
        expression: physical
          ? `Your character window's ${statName("block_chance")}`
          : `Your Magic Resist, Fire Resist, Cold Resist, Poison Resist or Disease Resist for the hit's damage type × ${DEFENSE_RATES.resistChancePerPoint}`,
      },
      {
        name: "Level Contribution",
        expression: `${DEFENSE_RATES.levelTermPerLevel} per level the target is above the attacker, or −${DEFENSE_RATES.levelTermPerLevel} per level below`,
        limit: `between −${DEFENSE_RATES.maxLevelTerm} and +${DEFENSE_RATES.maxLevelTerm}`,
      },
      {
        name: avoidanceName,
        expression: `${physical ? statName("block_chance") : "Resist Contribution"} + Level Contribution − attacker ${statName("accuracy")}`,
        limit: `between 0% and ${DEFENSE_RATES.maxAvoidance}`,
      },
    ],
    example: () => {
      const statChance = statAvoidance(stat, physical, baseBlock, blockBonuses);
      const level = levelTerm(levelDifference);
      const result = avoidanceChance(
        stat,
        levelDifference,
        accuracy,
        physical,
        baseBlock,
        blockBonuses,
      );
      return {
        given: [
          physical
            ? `${formatStat("block_chance", statChance)} ${statName("block_chance")}`
            : `${stat} Fire Resist against a fire hit`,
          `target ${levelDifference} levels higher`,
          `${formatStat("accuracy", accuracy)} attacker ${statName("accuracy")}`,
        ],
        result: `${chance(result)} chance to ${physical ? "block or miss" : "resist"}`,
        working: [
          physical
            ? `${statName("block_chance")}: ${formatStat("block_chance", statChance)}`
            : `Resist Contribution: ${stat} × ${DEFENSE_RATES.resistChancePerPoint} = ${chance(statChance)}`,
          `Level Contribution: ${levelDifference} × ${DEFENSE_RATES.levelTermPerLevel} = ${chance(level)}`,
          `${avoidanceName}: ${chance(statChance)} + ${chance(level)} − ${chance(accuracy)} = ${chance(result)}`,
        ],
      };
    },
  };
}

/** The share of a direct heal each point of the healer's Wisdom adds. */
export const WISDOM_DIRECT_HEAL_SHARE = 0.003;
/** The share of a short heal-over-time buff each attribute point adds. */
export const WISDOM_HEAL_OVER_TIME_SHARE = 0.004;
/** The highest share the Wisdom bonus adds to a heal. */
export const WISDOM_HEAL_CAP = 5;
/** A player Ranger's Wisdom and Intelligence count three times for heals and targeted buffs. */
export const RANGER_ATTRIBUTE_MULTIPLIER = 3;

// Source: server-scripts/Wisdom.cs:GetHealBonus,GetHealingPerSecondBuffBonus; TargetHealSkill.cs:GetHealingAmount; AreaHealSkill.cs:Apply; HealSkill.cs:ToolTip — direct heals use 0.3% per Wisdom point, short heal-over-time buffs use 0.4%, and player Rangers triple Wisdom for direct heals. The tooltip shows listed healing before a separate attribute bonus.
export function wisdomHeal(
  baseHeal: number,
  wisdom: number,
  ranger = false,
  sharePerPoint = WISDOM_DIRECT_HEAL_SHARE,
) {
  const rawShare = multiplyF32(
    Math.max(0, wisdom * (ranger ? RANGER_ATTRIBUTE_MULTIPLIER : 1)),
    sharePerPoint,
  );
  const share = Math.min(rawShare, WISDOM_HEAL_CAP);
  const bonus = iround(multiplyF32(baseHeal, share));
  return { rawShare, share, bonus, total: baseHeal + bonus };
}
/** The healed character's Compassion blessing, as a choice under "Use your numbers". */
const COMPASSION_INPUT: CalculationInput = {
  key: "compassionRank",
  label: "Compassion Blessing",
  choices: [
    { value: -1, label: "None" },
    ...[0, 1, 2, 3, 4, 5].map((rank) => ({
      value: rank,
      label: `Rank ${rank}`,
    })),
  ],
  value: -1,
  min: -1,
  max: 5,
  step: 1,
};
const compassionRank = (value: number | undefined) =>
  value === undefined || value < 0 ? null : value;
const COMPASSION_STEP_EXPRESSION = `Healing × (100% + ${Math.round(compassionHealingBonus(1) * 100)}% per Compassion rank, ${Math.round(compassionHealingBonus(0) * 100)}% at rank 0) when the healed character has the blessing`;

export function healingCalculation(ranger = false): Calculation {
  return {
    steps: [
      {
        name: `${statName("wisdom")} Bonus`,
        expression: `0.3% per point of ${ranger ? `tripled ${statName("wisdom")}` : statName("wisdom")} above 0`,
        limit: "at most 500%",
      },
      {
        name: "Extra Healing",
        expression: "Listed healing × Wisdom Bonus",
        rounding: "nearest",
      },
      { name: "Healing", expression: "Listed healing + Extra Healing" },
      {
        name: "Healing Received",
        expression: `${COMPASSION_STEP_EXPRESSION}, after any critical heal`,
        rounding: "nearest",
      },
    ],
    inputs: [
      listedValue("Healing in the Skill Tooltip, Without Its (+Bonus)"),
      WISDOM,
      COMPASSION_INPUT,
    ],
    example: ({ baseValue, wisdom, compassionRank: compassionValue }) => {
      const result = wisdomHeal(baseValue, wisdom, ranger);
      const rank = compassionRank(compassionValue);
      const received = applyCompassion(result.total, rank);
      return {
        given: [
          `${number(baseValue)} listed healing`,
          `${formatStat("wisdom", wisdom)} ${statName("wisdom")}`,
          ...(rank === null ? [] : [`Compassion blessing at rank ${rank}`]),
        ],
        result: `Heals ${number(received)} Hit Points before a critical heal`,
        working: [
          `${statName("wisdom")} Bonus: ${formatStat("wisdom", wisdom)}${ranger ? " × 3" : ""} × 0.3% = ${percent(result.rawShare, { decimals: 2, preserveNonzero: true })}${result.rawShare !== result.share ? `, limited to ${percent(result.share, { decimals: 2, preserveNonzero: true })}` : ""}`,
          `Extra Healing: ${number(baseValue)} × ${percent(result.share, { decimals: 2, preserveNonzero: true })} = ${number(result.bonus)}, rounded`,
          `Healing: ${number(baseValue)} + ${number(result.bonus)} = ${number(result.total)}`,
          ...(rank === null
            ? []
            : [
                `Healing Received: ${number(result.total)} × ${percent(1 + compassionHealingBonus(rank), { decimals: 1 })} = ${number(received)}, rounded`,
              ]),
        ],
      };
    },
  };
}

/** The song power each point of the Bard's Charisma adds. */
export const SONG_POWER_PER_CHARISMA = 0.001;
/** The highest bonus song power adds on top of 100%. */
export const SONG_POWER_BONUS_CAP = 2;

// Source: server-scripts/uMMORPG.Scripts.PlayerAttributes/Charisma.cs:27-40; BardFinalCadenceSkill.cs:67-70 — whole-number song effects round before Melody.
export function bardBonus(charisma: number): { raw: number; limited: number } {
  const raw = multiplyF32(Math.max(0, charisma), SONG_POWER_PER_CHARISMA);
  return { raw, limited: Math.min(raw, SONG_POWER_BONUS_CAP) };
}

export function bardPower(charisma: number): number {
  return addF32(1, bardBonus(charisma).limited);
}

// Source: server-scripts/BuffSkill.cs:ScaleWithCharisma — multiply only the capped Charisma bonus, preserving the base power.
export function buffSongPower(charisma: number, multiplier = 1): number {
  return addF32(1, multiplyF32(f32(bardPower(charisma) - 1), multiplier));
}

export function songValue(baseValue: number, charisma: number, melody = 0) {
  const power = bardPower(charisma);
  const scaled = iround(multiplyF32(baseValue, power));
  return {
    power,
    scaled,
    total: iround(multiplyF32(scaled, addF32(1, melody))),
  };
}
export function songCalculation(): Calculation {
  return {
    steps: [
      {
        name: "Song Power",
        expression: "100% + 0.1% per point of Charisma above 0",
        limit: "at most 300%",
      },
      {
        name: "Whole-Number Effect",
        expression: "Listed value × Song Power",
        rounding: "nearest",
      },
      {
        name: "Percentage Effect",
        expression: "Listed percentage × Song Power, not rounded",
      },
    ],
    inputs: [
      listedValue("Song Effect's Listed Value Before the Tooltip Bonus"),
      CHARISMA,
      percentage(
        "basePercentage",
        "Song's Listed Percentage (Before the Tooltip Bonus)",
        0.05,
      ),
    ],
    example: ({ baseValue, charisma, basePercentage }) => {
      const result = songValue(baseValue, charisma);
      const rawPower = addF32(1, bardBonus(charisma).raw);
      const percentageEffect = multiplyF32(basePercentage, result.power);
      return {
        given: [
          `${number(baseValue)} listed whole-number value`,
          `${formatStat("charisma", charisma)} ${statName("charisma")}`,
          `${percent(basePercentage, { decimals: 2, preserveNonzero: true })} listed percentage effect`,
        ],
        result: `${number(result.scaled)} whole-number effect or ${percent(percentageEffect, { decimals: 2, preserveNonzero: true })} percentage effect`,
        working: [
          `Song Power: 100% + ${formatStat("charisma", charisma)} × 0.1% = ${percent(rawPower, { decimals: 2, preserveNonzero: true })}${rawPower !== result.power ? `, limited to ${percent(result.power, { decimals: 2, preserveNonzero: true })}` : ""}`,
          `Whole-Number Effect: ${number(baseValue)} × ${percent(result.power, { decimals: 2, preserveNonzero: true })} = ${number(result.scaled)}, rounded`,
          `Percentage Effect: ${percent(basePercentage, { decimals: 2, preserveNonzero: true })} × ${percent(result.power, { decimals: 2, preserveNonzero: true })} = ${percent(percentageEffect, { decimals: 2, preserveNonzero: true })}`,
        ],
      };
    },
  };
}

// Source: server-scripts/Buff.cs:56-237; Wisdom.cs:118-129; Combat.cs:984-997 — positive non-song effects add the selected attribute, with per-effect rounding.
export function attributeBuff(
  baseValue: number,
  attribute: number,
  factor: number,
  healing = false,
) {
  const bonus = healing
    ? wisdomHeal(baseValue, attribute, false, WISDOM_HEAL_OVER_TIME_SHARE).bonus
    : iround(multiplyF32(attribute, factor));
  return { bonus, total: baseValue + bonus };
}
// Source: server-scripts/Buff.cs:healthMaxBonus; TargetBuffSkill.cs:Apply; AreaBuffSkill.cs:Apply — the calculated Health value is a maximum-Health bonus, while Ward uses the calculated value as its capacity.
export const BUFF_EFFECTS = {
  defense: `${statName("armor_class")} or Matching Resist`,
  capacity: `Maximum ${statName("health")} Bonus or ${statName("ward")} Capacity`,
  shield: statName("damage_shield"),
  shortHeal: `Healing Each Second, Base Duration Below ${seconds(60)}`,
  longHeal: `Healing Each Second, Base Duration at Least ${seconds(60)}`,
  leadership: `${statName("attack_power")} and ${statName("spell_power")} (Leadership)`,
};
export type BuffEffect = keyof typeof BUFF_EFFECTS;

// Source: server-scripts/BuffSkill.cs:GetBuffPowerAttribute; TargetBuffSkill.cs:Apply; AreaBuffSkill.cs:Apply,GetLeadershipAttributeBonus — Ranger targeted buffs triple the chosen attribute. Player mercenary-area buffs halve the sum of Wisdom and Constitution, adding Charisma before halving for Leadership.
export function buffAttribute(
  wisdom: number,
  intelligence: number,
  constitution: number,
  charisma: number,
  caster: number,
  usesIntelligence: boolean,
) {
  if (caster === 2 || caster === 3) {
    return iround(
      divideF32(wisdom + constitution + (caster === 3 ? charisma : 0), 2),
    );
  }
  return (usesIntelligence ? intelligence : wisdom) * (caster === 1 ? 3 : 1);
}

// Source: server-scripts/Buff.cs:damageBonus,magicDamageBonus; Skill.cs:ToolTip — Leadership adds its full attribute to positive damage bonuses. Its in-game tooltip includes that addition rather than showing a separate base value.
export function buffCalculation(effect: BuffEffect = "defense"): Calculation {
  const shortHeal = effect === "shortHeal";
  const coefficient =
    effect === "leadership"
      ? 1
      : effect === "capacity"
        ? 2
        : effect === "shield"
          ? 0.75
          : effect === "longHeal"
            ? 0.3
            : 0.15;
  const resultLabel =
    effect === "capacity"
      ? `maximum ${statName("health")} or ${statName("ward")} capacity`
      : effect === "shortHeal" || effect === "longHeal"
        ? "healing each second"
        : effect === "leadership"
          ? `${statName("attack_power")} and ${statName("spell_power")}`
          : BUFF_EFFECTS[effect];
  const effectStat: StatId | null =
    effect === "defense"
      ? "armor_class"
      : effect === "capacity"
        ? "health"
        : effect === "shield"
          ? "damage_shield"
          : effect === "leadership"
            ? "attack_power"
            : null;
  const rounded = effect !== "capacity" && effect !== "leadership";
  return {
    steps: [
      {
        name: "Buff Attribute",
        expression:
          effect === "leadership"
            ? "(Your Wisdom + Constitution + Charisma) ÷ 2, rounded"
            : "The Buff Attribute from the table above, for the buff source you choose",
      },
      ...(shortHeal
        ? [
            {
              name: "Healing Bonus",
              expression: "0.4% per point of Buff Attribute above 0",
              limit: "at most 500%",
            },
          ]
        : []),
      {
        name: "Attribute Addition",
        expression: shortHeal
          ? "Listed healing × Healing Bonus"
          : `${percent(coefficient, { decimals: 2, preserveNonzero: true })} of Buff Attribute${effect === "longHeal" ? " above 0" : ""}`,
        ...(rounded ? { rounding: "nearest" as const } : {}),
      },
      {
        name: "Buff Received",
        expression: "Listed value + Attribute Addition",
      },
    ],
    inputs: [
      listedValue("Buff's Value Before Attribute Bonuses (See Its Skill Page)"),
      WISDOM,
      INTELLIGENCE,
      CONSTITUTION,
      CHARISMA,
      {
        ...situational(
          "caster",
          "Buff Source",
          effect === "leadership" ? 3 : 0,
        ),
        choices:
          effect === "leadership"
            ? [{ value: 3, label: "Leadership" }]
            : [
                { value: 0, label: "Your Ordinary Non-Song Buff" },
                { value: 1, label: "Your Targeted Buff as a Ranger" },
                { value: 2, label: "Your Area Buff for Mercenaries" },
              ],
      },
      {
        ...situational("usesIntelligence", "Scaling Attribute", 0),
        choices: [
          { value: 0, label: statName("wisdom") },
          { value: 1, label: statName("intelligence") },
        ],
      },
    ],
    example: ({
      baseValue,
      wisdom,
      intelligence,
      constitution,
      charisma,
      caster,
      usesIntelligence,
    }) => {
      const attribute = buffAttribute(
        wisdom,
        intelligence,
        constitution,
        charisma,
        caster,
        usesIntelligence === 1,
      );
      const healing = wisdomHeal(
        baseValue,
        attribute,
        false,
        WISDOM_HEAL_OVER_TIME_SHARE,
      );
      const result = attributeBuff(
        baseValue,
        attribute,
        coefficient,
        shortHeal,
      );
      return {
        given: [
          `${number(baseValue)} listed value`,
          ...(caster === 2 || caster === 3
            ? [
                `${formatStat("wisdom", wisdom)} ${statName("wisdom")}`,
                `${formatStat("constitution", constitution)} ${statName("constitution")}`,
                ...(caster === 3
                  ? [
                      `${formatStat("charisma", charisma)} ${statName("charisma")}`,
                    ]
                  : []),
              ]
            : [
                `${formatStat(usesIntelligence === 1 ? "intelligence" : "wisdom", usesIntelligence === 1 ? intelligence : wisdom)} ${statName(usesIntelligence === 1 ? "intelligence" : "wisdom")}`,
                ...(caster === 1 ? ["player Ranger's targeted buff"] : []),
              ]),
        ],
        result: `You receive ${effectStat ? formatStat(effectStat, result.total, { signed: true }) : number(result.total)} ${resultLabel}`,
        working: [
          `Buff Attribute: ${caster === 2 || caster === 3 ? `(${formatStat("wisdom", wisdom)} + ${formatStat("constitution", constitution)}${caster === 3 ? ` + ${formatStat("charisma", charisma)}` : ""}) ÷ 2 = ${number(attribute)}, rounded` : caster === 1 ? `${formatStat(usesIntelligence === 1 ? "intelligence" : "wisdom", usesIntelligence === 1 ? intelligence : wisdom)} × 3 = ${number(attribute)}` : number(attribute)}`,
          ...(shortHeal
            ? [
                `Healing Bonus: ${number(attribute)} × 0.4% = ${percent(healing.rawShare, { decimals: 2, preserveNonzero: true })}${healing.rawShare !== healing.share ? `, limited to ${percent(healing.share, { decimals: 2, preserveNonzero: true })}` : ""}`,
              ]
            : []),
          `Attribute Addition: ${shortHeal ? `${number(baseValue)} × ${percent(healing.share, { decimals: 2, preserveNonzero: true })}` : `${number(attribute)} × ${percent(coefficient, { decimals: 2, preserveNonzero: true })}`} = ${number(result.bonus)}${rounded ? ", rounded" : ""}`,
          `Buff Received: ${number(baseValue)} + ${number(result.bonus)} = ${effectStat ? formatStat(effectStat, result.total) : number(result.total)}`,
        ],
      };
    },
  };
}

// Source: server-scripts/Player.cs:3708-3749; Combat.cs:336-360; Skills.cs:932-941 — float32 cast and recovery durations are added on separate double deadlines, without narrowing their total to float32.
export function attackInterval(castTime: number, delay: number, haste: number) {
  const effective = clamp(f32(haste), f32(-0.8), f32(0.8));
  const rawWait = divideF32(addF32(delay, -multiplyF32(delay, effective)), 25);
  const wait = clamp(rawWait, 0.25, 2);
  return { effective, rawWait, wait, total: f32(castTime) + wait };
}
// Source: server-scripts/Player.cs:EventRefractoryPeriod,GetSkillRefractoryPeriod; Skills.cs:StartCast; Combat.cs:spellHaste — spell haste, bounded to −50%–50%, shortens casting, followed by a fixed 0.75-second delay for the next auto attack only.
export function spellInterval(castTime: number, haste: number) {
  const casting = addF32(castTime, -multiplyF32(haste, castTime));
  return { casting, total: casting + 0.75 };
}
export function timingCalculation(spell = false): Calculation {
  const cast = {
    ...situational("castTime", "Base Cast Time", 1),
    unit: "s" as const,
  };
  return {
    steps: spell
      ? [
          {
            name: "Cast Time",
            expression: "Base Cast Time − Base Cast Time × Spell Casting Haste",
          },
          {
            name: "Auto-Attack Interval",
            expression: `Cast Time + ${seconds(0.75)}`,
          },
        ]
      : [
          {
            name: "Weapon Wait",
            expression: "(Attack Delay − Attack Delay × Haste) ÷ 25",
            limit: `between ${seconds(0.25)} and ${seconds(2)}`,
          },
          {
            name: "Attack Interval",
            expression: "Base Cast Time + Weapon Wait",
          },
        ],
    inputs: [
      cast,
      ...(spell
        ? [SPELL_HASTE]
        : [situational("weaponDelay", "Attack Delay", 30), HASTE]),
    ],
    example: (values) => {
      if (spell) {
        const result = spellInterval(values.castTime, values.spellHaste);
        return {
          given: [
            `${seconds(values.castTime)} base cast time`,
            `${formatStat("spell_haste", values.spellHaste)} ${statName("spell_haste")}`,
          ],
          result: `${seconds(result.total)} spell auto-attack interval`,
          working: [
            `Cast Time: ${seconds(values.castTime)} − ${seconds(values.castTime)} × ${formatStat("spell_haste", values.spellHaste)} = ${seconds(result.casting)}`,
            `Auto-Attack Interval: ${seconds(result.casting)} + ${seconds(0.75)} = ${seconds(result.total)}`,
          ],
        };
      }
      const result = attackInterval(
        values.castTime,
        values.weaponDelay,
        values.haste,
      );
      return {
        given: [
          `${seconds(values.castTime)} base cast time`,
          `${number(values.weaponDelay)} Attack Delay`,
          `${formatStat("haste", values.haste)} ${statName("haste")}`,
        ],
        result: `${seconds(result.total)} attack interval`,
        working: [
          `Weapon Wait: (${number(values.weaponDelay)} − ${number(values.weaponDelay)} × ${formatStat("haste", result.effective)}) ÷ 25 = ${seconds(result.rawWait)}${result.rawWait !== result.wait ? `, limited to ${seconds(result.wait)}` : ""}`,
          `Attack Interval: ${seconds(values.castTime)} + ${seconds(result.wait)} = ${seconds(result.total)}`,
        ],
      };
    },
  };
}

// Source: server-scripts/Combat.cs:DealDamageAt; BuffSkill.cs:ToolTip — lifetap uses post-shield damage shown on the target, multiplied by its listed share and Lich Shroud's healing bonus.
// Source: exported-data/skills.json lifetap_healing_percent_bonus: Lich Shroud is the only skill with a positive lifetap healing bonus.
export function lifetapHeal(damage: number, share: number, bonus: number) {
  return floorToInt(multiplyF32(multiplyF32(share, damage), addF32(1, bonus)));
}
export function lifetapCalculation(): Calculation {
  return {
    steps: [
      {
        name: "Healing Multiplier",
        expression: "100% + Lich Shroud's Lifetap Healing Bonus",
      },
      {
        name: "Lifetap Healing",
        expression:
          "Lifetap percentage × damage remaining after Ward and Mana Shield × Healing Multiplier",
        rounding: "down",
      },
      {
        name: "Healing Received",
        expression: COMPASSION_STEP_EXPRESSION.replace(
          "Healing ×",
          "Lifetap Healing ×",
        ),
        rounding: "nearest",
      },
    ],
    inputs: [
      situational(
        "remainingDamage",
        "Damage the Hit Dealt (Number Shown on the Target)",
        201,
      ),
      percentage("lifetap", "Lifetap Percentage", 0.2),
      percentage(
        "lifetapBonus",
        "Lich Shroud's Lifetap Healing Bonus (0% Without It)",
        0.25,
      ),
      COMPASSION_INPUT,
    ],
    example: ({
      remainingDamage,
      lifetap,
      lifetapBonus,
      compassionRank: compassionValue,
    }) => {
      const result = lifetapHeal(remainingDamage, lifetap, lifetapBonus);
      const rank = compassionRank(compassionValue);
      const received = applyCompassion(result, rank);
      return {
        given: [
          `${number(remainingDamage)} remaining damage`,
          `${percent(lifetap, { decimals: 2, preserveNonzero: true })} lifetap`,
          `${percent(lifetapBonus, { decimals: 2, preserveNonzero: true })} healing bonus`,
          ...(rank === null ? [] : [`Compassion blessing at rank ${rank}`]),
        ],
        result: `Heals ${number(received)} Hit Points, up to your maximum Hit Points`,
        working: [
          `Healing Multiplier: 100% + ${percent(lifetapBonus, { decimals: 2, preserveNonzero: true })} = ${percent(addF32(1, lifetapBonus), { decimals: 2, preserveNonzero: true })}`,
          `Lifetap Healing: ${percent(lifetap, { decimals: 2, preserveNonzero: true })} × ${number(remainingDamage)} × ${percent(addF32(1, lifetapBonus), { decimals: 2, preserveNonzero: true })} = ${number(result)}, rounded down`,
          ...(rank === null
            ? []
            : [
                `Healing Received: ${number(result)} × ${percent(1 + compassionHealingBonus(rank), { decimals: 1 })} = ${number(received)}, rounded`,
              ]),
        ],
      };
    },
  };
}

// Source: server-scripts/DamageSkill.cs:TryConsumeWildStrike — the follow-up's complete damage is multiplied by 100% + 10% per buff rank, rounded; the buff adds no flat Damage.
export function wildStrikeDamage(damage: number, rank: number) {
  return iround(multiplyF32(damage, addF32(1, multiplyF32(rank, 0.1))));
}

// Source: server-scripts/Combat.cs:1318-1336,1691-1697 — parry requires remaining positive health damage, rage on being hit returns zero for non-positive damage.
export function parryDamage(damage: number) {
  return damage > 0 ? clamp(iround(multiplyF32(damage, 0.5)), 1, 5000) : 0;
}
export function receivedRage(damage: number) {
  return damage > 0
    ? floorToInt(clamp(multiplyF32(f32(Math.sqrt(f32(damage))), 0.35), 1, 25))
    : 0;
}
// Source: server-scripts/Combat.cs:DealDamageAt,GenerateRageOnHit — targeted physical melee hits grant received-hit Rage after mitigation and critical hits, before shields.
export function receivedHitCalculation(): Calculation {
  return {
    steps: [
      {
        name: "Damage Counted",
        expression:
          "Damage of the targeted physical melee hit after damage reduction and critical hits, before Ward and Mana Shield",
      },
      {
        name: `${statName("rage")} Gained`,
        expression: "Square root of Damage Counted × 35%",
        limit: "between 1 and 25 when the hit deals damage, otherwise 0",
        rounding: "down",
      },
    ],
    inputs: [
      situational(
        "receivedDamage",
        "Physical Melee Hit Damage Before Ward and Mana Shield",
        101,
      ),
    ],
    example: ({ receivedDamage }) => {
      const root = f32(Math.sqrt(f32(receivedDamage)));
      const scaled = multiplyF32(root, 0.35);
      const rounded = floorToInt(scaled);
      const result = receivedRage(receivedDamage);
      return {
        given: [
          `${number(receivedDamage)} damage from a targeted physical melee hit, after damage reduction and critical hits but before Ward and Mana Shield`,
        ],
        result: `${formatStat("rage", result)} ${statName("rage")} gained`,
        working: [
          `Damage Counted: ${number(receivedDamage)}`,
          `Rage Gained: floor(√${number(receivedDamage)} × 35%) = ${number(rounded)}${rounded !== result ? `, limited to ${number(result)}` : ""}`,
        ],
      };
    },
  };
}
