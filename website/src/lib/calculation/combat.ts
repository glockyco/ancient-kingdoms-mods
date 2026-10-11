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
} from "$lib/planner/engine-math";
import {
  WISDOM,
  CHARISMA,
  HASTE,
  SPELL_HASTE,
  DEFENSE,
  rankInput,
  situational,
} from "$lib/calculation/inputs";
import {
  formatNumber as number,
  formatPercent as percent,
  formatSeconds as seconds,
} from "$lib/calculation/format";

const base = situational("baseValue", "Base value", 100);
const hit = situational(
  "incomingDamage",
  "Incoming damage before mitigation",
  201,
);
const percentage = (
  key: string,
  label: string,
  value: number,
): CalculationInput => ({
  ...situational(key, label, value),
  unit: "%",
  max: 10,
});

// Source: server-scripts/Combat.cs:842-860 — the stat percentage is clamped before the prevented damage rounds up.
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
    inputs: [hit, stat],
    example: (values) => {
      const incomingDamage = values.incomingDamage;
      const statValue = values[stat.key];
      const result = mitigate(incomingDamage, statValue);
      return {
        given: [
          `${number(incomingDamage)} incoming damage`,
          `${number(statValue)} ${stat.label}`,
        ],
        result: `You take ${number(result.taken)} damage`,
        working: [
          `Reduction: ${number(statValue)} × 0.05% = ${percent(result.share)}`,
          `Damage prevented: ${number(incomingDamage)} × ${percent(result.share)} = ${number(result.prevented)}, rounded up`,
          `Damage taken: ${number(incomingDamage)} − ${number(result.prevented)} = ${number(result.taken)}`,
        ],
      };
    },
  };
}

// Source: server-scripts/Combat.cs:307-317,1539-1580 — chance has a capped level term and final bounds.
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
          ? "Base block chance + 1 percentage point per 100 Defense + equipment and skill block bonuses"
          : "5 percentage points per 100 matching resist",
        ...(physical ? { limit: "between 0% and 80%" } : {}),
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
          physical ? "100 Defense" : "100 matching resist",
          "target 4 levels higher",
          "3% attacker Accuracy",
          ...(physical
            ? ["5% base block chance", "2 percentage points of block bonuses"]
            : []),
        ],
        result: `${percent(result)} chance to ${physical ? "block or miss" : "resist"}`,
        working: [
          physical
            ? "Block chance: 5% + 1% + 2% = 8%"
            : "Stat contribution: 100 × 0.05% = 5%",
          "Level contribution: 4 × 0.5 percentage points = 2 percentage points",
          `${physical ? "Block or miss chance" : "Resist chance"}: ${physical ? "8%" : "5%"} + 2% − 3% = ${percent(result)}`,
        ],
      };
    },
  };
}

// Source: server-scripts/Wisdom.cs:107-127; TargetHealSkill.cs:137-142; AreaHealSkill.cs:101-105 — player Ranger healing uses triple Wisdom, mercenary healing does not.
export function wisdomHeal(baseHeal: number, wisdom: number, ranger = false) {
  const rawShare = multiplyF32(Math.max(0, wisdom * (ranger ? 3 : 1)), 0.004);
  const share = Math.min(rawShare, 5);
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
    inputs: [base, WISDOM],
    example: ({ baseValue, wisdom }) => {
      const result = wisdomHeal(baseValue, wisdom, ranger);
      return {
        given: [
          `${number(baseValue)} base healing`,
          `${number(wisdom)} Wisdom`,
        ],
        result: `Heals ${number(result.total)} Health before a critical heal`,
        working: [
          `Wisdom bonus: ${number(wisdom)}${ranger ? " × 3" : ""} × 0.4% = ${percent(result.rawShare)}${result.rawShare !== result.share ? `, limited to ${percent(result.share)}` : ""}`,
          `Extra healing: ${number(baseValue)} × ${percent(result.share)} = ${number(result.bonus)}, rounded`,
          `Healing: ${number(baseValue)} + ${number(result.bonus)} = ${number(result.total)}`,
        ],
      };
    },
  };
}

