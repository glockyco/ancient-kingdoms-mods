import type { Calculation, CalculationInput } from "$lib/types/calculation";
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
  DEFENSE,
  situational,
} from "$lib/calculation/inputs";
import {
  formatNumber as number,
  formatPercent as percent,
} from "$lib/utils/format";
import { formatSeconds as seconds } from "$lib/calculation/format";

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

// Source: server-scripts/Combat.cs:DealDamageAt — stat reduction is clamped to 0–90% before prevented damage rounds up.
export function mitigate(damage: number, stat: number) {
  const share = clamp(multiplyF32(stat, 0.0005), 0, f32(0.9));
  const prevented = ceilToInt(multiplyF32(damage, share));
  return { share, prevented, taken: damage - prevented };
}
export function mitigationCalculation(
  stat: CalculationInput = DEFENSE,
): Calculation {
  return {
    steps: [
      {
        name: "Reduction",
        expression: `Your ${stat.label} × 0.05% (5% per 100 points)`,
        limit: "between 0% and 90%",
      },
      {
        name: "Damage prevented",
        expression: "Incoming damage × reduction",
        rounding: "up",
      },
      {
        name: "Damage taken",
        expression: "Incoming damage − damage prevented",
      },
    ],
    inputs: [stat],
    example: (values) => {
      const incomingDamage = 201;
      const statValue = values[stat.key];
      const result = mitigate(incomingDamage, statValue);
      return {
        given: [
          `${number(incomingDamage)} incoming damage (fixed example)`,
          `${number(statValue)} ${stat.label}`,
        ],
        result: `You prevent ${percent(result.share, { decimals: 2, preserveNonzero: true })} of incoming damage, with the amount prevented rounded up`,
        working: [
          `Reduction: ${number(statValue)} × 0.05% = ${percent(result.share, { decimals: 2, preserveNonzero: true })}`,
          `Damage prevented: ${number(incomingDamage)} × ${percent(result.share, { decimals: 2, preserveNonzero: true })} = ${number(result.prevented)}, rounded up`,
          `Damage taken: ${number(incomingDamage)} − ${number(result.prevented)} = ${number(result.taken)}`,
        ],
      };
    },
  };
}

// Source: server-scripts/Combat.cs:blockChance,GetProbResistMeleeDamage,GetProbResistMagic; UICharacterInfo.cs:Update — the window displays the capped Block Chance used by the hit roll, before level and Accuracy adjustments.
export function avoidanceChance(
  stat: number,
  levelDifference: number,
  accuracy: number,
  physical = false,
  baseBlock = 0,
  blockBonuses = 0,
) {
  const level = clamp(multiplyF32(levelDifference, 0.005), f32(-0.1), f32(0.1));
  const statChance = physical
    ? clamp(
        addF32(baseBlock, addF32(multiplyF32(stat, 0.0001), blockBonuses)),
        0,
        f32(0.8),
      )
    : multiplyF32(stat, 0.0005);
  return clamp(addF32(addF32(statChance, level), -accuracy), 0, f32(0.9));
}
export function avoidanceCalculation(physical = false): Calculation {
  return {
    steps: [
      {
        name: physical ? "Block chance" : "Stat contribution",
        expression: physical
          ? "Your character window's Block Chance, including Armor Class, equipment and skill bonuses, capped at 80%"
          : "5 percentage points per 100 matching resist",
      },
      {
        name: "Level contribution",
        expression:
          "Target level − attacker level, adding 0.5 percentage points per level",
        limit: "between −10 and +10 percentage points",
      },
      {
        name: physical ? "Block or miss chance" : "Resist chance",
        expression: `${physical ? "Block chance" : "Stat contribution"} + level contribution − attacker Accuracy`,
        limit: "between 0% and 90%",
      },
    ],
    example: () => {
      const result = avoidanceChance(100, 4, 0.03, physical, 0.05, 0.02);
      return {
        given: [
          physical ? "8% Block Chance" : "100 matching resist",
          "target 4 levels higher",
          "3% attacker Accuracy",
        ],
        result: `${percent(result, { decimals: 2, preserveNonzero: true })} chance to ${physical ? "block or miss" : "resist"}`,
        working: [
          physical ? "Block chance: 8%" : "Stat contribution: 100 × 0.05% = 5%",
          "Level contribution: 4 × 0.5 percentage points = 2 percentage points",
          `${physical ? "Block or miss chance" : "Resist chance"}: ${physical ? "8%" : "5%"} + 2% − 3% = ${percent(result, { decimals: 2, preserveNonzero: true })}`,
        ],
      };
    },
  };
}

