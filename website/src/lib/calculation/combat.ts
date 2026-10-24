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
import { formatSeconds as seconds } from "$lib/calculation/format";

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

// Source: server-scripts/Combat.cs:DealDamageAt — stat reduction is clamped to 0–90% before prevented damage rounds up.
export function mitigate(damage: number, stat: number) {
  const share = clamp(multiplyF32(stat, 0.0005), 0, f32(0.9));
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
        expression: `Your ${statName(id)} × 0.05%`,
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
    inputs: [
      stat,
      situational("incomingDamage", "Incoming damage before reduction", 201),
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
          `Reduction: ${formatStat(id, statValue)} × 0.05% = ${percent(result.share, { decimals: 2, preserveNonzero: true })}`,
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
        addF32(
          baseBlock,
          addF32(multiplyF32(stat, blockPerArmorClass), blockBonuses),
        ),
        0,
        f32(STATS.block_chance.max!),
      )
    : multiplyF32(stat, 0.0005);
  return clamp(addF32(addF32(statChance, level), -accuracy), 0, f32(0.9));
}
export function avoidanceCalculation(physical = false): Calculation {
  return {
    steps: [
      {
        name: physical ? statName("block_chance") : "Resist contribution",
        expression: physical
          ? `Your character window's ${statName("block_chance")}`
          : "Your Magic Resist, Fire Resist, Cold Resist, Poison Resist or Disease Resist × 0.05%, for that damage type",
      },
      {
        name: "Level contribution",
        expression:
          "0.5 percentage points per level the target is above the attacker, or minus 0.5 per level below",
        limit: "between −10 and +10 percentage points",
      },
      {
        name: physical ? "Block or miss chance" : "Resist chance",
        expression: `${physical ? statName("block_chance") : "Resist contribution"} + level contribution − attacker ${statName("accuracy")}`,
        limit: "between 0% and 90%",
      },
    ],
    example: () => {
      const result = avoidanceChance(100, 4, 0.03, physical, 0.05, 0.02);
      return {
        given: [
          physical
            ? `${formatStat("block_chance", 0.08)} ${statName("block_chance")}`
            : "100 Fire Resist against a fire hit",
          "target 4 levels higher",
          `${formatStat("accuracy", 0.03)} attacker ${statName("accuracy")}`,
        ],
        result: `${percent(result, { decimals: 2, preserveNonzero: true })} chance to ${physical ? "block or miss" : "resist"}`,
        working: [
          physical
            ? `${statName("block_chance")}: ${formatStat("block_chance", 0.08)}`
            : "Resist contribution: 100 × 0.05% = 5%",
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
        name: `${statName("wisdom")} bonus`,
        expression: `0.4% per point of ${ranger ? `tripled ${statName("wisdom")}` : statName("wisdom")} above 0`,
        limit: "at most 500%",
      },
      {
        name: "Extra healing",
        expression: "Listed healing × Wisdom bonus",
        rounding: "nearest",
      },
      { name: "Healing", expression: "Listed healing + extra healing" },
    ],
    inputs: [
      listedValue("Healing in the skill tooltip, without its (+bonus)"),
      WISDOM,
    ],
    example: ({ baseValue, wisdom }) => {
      const result = wisdomHeal(baseValue, wisdom, ranger);
      return {
        given: [
          `${number(baseValue)} listed healing`,
          `${formatStat("wisdom", wisdom)} ${statName("wisdom")}`,
        ],
        result: `Heals ${number(result.total)} Hit Points before a critical heal`,
        working: [
          `${statName("wisdom")} bonus: ${formatStat("wisdom", wisdom)}${ranger ? " × 3" : ""} × 0.4% = ${percent(result.rawShare, { decimals: 2, preserveNonzero: true })}${result.rawShare !== result.share ? `, limited to ${percent(result.share, { decimals: 2, preserveNonzero: true })}` : ""}`,
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
        expression: "Listed value × song power",
        rounding: "nearest",
      },
      {
        name: "Percentage effect",
        expression: "Listed percentage × song power, not rounded",
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
          `${number(baseValue)} listed whole-number value`,
          `${formatStat("charisma", charisma)} ${statName("charisma")}`,
          `${percent(basePercentage, { decimals: 2, preserveNonzero: true })} listed percentage effect`,
        ],
        result: `${number(result.scaled)} whole-number effect or ${percent(percentageEffect, { decimals: 2, preserveNonzero: true })} percentage effect`,
        working: [
          `Song power: 100% + ${formatStat("charisma", charisma)} × 0.1% = ${percent(rawPower, { decimals: 2, preserveNonzero: true })}${rawPower !== result.power ? `, limited to ${percent(result.power, { decimals: 2, preserveNonzero: true })}` : ""}`,
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
  defense: `${statName("armor_class")} or matching resist`,
  capacity: `Maximum ${statName("health")} bonus or ${statName("ward")} capacity`,
  shield: statName("damage_shield"),
  shortHeal: `Healing each second, base duration below ${seconds(60)}`,
  longHeal: `Healing each second, base duration at least ${seconds(60)}`,
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
        name: "Buff attribute",
        expression:
          effect === "leadership"
            ? "(Your Wisdom + Constitution + Charisma) ÷ 2, rounded"
            : "The buff attribute from the table above, for the buff source you choose",
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
          ? "Listed healing × healing bonus"
          : `${percent(coefficient, { decimals: 2, preserveNonzero: true })} of buff attribute${effect === "longHeal" ? " above 0" : ""}`,
        ...(rounded ? { rounding: "nearest" as const } : {}),
      },
      {
        name: "Buff received",
        expression: "Listed value + attribute addition",
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
                { value: 0, label: "Your ordinary non-song buff" },
                { value: 1, label: "Your targeted buff as a Ranger" },
                { value: 2, label: "Your area buff for mercenaries" },
              ],
      },
      {
        ...situational("usesIntelligence", "Scaling attribute", 0),
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
      const healing = wisdomHeal(baseValue, attribute);
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
          `Buff attribute: ${caster === 2 || caster === 3 ? `(${formatStat("wisdom", wisdom)} + ${formatStat("constitution", constitution)}${caster === 3 ? ` + ${formatStat("charisma", charisma)}` : ""}) ÷ 2 = ${number(attribute)}, rounded` : caster === 1 ? `${formatStat(usesIntelligence === 1 ? "intelligence" : "wisdom", usesIntelligence === 1 ? intelligence : wisdom)} × 3 = ${number(attribute)}` : number(attribute)}`,
          ...(shortHeal
            ? [
                `Healing bonus: ${number(attribute)} × 0.4% = ${percent(healing.rawShare, { decimals: 2, preserveNonzero: true })}${healing.rawShare !== healing.share ? `, limited to ${percent(healing.share, { decimals: 2, preserveNonzero: true })}` : ""}`,
              ]
            : []),
          `Attribute addition: ${shortHeal ? `${number(baseValue)} × ${percent(healing.share, { decimals: 2, preserveNonzero: true })}` : `${number(attribute)} × ${percent(coefficient, { decimals: 2, preserveNonzero: true })}`} = ${number(result.bonus)}${rounded ? ", rounded" : ""}`,
          `Buff received: ${number(baseValue)} + ${number(result.bonus)} = ${effectStat ? formatStat(effectStat, result.total) : number(result.total)}`,
        ],
      };
    },
  };
}