// Source: server-scripts/uMMORPG.Scripts.PlayerAttributes/Charisma.cs:27-40; BardFinalCadenceSkill.cs:67-70 — whole-number song effects round before Melody.
export function bardBonus(charisma: number): { raw: number; limited: number } {
  const raw = multiplyF32(Math.max(0, charisma), 0.001);
  return { raw, limited: Math.min(raw, 2) };
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
export function songCalculation(cadence = false): Calculation {
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
      ...(cadence
        ? [
            {
              name: "Final Cadence",
              expression: "Whole-number effect × (100% + Melody bonus)",
              rounding: "nearest" as const,
            },
          ]
        : [
            {
              name: "Percentage effect",
              expression:
                "Base percentage × song power, without whole-number rounding",
            },
          ]),
    ],
    inputs: [
      base,
      CHARISMA,
      ...(cadence
        ? [
            {
              ...situational(
                "distinctSongs",
                `Distinct manually completed songs in the last ${seconds(40)}`,
                4,
              ),
              max: 20,
            },
          ]
        : [percentage("basePercentage", "Base percentage effect", 0.05)]),
    ],
    example: ({
      baseValue,
      charisma,
      distinctSongs = 0,
      basePercentage = 0.05,
    }) => {
      // Source: server-scripts/PlayerSkills.cs:1576-1602 — count of recent distinct manual songs determines Melody, and the cast consumes the count.
      const melody =
        distinctSongs >= 6
          ? 0.3
          : distinctSongs === 5
            ? 0.25
            : distinctSongs === 4
              ? 0.15
              : 0;
      const result = songValue(baseValue, charisma, cadence ? melody : 0);
      const rawPower = addF32(1, bardBonus(charisma).raw);
      const percentageEffect = multiplyF32(basePercentage, result.power);
      return {
        given: [
          `${number(baseValue)} base whole-number value`,
          `${number(charisma)} Charisma`,
          ...(cadence
            ? [
                `${number(distinctSongs)} distinct recent songs (${percent(melody)} Melody bonus)`,
              ]
            : [`${percent(basePercentage)} base percentage effect`]),
        ],
        result: cadence
          ? `${number(result.total)} damage or healing before other combat rules`
          : `${number(result.scaled)} whole-number effect or ${percent(percentageEffect)} percentage effect`,
        working: [
          `Song power: 100% + ${number(charisma)} × 0.1% = ${percent(rawPower)}${rawPower !== result.power ? `, limited to ${percent(result.power)}` : ""}`,
          `Whole-number effect: ${number(baseValue)} × ${percent(result.power)} = ${number(result.scaled)}, rounded`,
          ...(cadence
            ? [
                `Final Cadence: ${number(result.scaled)} × ${percent(addF32(1, melody))} = ${number(result.total)}, rounded`,
              ]
            : [
                `Percentage effect: ${percent(basePercentage)} × ${percent(result.power)} = ${percent(percentageEffect)}`,
              ]),
        ],
      };
    },
  };
}

// Source: server-scripts/Buff.cs:47-228; Wisdom.cs:116-127; Combat.cs:910-923 — positive non-song effects add the selected attribute, with per-effect rounding.
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
export const BUFF_EFFECTS = {
  defense: "Defense or matching resist",
  capacity: "Maximum Health or Ward capacity",
  shield: "Damage Shield",
  shortHeal: `Healing per tick, base duration below ${seconds(60)}`,
  longHeal: `Healing per tick, base duration at least ${seconds(60)}`,
};
export type BuffEffect = keyof typeof BUFF_EFFECTS;