/** The share of a heal each point of the healer's Wisdom adds. */
export const WISDOM_HEAL_SHARE = 0.004;
/** The highest share the Wisdom bonus adds to a heal. */
export const WISDOM_HEAL_CAP = 5;
/** A player Ranger's Wisdom and Intelligence count three times for heals and targeted buffs. */
export const RANGER_ATTRIBUTE_MULTIPLIER = 3;

// Source: server-scripts/Wisdom.cs:GetHealBonus; TargetHealSkill.cs:GetHealingAmount; AreaHealSkill.cs:Apply; HealSkill.cs:ToolTip — player Ranger healing triples Wisdom. The tooltip shows listed healing before a separate attribute bonus.
export function wisdomHeal(baseHeal: number, wisdom: number, ranger = false) {
  const rawShare = multiplyF32(
    Math.max(0, wisdom * (ranger ? RANGER_ATTRIBUTE_MULTIPLIER : 1)),
    WISDOM_HEAL_SHARE,
  );
  const share = Math.min(rawShare, WISDOM_HEAL_CAP);
  const bonus = iround(multiplyF32(baseHeal, share));
  return { rawShare, share, bonus, total: baseHeal + bonus };
}
export function healingCalculation(ranger = false): Calculation {
  return {
    steps: [
      {
        name: "Wisdom bonus",
        expression: `0.4% per point of ${ranger ? "tripled Wisdom" : "Wisdom"} above 0`,
        limit: "at most 500%",
      },
      {
        name: "Extra healing",
        expression: "Base healing × Wisdom bonus",
        rounding: "nearest",
      },
      { name: "Healing", expression: "Base healing + extra healing" },
    ],
    inputs: [
      listedValue("Healing in the skill tooltip, without its (+bonus)"),
      WISDOM,
    ],
    example: ({ baseValue, wisdom }) => {
      const result = wisdomHeal(baseValue, wisdom, ranger);
      return {
        given: [
          `${number(baseValue)} base healing`,
          `${number(wisdom)} Wisdom`,
        ],
        result: `Heals ${number(result.total)} Health before a critical heal`,
        working: [
          `Wisdom bonus: ${number(wisdom)}${ranger ? " × 3" : ""} × 0.4% = ${percent(result.rawShare, { decimals: 2, preserveNonzero: true })}${result.rawShare !== result.share ? `, limited to ${percent(result.share, { decimals: 2, preserveNonzero: true })}` : ""}`,
          `Extra healing: ${number(baseValue)} × ${percent(result.share, { decimals: 2, preserveNonzero: true })} = ${number(result.bonus)}, rounded`,
          `Healing: ${number(baseValue)} + ${number(result.bonus)} = ${number(result.total)}`,
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
        name: "Song power",
        expression: "100% + 0.1% per point of Charisma above 0",
        limit: "at most 300%",
      },
      {
        name: "Whole-number effect",
        expression: "Base value × song power",
        rounding: "nearest",
      },
      {
        name: "Percentage effect",
        expression:
          "Base percentage × song power, without whole-number rounding",
      },
    ],
    inputs: [
      listedValue("Song effect's listed value before the tooltip bonus"),
      CHARISMA,
      percentage(
        "basePercentage",
        "Song's listed percentage (before the tooltip bonus)",
        0.05,
      ),
    ],
    example: ({ baseValue, charisma, basePercentage }) => {
      const result = songValue(baseValue, charisma);
      const rawPower = addF32(1, bardBonus(charisma).raw);
      const percentageEffect = multiplyF32(basePercentage, result.power);
      return {
        given: [
          `${number(baseValue)} base whole-number value`,
          `${number(charisma)} Charisma`,
          `${percent(basePercentage, { decimals: 2, preserveNonzero: true })} base percentage effect`,
        ],
        result: `${number(result.scaled)} whole-number effect or ${percent(percentageEffect, { decimals: 2, preserveNonzero: true })} percentage effect`,
        working: [
          `Song power: 100% + ${number(charisma)} × 0.1% = ${percent(rawPower, { decimals: 2, preserveNonzero: true })}${rawPower !== result.power ? `, limited to ${percent(result.power, { decimals: 2, preserveNonzero: true })}` : ""}`,
          `Whole-number effect: ${number(baseValue)} × ${percent(result.power, { decimals: 2, preserveNonzero: true })} = ${number(result.scaled)}, rounded`,
          `Percentage effect: ${percent(basePercentage, { decimals: 2, preserveNonzero: true })} × ${percent(result.power, { decimals: 2, preserveNonzero: true })} = ${percent(percentageEffect, { decimals: 2, preserveNonzero: true })}`,
        ],
      };
    },
  };
}

// Source: server-scripts/Buff.cs:47-228; Wisdom.cs:116-127; Combat.cs:921-934 — positive non-song effects add the selected attribute, with per-effect rounding.
export function attributeBuff(
  baseValue: number,
  attribute: number,
  factor: number,
  healing = false,
) {
  const bonus = healing
    ? wisdomHeal(baseValue, attribute).bonus
    : iround(multiplyF32(attribute, factor));
  return { bonus, total: baseValue + bonus };
}
// Source: server-scripts/Buff.cs:healthMaxBonus; TargetBuffSkill.cs:Apply; AreaBuffSkill.cs:Apply — the calculated Health value is a maximum-Health bonus, while Ward uses the calculated value as its capacity.
export const BUFF_EFFECTS = {
  defense: "Armor Class or matching resist",
  capacity: "Maximum Health bonus or Ward capacity",
  shield: "Damage Shield",
  shortHeal: `Healing each second, base duration below ${seconds(60)}`,
  longHeal: `Healing each second, base duration at least ${seconds(60)}`,
  leadership: "Attack Power or Spell Power (Leadership)",
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
  const label = BUFF_EFFECTS[effect];
  const rounded = effect !== "capacity" && effect !== "leadership";
  return {
    steps: [
      {
        name: "Buff attribute",
        expression:
          effect === "leadership"
            ? "(Your Wisdom + Constitution + Charisma) ÷ 2, rounded"
            : "Wisdom, or Intelligence for buffs that scale with it. Triple that stat for a player Ranger's targeted buff. Your area buffs for mercenaries use (Wisdom + Constitution) ÷ 2, rounded",
      },
      ...(shortHeal
        ? [
            {
              name: "Healing bonus",
              expression: "0.4% per point of buff attribute above 0",
              limit: "at most 500%",
            },
          ]
        : []),
      {
        name: "Attribute addition",
        expression: shortHeal
          ? "Base healing × healing bonus"
          : `${percent(coefficient, { decimals: 2, preserveNonzero: true })} of buff attribute${effect === "longHeal" ? " above 0" : ""}`,
        ...(rounded ? { rounding: "nearest" as const } : {}),
      },
      {
        name: "Buff received",
        expression: "Base value + attribute addition",
      },
    ],
    inputs: [
      listedValue("Buff's value before attribute bonuses (see its skill page)"),
      WISDOM,
      INTELLIGENCE,
      CONSTITUTION,
      CHARISMA,
      {
        ...situational(
          "caster",
          "Buff source",
          effect === "leadership" ? 3 : 0,
        ),
        choices:
          effect === "leadership"
            ? [{ value: 3, label: "Leadership" }]
            : [
                { value: 0, label: "Player's ordinary non-song buff" },
                { value: 1, label: "Player Ranger's targeted buff" },
                { value: 2, label: "Your area buff for mercenaries" },
              ],
      },
      {
        ...situational("usesIntelligence", "Scaling attribute", 0),
        choices: [
          { value: 0, label: "Wisdom" },
          { value: 1, label: "Intelligence" },
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
      const healing = wisdomHeal(baseValue, attribute);
      const result = attributeBuff(
        baseValue,
        attribute,
        coefficient,
        shortHeal,
      );
      return {
        given: [
          `${number(baseValue)} base value`,
          ...(caster === 2 || caster === 3
            ? [
                `${number(wisdom)} Wisdom`,
                `${number(constitution)} Constitution`,
                ...(caster === 3 ? [`${number(charisma)} Charisma`] : []),
              ]
            : [
                `${number(usesIntelligence === 1 ? intelligence : wisdom)} ${usesIntelligence === 1 ? "Intelligence" : "Wisdom"}`,
                ...(caster === 1 ? ["player Ranger's targeted buff"] : []),
              ]),
        ],
        result: `You receive ${number(result.total)} ${label}`,
        working: [
          `Buff attribute: ${caster === 2 || caster === 3 ? `(${number(wisdom)} + ${number(constitution)}${caster === 3 ? ` + ${number(charisma)}` : ""}) ÷ 2 = ${number(attribute)}, rounded` : caster === 1 ? `${number(usesIntelligence === 1 ? intelligence : wisdom)} × 3 = ${number(attribute)}` : number(attribute)}`,
          ...(shortHeal
            ? [
                `Healing bonus: ${number(attribute)} × 0.4% = ${percent(healing.rawShare, { decimals: 2, preserveNonzero: true })}${healing.rawShare !== healing.share ? `, limited to ${percent(healing.share, { decimals: 2, preserveNonzero: true })}` : ""}`,
              ]
            : []),
          `Attribute addition: ${shortHeal ? `${number(baseValue)} × ${percent(healing.share, { decimals: 2, preserveNonzero: true })}` : `${number(attribute)} × ${percent(coefficient, { decimals: 2, preserveNonzero: true })}`} = ${number(result.bonus)}${rounded ? ", rounded" : ""}`,
          `Buff received: ${number(baseValue)} + ${number(result.bonus)} = ${number(result.total)}`,
        ],
      };
    },
  };
}

// Source: server-scripts/Player.cs:3435-3476; Combat.cs:337-361; Skills.cs:924-933 — float32 cast and recovery durations are added on separate double deadlines, without narrowing their total to float32.
export function attackInterval(castTime: number, delay: number, haste: number) {
  const effective = clamp(f32(haste), f32(-0.8), f32(0.8));
  const rawWait = divideF32(addF32(delay, -multiplyF32(delay, effective)), 25);
  const wait = clamp(rawWait, 0.25, 2);
  return { effective, rawWait, wait, total: f32(castTime) + wait };
}
// Source: server-scripts/Player.cs:EventRefractoryPeriod,GetSkillRefractoryPeriod; Skills.cs:StartCast — spell haste shortens casting, followed by a fixed 0.75-second delay for the next auto attack only.
export function spellInterval(castTime: number, haste: number) {
  const casting = addF32(castTime, -multiplyF32(haste, castTime));
  return { casting, total: casting + 0.75 };
}
export function timingCalculation(spell = false): Calculation {
  const cast = {
    ...situational("castTime", "Base cast time", 1),
    unit: "s" as const,
  };
  return {
    steps: spell
      ? [
          {
            name: "Cast time",
            expression:
              "Base cast time − base cast time × your full Spell Casting Haste bonus",
          },
          {
            name: "Auto-attack interval",
            expression: `Cast time + ${seconds(0.75)}`,
          },
        ]
      : [
          {
            name: "Wait after casting",
            expression: "(Weapon delay − weapon delay × Haste) ÷ 25",
            limit: `between ${seconds(0.25)} and ${seconds(2)}`,
          },
          {
            name: "Interval",
            expression: "Base cast time + wait after casting",
          },
        ],
    inputs: [
      cast,
      ...(spell
        ? [SPELL_HASTE]
        : [situational("weaponDelay", "Weapon delay", 30), HASTE]),
    ],
    example: (values) => {
      if (spell) {
        const result = spellInterval(values.castTime, values.spellHaste);
        return {
          given: [
            `${seconds(values.castTime)} base cast time`,
            `${percent(values.spellHaste, { decimals: 2, preserveNonzero: true })} full Spell Casting Haste`,
          ],
          result: `${seconds(result.total)} spell auto-attack interval`,
          working: [
            `Cast time: ${seconds(values.castTime)} − ${seconds(values.castTime)} × ${percent(values.spellHaste, { decimals: 2, preserveNonzero: true })} = ${seconds(result.casting)}`,
            `Auto-attack interval: ${seconds(result.casting)} + ${seconds(0.75)} = ${seconds(result.total)}`,
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
          `${number(values.weaponDelay)} weapon delay`,
          `${percent(values.haste, { decimals: 2, preserveNonzero: true })} Haste`,
        ],
        result: `${seconds(result.total)} attack interval`,
        working: [
          `Wait after casting: (${number(values.weaponDelay)} − ${number(values.weaponDelay)} × ${percent(result.effective, { decimals: 2, preserveNonzero: true })}) ÷ 25 = ${seconds(result.rawWait)}${result.rawWait !== result.wait ? `, limited to ${seconds(result.wait)}` : ""}`,
          `Interval: ${seconds(values.castTime)} + ${seconds(result.wait)} = ${seconds(result.total)}`,
        ],
      };
    },
  };
}

// Source: server-scripts/Combat.cs:DealDamageAt; BuffSkill.cs:ToolTip — lifetap uses post-shield damage shown on the target, multiplied by its listed share and Lich Shroud's healing bonus.
export function lifetapHeal(damage: number, share: number, bonus: number) {
  return floorToInt(multiplyF32(multiplyF32(share, damage), addF32(1, bonus)));
}
export function lifetapCalculation(): Calculation {
  return {
    steps: [
      {
        name: "Healing multiplier",
        expression:
          "100% + summed lifetap healing bonuses from your active or permanent buffs",
      },
      {
        name: "Lifetap healing",
        expression:
          "Lifetap percentage × damage remaining after Ward and Mana Shield × healing multiplier",
        rounding: "down",
      },
    ],
    inputs: [
      situational(
        "remainingDamage",
        "Damage the hit dealt (number shown on the target)",
        201,
      ),
      percentage("lifetap", "Lifetap percentage", 0.2),
      percentage(
        "lifetapBonus",
        "Lich Shroud's lifetap healing bonus (0% without it)",
        0.25,
      ),
    ],
    example: ({ remainingDamage, lifetap, lifetapBonus }) => {
      const result = lifetapHeal(remainingDamage, lifetap, lifetapBonus);
      return {
        given: [
          `${number(remainingDamage)} remaining damage`,
          `${percent(lifetap, { decimals: 2, preserveNonzero: true })} lifetap`,
          `${percent(lifetapBonus, { decimals: 2, preserveNonzero: true })} healing bonus`,
        ],
        result: `Heals ${number(result)} Health before your maximum Health limit`,
        working: [
          `Healing multiplier: 100% + ${percent(lifetapBonus, { decimals: 2, preserveNonzero: true })} = ${percent(addF32(1, lifetapBonus), { decimals: 2, preserveNonzero: true })}`,
          `Lifetap healing: ${percent(lifetap, { decimals: 2, preserveNonzero: true })} × ${number(remainingDamage)} × ${percent(addF32(1, lifetapBonus), { decimals: 2, preserveNonzero: true })} = ${number(result)}, rounded down`,
        ],
      };
    },
  };
}

// Source: server-scripts/DamageSkill.cs:TryConsumeWildStrike — the follow-up's complete damage is multiplied by 100% + 10% per buff rank, rounded; the buff adds no flat Damage.
export function wildStrikeDamage(damage: number, rank: number) {
  return iround(multiplyF32(damage, addF32(1, multiplyF32(rank, 0.1))));
}

// Source: server-scripts/Combat.cs:1355-1371,1605-1611 — parry requires remaining positive health damage, rage on being hit returns zero for non-positive damage.
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
        name: "Rage gained",
        expression:
          "35% of the square root of targeted physical melee hit damage after mitigation and critical hits, before Ward and Mana Shield",
        limit: "between 1 and 25 for a positive hit, otherwise 0",
        rounding: "down",
      },
    ],
    example: () => {
      const receivedDamage = 101;
      const root = f32(Math.sqrt(f32(receivedDamage)));
      const scaled = multiplyF32(root, 0.35);
      const result = receivedRage(receivedDamage);
      return {
        given: [
          "101 damage from a targeted physical melee hit, after mitigation and critical hits but before Ward and Mana Shield (fixed example)",
        ],
        result: `${number(result)} Rage gained`,
        working: [
          `Rage gained: √101 = ${number(root)}, × 35% = ${number(scaled)} = ${number(result)}, rounded down`,
        ],
      };
    },
  };
}
