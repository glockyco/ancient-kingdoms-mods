import { statName } from "$lib/stats";
import type { Calculation } from "$lib/types/calculation";
import { floorToInt, multiplyF32 } from "$lib/calculation/unity-math";
import { formatNumber } from "$lib/utils/format";

// Source: server-scripts/Combat.cs:1196-1204,1207-1285 — Mystic Spark calculates Mana from the pre-shield hit, capped by pre-hit Health, before wards and Mana Shield absorb damage.
export function mysticSparkMana(hit = 200, targetHealth = 150): Calculation {
  const eligible = Math.min(hit, targetHealth);
  const mana = floorToInt(multiplyF32(eligible, 0.35));
  return {
    // Source: server-scripts/Combat.cs:1196-1285 — Mana gain precedes shield absorption, so the visible hit is usable for an unshielded target.
    note: "Use a hit on a target without a ward or Mana Shield. They absorb damage after Mystic Spark counts it, so they lower the damage number you see.",
    steps: [
      {
        name: "Eligible Hit Damage",
        expression: "The hit's damage number",
        limit: "at most the target's Hit Points before the hit",
      },
      {
        name: `${statName("mana")} Gained`,
        expression: "35% of Eligible Hit Damage",
        rounding: "down",
        limit: "at most your missing Mana",
      },
    ],
    example: () => ({
      given: [
        `${formatNumber(hit)} hit damage`,
        `${formatNumber(targetHealth)} target Hit Points before the hit`,
        "Enough missing Mana for the full gain",
      ],
      result: `${formatNumber(mana)} Mana restored`,
      working: [
        `Eligible Hit Damage: smaller of ${formatNumber(hit)} and ${formatNumber(targetHealth)} = ${formatNumber(eligible)}`,
        `Mana Gained: 35% × ${formatNumber(eligible)} = ${formatNumber(mana)} Mana, rounded down`,
      ],
    }),
  };
}