export function buffCalculation(effect: BuffEffect = "defense"): Calculation {
  const shortHeal = effect === "shortHeal";
  const coefficient =
    effect === "capacity"
      ? 2
      : effect === "shield"
        ? 0.75
        : effect === "longHeal"
          ? 0.3
          : 0.15;
  const label = BUFF_EFFECTS[effect];
  const rounded = effect !== "capacity";
  return {
    steps: [
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
          : `${percent(coefficient)} of buff attribute${effect === "longHeal" ? " above 0" : ""}`,
        ...(rounded ? { rounding: "nearest" as const } : {}),
      },
      {
        name: "Buff received",
        expression: "Base value + attribute addition",
      },
    ],
    inputs: [base, situational("buffAttribute", "Buff attribute", 100)],
    example: ({ baseValue, buffAttribute }) => {
      const healing = wisdomHeal(baseValue, buffAttribute);
      const result = attributeBuff(
        baseValue,
        buffAttribute,
        coefficient,
        shortHeal,
      );
      return {
        given: [
          `${number(baseValue)} base value`,
          `${number(buffAttribute)} buff attribute`,
        ],
        result: `You receive ${number(result.total)} ${label}`,
        working: [
          ...(shortHeal
            ? [
                `Healing bonus: ${number(buffAttribute)} × 0.4% = ${percent(healing.rawShare)}${healing.rawShare !== healing.share ? `, limited to ${percent(healing.share)}` : ""}`,
              ]
            : []),
          `Attribute addition: ${shortHeal ? `${number(baseValue)} × ${percent(healing.share)}` : `${number(buffAttribute)} × ${percent(coefficient)}`} = ${number(result.bonus)}${rounded ? ", rounded" : ""}`,
          `Buff received: ${number(baseValue)} + ${number(result.bonus)} = ${number(result.total)}`,
        ],
      };
    },
  };
}

// Source: server-scripts/Player.cs:3390-3431; Combat.cs:335-359; Skills.cs:924-933 — float32 cast and recovery durations are added on separate double deadlines, without narrowing their total to float32.
export function attackInterval(castTime: number, delay: number, haste: number) {
  const effective = clamp(f32(haste), f32(-0.8), f32(0.8));
  const rawWait = divideF32(addF32(delay, -multiplyF32(delay, effective)), 25);
  const wait = clamp(rawWait, 0.25, 2);
  return { effective, rawWait, wait, total: f32(castTime) + wait };
}
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
              "Base cast time − base cast time × your full Spell Haste bonus",
          },
          { name: "Interval", expression: `Cast time + ${seconds(0.75)}` },
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
            `${percent(values.spellHaste)} full Spell Haste`,
          ],
          result: `${seconds(result.total)} calculated spell interval`,
          working: [
            `Cast time: ${seconds(values.castTime)} − ${seconds(values.castTime)} × ${percent(values.spellHaste)} = ${seconds(result.casting)}`,
            `Interval: ${seconds(result.casting)} + ${seconds(0.75)} = ${seconds(result.total)}`,
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
          `${percent(values.haste)} Haste`,
        ],
        result: `${seconds(result.total)} attack interval`,
        working: [
          `Wait after casting: (${number(values.weaponDelay)} − ${number(values.weaponDelay)} × ${percent(result.effective)}) ÷ 25 = ${seconds(result.rawWait)}${result.rawWait !== result.wait ? `, limited to ${seconds(result.wait)}` : ""}`,
          `Interval: ${seconds(values.castTime)} + ${seconds(result.wait)} = ${seconds(result.total)}`,
        ],
      };
    },
  };
}

