import type { Calculation } from "$lib/types/calculation";
import { f32, iround, multiplyF32 } from "$lib/calculation/unity-math";
import { CLASSES, RACES } from "$lib/utils/merc-stats";
import type { ClassResult, Curves } from "$lib/utils/merc-stats";
import { formatNumber, formatPercent } from "$lib/utils/format";

// Source: server-scripts/Player.cs:10640-10677,10913-10933,UpdateMercStatsByLevel; server-scripts/Health.cs:28-41; server-scripts/Mana.cs:28-41; server-scripts/Strength.cs:15-17; server-scripts/Intelligence.cs:36-38 — saved multipliers and shared combat rolls combine with current attributes and veteran totals.
export function mercenaryStats(
  result: ClassResult,
  level: number,
  veteran: number,
  curves: Curves,
  race: string,
): Calculation {
  const cls = result.cls;
  const row = result.rows.find((entry) => entry.race === race)!;
  const bands = RACES[race];
  const veteranBonus = multiplyF32(veteran, 0.0025);
  const healthMultiplier = f32(bands.hp[0]) + veteranBonus;
  const scaledHealth = iround(multiplyF32(result.hpCurve, healthMultiplier));
  const manaMultiplier = f32(bands.mana[0]) + veteranBonus;
  const scaledMana = iround(multiplyF32(result.manaCurve, manaMultiplier));
  const spellBonus = iround(multiplyF32(result.attrs.INT, 1.5));
  const combatCeiling = iround(multiplyF32(level, bands.bc));
  const curve = curves[CLASSES[cls].type];
  return {
    steps: [
      {
        name: "Constitution",
        expression: `Current level ÷ ${CLASSES[cls].div.CON} for ${cls}`,
        rounding: "down",
      },
      {
        name: "Intelligence",
        expression: `Current level ÷ ${CLASSES[cls].div.INT} for ${cls}`,
        rounding: "down",
      },
      {
        name: "Strength",
        expression: `Current level ÷ ${CLASSES[cls].div.STR} for ${cls}`,
        rounding: "down",
      },
      {
        name: "Base Health",
        expression:
          "Class's level 1 Health + its per-level Health increase × (current level − 1)",
      },
      ...(result.hasMana
        ? [
            {
              name: "Base Mana",
              expression:
                "Class's level 1 Mana + its per-level Mana increase × (current level − 1)",
            },
          ]
        : []),
      {
        name: "Health hire roll",
        expression: `Random percentage between ${formatPercent(bands.hp[0], { decimals: 2, preserveNonzero: true })} and ${formatPercent(bands.hp[1], { decimals: 2, preserveNonzero: true })}, saved when hired`,
      },
      ...(result.hasMana
        ? [
            {
              name: "Mana hire roll",
              expression: `Random percentage between ${formatPercent(bands.mana[0], { decimals: 2, preserveNonzero: true })} and ${formatPercent(bands.mana[1], { decimals: 2, preserveNonzero: true })}, saved when hired`,
            },
          ]
        : []),
      {
        name: "Health multiplier",
        expression: "Health hire roll + 0.25% × veteran points (VT)",
      },
      ...(result.hasMana
        ? [
            {
              name: "Mana multiplier",
              expression: "Mana hire roll + 0.25% × veteran points (VT)",
            },
          ]
        : []),
      {
        name: "Scaled Health",
        expression: "Base Health × Health multiplier",
        rounding: "nearest",
      },
      ...(result.hasMana
        ? [
            {
              name: "Scaled Mana",
              expression: "Base Mana × Mana multiplier",
              rounding: "nearest" as const,
            },
          ]
        : []),
      {
        name: "Maximum Health",
        expression: "Scaled Health + 25 × Constitution",
      },
      ...(result.hasMana
        ? [
            {
              name: "Maximum Mana",
              expression: "Scaled Mana + 20 × Intelligence",
            },
          ]
        : []),
      {
        name: "Highest combat hire roll",
        expression: `Hiring level × ${formatPercent(bands.bc, { decimals: 2, preserveNonzero: true })} for ${race}, rounded, − 1`,
      },
      {
        name: "Combat hire roll",
        expression:
          "Random whole number from 0 through the highest combat hire roll, saved when hired",
      },
      {
        name: "Attack Power",
        expression: "Saved combat hire roll + veteran points (VT) + Strength",
      },
      {
        name: "Intelligence contribution",
        expression: "150% of Intelligence",
        rounding: "nearest",
      },
      {
        name: "Spell Power",
        expression:
          "Saved combat hire roll + veteran points (VT) + Intelligence contribution",
      },
    ],
    example: () => ({
      given: [
        `${race} ${cls} (class and race from Hiring odds & cost), level ${level}, ${veteran} veteran points (VT)`,
        `Lowest Health${result.hasMana ? " and Mana" : ""} hire rolls and a combat hire roll of 0`,
        "No equipment",
      ],
      result: `${formatNumber(row.hp![0])} Health${row.mana ? `, ${formatNumber(row.mana[0])} Mana` : ""}, ${formatNumber(row.atk![0])} Attack Power and ${formatNumber(row.spell![0])} Spell Power`,
      working: [
        `Constitution: ${level} ÷ ${CLASSES[cls].div.CON} = ${result.attrs.CON}, rounded down`,
        `Intelligence: ${level} ÷ ${CLASSES[cls].div.INT} = ${result.attrs.INT}, rounded down`,
        `Strength: ${level} ÷ ${CLASSES[cls].div.STR} = ${result.attrs.STR}, rounded down`,
        `Base Health: ${formatNumber(curve.hp_base)} + ${formatNumber(curve.hp_per)} × (${level} − 1) = ${formatNumber(result.hpCurve)}`,
        ...(result.hasMana
          ? [
              `Base Mana: ${formatNumber(curve.mana_base)} + ${formatNumber(curve.mana_per)} × (${level} − 1) = ${formatNumber(result.manaCurve)}`,
            ]
          : []),
        `Health hire roll: lowest allowed percentage = ${formatPercent(bands.hp[0], { decimals: 2, preserveNonzero: true })}`,
        ...(result.hasMana
          ? [
              `Mana hire roll: lowest allowed percentage = ${formatPercent(bands.mana[0], { decimals: 2, preserveNonzero: true })}`,
            ]
          : []),
        `Health multiplier: ${formatPercent(bands.hp[0], { decimals: 2, preserveNonzero: true })} + 0.25% × ${veteran} = ${formatPercent(healthMultiplier, { decimals: 2, preserveNonzero: true })}`,
        ...(result.hasMana
          ? [
              `Mana multiplier: ${formatPercent(bands.mana[0], { decimals: 2, preserveNonzero: true })} + 0.25% × ${veteran} = ${formatPercent(manaMultiplier, { decimals: 2, preserveNonzero: true })}`,
            ]
          : []),
        `Scaled Health: ${formatNumber(result.hpCurve)} × ${formatPercent(healthMultiplier, { decimals: 2, preserveNonzero: true })} = ${formatNumber(scaledHealth)}, rounded`,
        ...(result.hasMana
          ? [
              `Scaled Mana: ${formatNumber(result.manaCurve)} × ${formatPercent(manaMultiplier, { decimals: 2, preserveNonzero: true })} = ${formatNumber(scaledMana)}, rounded`,
            ]
          : []),
        `Maximum Health: ${formatNumber(scaledHealth)} + 25 × ${result.attrs.CON} = ${formatNumber(row.hp![0])}`,
        ...(result.hasMana
          ? [
              `Maximum Mana: ${formatNumber(scaledMana)} + 20 × ${result.attrs.INT} = ${formatNumber(row.mana![0])}`,
            ]
          : []),
        `Highest combat hire roll: ${level} × ${formatPercent(bands.bc, { decimals: 2, preserveNonzero: true })}, rounded, − 1 = ${combatCeiling - 1}`,
        `Combat hire roll: chosen within 0 through ${combatCeiling - 1} = 0`,
        `Attack Power: 0 + ${veteran} + ${result.attrs.STR} = ${formatNumber(row.atk![0])}`,
        `Intelligence contribution: 150% × ${result.attrs.INT} = ${spellBonus}, rounded`,
        `Spell Power: 0 + ${veteran} + ${spellBonus} = ${formatNumber(row.spell![0])}`,
      ],
    }),
  };
}

