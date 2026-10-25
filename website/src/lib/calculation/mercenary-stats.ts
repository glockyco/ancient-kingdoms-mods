import { statName } from "$lib/stats";
import type { Calculation } from "$lib/types/calculation";
import { f32, iround, multiplyF32 } from "$lib/calculation/unity-math";
import { CLASSES, RACES } from "$lib/utils/merc-stats";
import type { ClassResult, Curves } from "$lib/utils/merc-stats";
import { formatNumber, formatPercent } from "$lib/utils/format";

// Source: server-scripts/Player.cs:10738-10793,11029-11049,UpdateMercStatsByLevel; server-scripts/Health.cs:28-41; server-scripts/Mana.cs:28-41; server-scripts/Strength.cs:15-17; server-scripts/Intelligence.cs:36-38 — saved multipliers and shared combat rolls combine with current attributes and veteran totals.
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
        name: statName("constitution"),
        expression: `Current level ÷ ${CLASSES[cls].div.CON} for ${cls}`,
        rounding: "down",
      },
      {
        name: statName("intelligence"),
        expression: `Current level ÷ ${CLASSES[cls].div.INT} for ${cls}`,
        rounding: "down",
      },
      {
        name: statName("strength"),
        expression: `Current level ÷ ${CLASSES[cls].div.STR} for ${cls}`,
        rounding: "down",
      },
      {
        name: `Base ${statName("health")}`,
        expression: `Level 1 Hit Points for ${cls} + Hit Points gained per level × (current level − 1)`,
      },
      ...(result.hasMana
        ? [
            {
              name: `Base ${statName("mana")}`,
              expression: `Level 1 Mana for ${cls} + Mana gained per level × (current level − 1)`,
            },
          ]
        : []),
      {
        name: `${statName("health")} hire roll`,
        expression: `Random percentage between ${formatPercent(bands.hp[0], { decimals: 2, preserveNonzero: true })} and ${formatPercent(bands.hp[1], { decimals: 2, preserveNonzero: true })}, saved when hired`,
      },
      ...(result.hasMana
        ? [
            {
              name: `${statName("mana")} hire roll`,
              expression: `Random percentage between ${formatPercent(bands.mana[0], { decimals: 2, preserveNonzero: true })} and ${formatPercent(bands.mana[1], { decimals: 2, preserveNonzero: true })}, saved when hired`,
            },
          ]
        : []),
      {
        name: `${statName("health")} scaling percentage`,
        expression: "Hit Points hire roll + 0.25% × total veteran points",
      },
      ...(result.hasMana
        ? [
            {
              name: `${statName("mana")} scaling percentage`,
              expression: "Mana hire roll + 0.25% × total veteran points",
            },
          ]
        : []),
      {
        name: `Scaled ${statName("health")}`,
        expression: "Base Hit Points × Hit Points scaling percentage",
        rounding: "nearest",
      },
      ...(result.hasMana
        ? [
            {
              name: `Scaled ${statName("mana")}`,
              expression: "Base Mana × Mana scaling percentage",
              rounding: "nearest" as const,
            },
          ]
        : []),
      {
        name: statName("health"),
        expression: "Scaled Hit Points + 25 × Constitution",
      },
      ...(result.hasMana
        ? [
            {
              name: statName("mana"),
              expression: "Scaled Mana + 20 × Intelligence",
            },
          ]
        : []),
      {
        name: "Highest combat hire roll",
        expression: `Round (hiring level × ${formatPercent(bands.bc, { decimals: 2, preserveNonzero: true })} for ${race}), then subtract 1`,
      },
      {
        name: "Combat hire roll",
        expression:
          "Random whole number from 0 through the highest combat hire roll, saved when hired",
      },
      {
        name: statName("attack_power"),
        expression: "Combat hire roll + total veteran points + Strength",
      },
      {
        name: `${statName("intelligence")} contribution`,
        expression: "150% of Intelligence",
        rounding: "nearest",
      },
      {
        name: statName("spell_power"),
        expression:
          "Combat hire roll + total veteran points + Intelligence contribution",
      },
    ],
    example: () => ({
      given: [
        `${race} ${cls} (class and race from Hiring odds & cost), level ${level}, ${veteran} total veteran points`,
        `Lowest Hit Points${result.hasMana ? " and Mana" : ""} hire rolls and a combat hire roll of 0`,
        "No equipment",
      ],
      result: `${formatNumber(row.hp![0])} maximum Hit Points${row.mana ? `, ${formatNumber(row.mana[0])} maximum Mana` : ""}, ${formatNumber(row.atk![0])} Attack Power and ${formatNumber(row.spell![0])} Spell Power`,
      working: [
        `${statName("constitution")}: ${level} ÷ ${CLASSES[cls].div.CON} = ${result.attrs.CON}, rounded down`,
        `${statName("intelligence")}: ${level} ÷ ${CLASSES[cls].div.INT} = ${result.attrs.INT}, rounded down`,
        `${statName("strength")}: ${level} ÷ ${CLASSES[cls].div.STR} = ${result.attrs.STR}, rounded down`,
        `Base ${statName("health")}: ${formatNumber(curve.hp_base)} + ${formatNumber(curve.hp_per)} × (${level} − 1) = ${formatNumber(result.hpCurve)}`,
        ...(result.hasMana
          ? [
              `Base ${statName("mana")}: ${formatNumber(curve.mana_base)} + ${formatNumber(curve.mana_per)} × (${level} − 1) = ${formatNumber(result.manaCurve)}`,
            ]
          : []),
        `${statName("health")} hire roll: lowest allowed percentage = ${formatPercent(bands.hp[0], { decimals: 2, preserveNonzero: true })}`,
        ...(result.hasMana
          ? [
              `${statName("mana")} hire roll: lowest allowed percentage = ${formatPercent(bands.mana[0], { decimals: 2, preserveNonzero: true })}`,
            ]
          : []),
        `${statName("health")} scaling percentage: ${formatPercent(bands.hp[0], { decimals: 2, preserveNonzero: true })} + 0.25% × ${veteran} = ${formatPercent(healthMultiplier, { decimals: 2, preserveNonzero: true })}`,
        ...(result.hasMana
          ? [
              `${statName("mana")} scaling percentage: ${formatPercent(bands.mana[0], { decimals: 2, preserveNonzero: true })} + 0.25% × ${veteran} = ${formatPercent(manaMultiplier, { decimals: 2, preserveNonzero: true })}`,
            ]
          : []),
        `Scaled ${statName("health")}: ${formatNumber(result.hpCurve)} × ${formatPercent(healthMultiplier, { decimals: 2, preserveNonzero: true })} = ${formatNumber(scaledHealth)}, rounded`,
        ...(result.hasMana
          ? [
              `Scaled ${statName("mana")}: ${formatNumber(result.manaCurve)} × ${formatPercent(manaMultiplier, { decimals: 2, preserveNonzero: true })} = ${formatNumber(scaledMana)}, rounded`,
            ]
          : []),
        `${statName("health")}: ${formatNumber(scaledHealth)} + 25 × ${result.attrs.CON} = ${formatNumber(row.hp![0])}`,
        ...(result.hasMana
          ? [
              `${statName("mana")}: ${formatNumber(scaledMana)} + 20 × ${result.attrs.INT} = ${formatNumber(row.mana![0])}`,
            ]
          : []),
        `Highest combat hire roll: round (${level} × ${formatPercent(bands.bc, { decimals: 2, preserveNonzero: true })}) − 1 = ${combatCeiling - 1}`,
        `Combat hire roll: chosen within 0 through ${combatCeiling - 1} = 0`,
        `${statName("attack_power")}: 0 + ${veteran} + ${result.attrs.STR} = ${formatNumber(row.atk![0])}`,
        `${statName("intelligence")} contribution: 150% × ${result.attrs.INT} = ${spellBonus}, rounded`,
        `${statName("spell_power")}: 0 + ${veteran} + ${spellBonus} = ${formatNumber(row.spell![0])}`,
      ],
    }),
  };
}