// Source: server-scripts/Player.cs:3439-3480; Combat.cs:337-361; Skills.cs:924-933 — float32 cast and recovery durations are added on separate double deadlines, without narrowing their total to float32.
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
    ...situational("castTime", "Base cast time", 1),
    unit: "s" as const,
  };
  return {
    steps: spell
      ? [
          {
            name: "Cast time",
            expression: "Base cast time − base cast time × Spell Casting Haste",
          },
          {
            name: "Auto-attack interval",
            expression: `Cast time + ${seconds(0.75)}`,
          },
        ]
      : [
          {
            name: "Weapon wait",
            expression: "(Attack Delay − Attack Delay × Haste) ÷ 25",
            limit: `between ${seconds(0.25)} and ${seconds(2)}`,
          },
          {
            name: "Attack interval",
            expression: "Base cast time + weapon wait",
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
            `Cast time: ${seconds(values.castTime)} − ${seconds(values.castTime)} × ${formatStat("spell_haste", values.spellHaste)} = ${seconds(result.casting)}`,
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
          `${number(values.weaponDelay)} Attack Delay`,
          `${formatStat("haste", values.haste)} ${statName("haste")}`,
        ],
        result: `${seconds(result.total)} attack interval`,
        working: [
          `Weapon wait: (${number(values.weaponDelay)} − ${number(values.weaponDelay)} × ${formatStat("haste", result.effective)}) ÷ 25 = ${seconds(result.rawWait)}${result.rawWait !== result.wait ? `, limited to ${seconds(result.wait)}` : ""}`,
          `Attack interval: ${seconds(values.castTime)} + ${seconds(result.wait)} = ${seconds(result.total)}`,
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
        name: "Healing multiplier",
        expression: "100% + Lich Shroud's lifetap healing bonus",
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
        result: `Heals ${number(result)} Hit Points, up to your maximum Hit Points`,
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
        name: "Damage counted",
        expression:
          "Damage of the targeted physical melee hit after damage reduction and critical hits, before Ward and Mana Shield",
      },
      {
        name: `${statName("rage")} gained`,
        expression: "Square root of damage counted × 35%",
        limit: "between 1 and 25 when the hit deals damage, otherwise 0",
        rounding: "down",
      },
    ],
    inputs: [
      situational(
        "receivedDamage",
        "Physical melee hit damage before Ward and Mana Shield",
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
          `Damage counted: ${number(receivedDamage)}`,
          `Rage gained: floor(√${number(receivedDamage)} × 35%) = ${number(rounded)}${rounded !== result ? `, limited to ${number(result)}` : ""}`,
        ],
      };
    },
  };
}