// Source: server-scripts/Combat.cs:1315-1333 — lifetap multiplies remaining damage by the lifetap percentage first, then by the summed buff multiplier.
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
      situational("remainingDamage", "Damage remaining after shields", 201),
      percentage("lifetap", "Lifetap percentage", 0.2),
      percentage("lifetapBonus", "Lifetap healing bonus", 0.25),
    ],
    example: ({ remainingDamage, lifetap, lifetapBonus }) => {
      const result = lifetapHeal(remainingDamage, lifetap, lifetapBonus);
      return {
        given: [
          `${number(remainingDamage)} remaining damage`,
          `${percent(lifetap)} lifetap`,
          `${percent(lifetapBonus)} healing bonus`,
        ],
        result: `Heals ${number(result)} Health before your maximum Health limit`,
        working: [
          `Healing multiplier: 100% + ${percent(lifetapBonus)} = ${percent(addF32(1, lifetapBonus))}`,
          `Lifetap healing: ${percent(lifetap)} × ${number(remainingDamage)} × ${percent(addF32(1, lifetapBonus))} = ${number(result)}, rounded down`,
        ],
      };
    },
  };
}

// Source: server-scripts/DamageSkill.cs:49-65 — Wild Strike rounds the follow-up's complete damage, including the flat buff damage already in Damage.
export function wildStrikeDamage(damage: number, rank: number) {
  return iround(multiplyF32(damage, addF32(1, multiplyF32(rank, 0.1))));
}
export function wildStrikeCalculation(): Calculation {
  return {
    steps: [
      { name: "Empowerment", expression: "100% + 10% per Wild Strike rank" },
      {
        name: "Magic hit",
        expression:
          "Your auto attack's damage, already including Wild Strike's flat damage bonus, × empowerment",
        rounding: "nearest",
      },
    ],
    inputs: [
      situational("autoDamage", "Auto attack damage including the buff", 201),
      rankInput(5),
    ],
    example: ({ autoDamage, rank }) => {
      const share = addF32(1, multiplyF32(rank, 0.1));
      const result = wildStrikeDamage(autoDamage, rank);
      return {
        given: [`${number(autoDamage)} auto attack damage`, `rank ${rank}`],
        result: `${number(result)} magic damage before the hit pipeline`,
        working: [
          `Empowerment: 100% + ${rank} × 10% = ${percent(share)}`,
          `Magic hit: ${number(autoDamage)} × ${percent(share)} = ${number(result)}, rounded`,
        ],
      };
    },
  };
}

// Source: server-scripts/Combat.cs:1344-1360,1594-1600 — parry requires remaining positive health damage, rage on being hit returns zero for non-positive damage.
export function parryDamage(damage: number) {
  return damage > 0 ? clamp(iround(multiplyF32(damage, 0.5)), 1, 5000) : 0;
}
export function receivedRage(damage: number) {
  return damage > 0
    ? floorToInt(clamp(multiplyF32(f32(Math.sqrt(f32(damage))), 0.35), 1, 25))
    : 0;
}
export function receivedHitCalculation(parry = false): Calculation {
  return {
    steps: parry
      ? [
          {
            name: "Counterattack",
            expression:
              "50% of the health damage left after mitigation, Ward, and Mana Shield",
            rounding: "nearest",
            limit: "between 1 and 5,000 damage, only when some damage remains",
          },
        ]
      : [
          {
            name: "Rage gained",
            expression:
              "35% of the square root of the received physical hit damage",
            limit: "between 1 and 25 for a positive hit, otherwise 0",
            rounding: "down",
          },
        ],
    inputs: [
      situational(
        "receivedDamage",
        parry
          ? "Health damage remaining after shields"
          : "Physical hit damage before shields",
        101,
      ),
    ],
    example: ({ receivedDamage }) => {
      const result = parry
        ? parryDamage(receivedDamage)
        : receivedRage(receivedDamage);
      return {
        given: [
          `${number(receivedDamage)} ${parry ? "health damage left after mitigation, Ward, and Mana Shield" : "physical hit damage before shields"}`,
        ],
        result: parry
          ? `${number(result)} counterattack damage`
          : `${number(result)} Rage gained`,
        working: parry
          ? [
              `Counterattack: ${number(receivedDamage)} × 50% = ${number(result)}, rounded`,
            ]
          : [
              `Rage gained: 35% of the square root of ${number(receivedDamage)} = ${number(result)}, rounded down`,
            ],
      };
    },
  };
}