// Source: server-scripts/Player.cs:10733-10793 — race selection precedes independent resource rolls and the shared combat roll. Repeated-hire expectations are derived from those probabilities.
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
          "Chance of getting your chosen race × chance of meeting all your stat minimums",
      },
      { name: "Expected hires", expression: "1 ÷ qualifying hire chance" },
      {
        name: "Expected gold",
        expression: "Gold per hire ÷ qualifying hire chance",
      },
    ],
    note: "Expected hires and gold are averages, not guarantees. The calculator uses your unrounded chance per hire, then rounds the displayed chances and averages.",
    example: () => ({
      given: [
        `${formatPercent(raceChance, { decimals: 2, preserveNonzero: true })} chance of your chosen race`,
        `${formatPercent(statChance, { decimals: 2, preserveNonzero: true })} chance of meeting all your stat minimums`,
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
              `Expected hires: 1 ÷ unrounded qualifying hire chance ≈ ${formatNumber(roundedHires)}`,
              `Expected gold: ${formatNumber(price)} ÷ unrounded qualifying hire chance ≈ ${formatNumber(roundedGold)} gold`,
            ]
          : [
              "Expected hires: 1 ÷ 0% = no finite expectation",
              `Expected gold: ${formatNumber(price)} ÷ 0% = no finite expectation`,
            ]),
      ],
    }),
  };
}