// Source: server-scripts/Player.cs:10635-10677 — race selection precedes independent resource rolls and the shared combat roll. Repeated-hire expectations are derived from those probabilities.
export function mercenaryHiringOdds(
  raceChance: number,
  statChance: number,
  price: number,
): Calculation {
  const chance = raceChance * statChance;
  const hires = chance > 0 ? 1 / chance : Number.POSITIVE_INFINITY;
  const roundedHires = Number(hires.toFixed(1));
  const roundedGold = Math.round(hires * price);
  return {
    steps: [
      {
        name: "Qualifying hire chance",
        expression:
          "Chance of the chosen race × chance its stat rolls meet your thresholds",
      },
      { name: "Expected hires", expression: "1 ÷ qualifying hire chance" },
      {
        name: "Expected gold",
        expression: "Gold per hire ÷ qualifying hire chance",
      },
    ],
    example: () => ({
      given: [
        `${formatPercent(raceChance, { decimals: 2, preserveNonzero: true })} race chance`,
        `${formatPercent(statChance, { decimals: 2, preserveNonzero: true })} chance of meeting the stat thresholds`,
        `${formatNumber(price)} gold per hire`,
      ],
      result:
        chance > 0
          ? `${formatPercent(chance, { decimals: 2, preserveNonzero: true })} chance per hire, averaging about ${formatNumber(roundedHires)} ${roundedHires === 1 ? "hire" : "hires"} and about ${formatNumber(roundedGold)} gold`
          : "No qualifying hire from these choices",
      working: [
        `Qualifying hire chance: ${formatPercent(raceChance, { decimals: 2, preserveNonzero: true })} × ${formatPercent(statChance, { decimals: 2, preserveNonzero: true })} = ${formatPercent(chance, { decimals: 2, preserveNonzero: true })}`,
        ...(chance > 0
          ? [
              `Expected hires: 1 ÷ ${formatPercent(chance, { decimals: 2, preserveNonzero: true })} = about ${formatNumber(roundedHires)}`,
              `Expected gold: ${formatNumber(price)} ÷ ${formatPercent(chance, { decimals: 2, preserveNonzero: true })} = about ${formatNumber(roundedGold)} gold`,
            ]
          : [
              "Expected hires: 1 ÷ 0% = no finite expectation",
              `Expected gold: ${formatNumber(price)} ÷ 0% = no finite expectation`,
            ]),
      ],
    }),
  };
}
