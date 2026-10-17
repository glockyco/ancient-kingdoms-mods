import type { Calculation } from "$lib/types/calculation";
import { floorToInt, multiplyF32 } from "$lib/calculation/unity-math";
import { formatNumber } from "$lib/utils/format";

// Source: server-scripts/Combat.cs:1236-1244,1247-1325 — Mystic Spark calculates Mana from the pre-shield hit, capped by pre-hit Health, before wards and Mana Shield absorb damage.
export function mysticSparkMana(hit = 200, targetHealth = 150): Calculation {
  const eligible = Math.min(hit, targetHealth);
  const mana = floorToInt(multiplyF32(eligible, 0.35));
  return {
    // Source: server-scripts/Combat.cs:1236-1325 — Mana gain precedes shield absorption, so the visible hit is usable for an unshielded target.
    note: "Use a hit on a target without shields. Shield absorption can hide damage that Mystic Spark counts for Mana.",
    steps: [
      {
        name: "Eligible hit damage",
        expression: "The hit's damage number",
        limit: "at most the target's Health before the hit",
      },
      {
        name: "Mana gained",
        expression: "35% of eligible hit damage",
        rounding: "down",
        limit: "at most your missing Mana",
      },
    ],
    example: () => ({
      given: [
        `${formatNumber(hit)} hit damage`,
        `${formatNumber(targetHealth)} target Health before the hit`,
        "Enough missing Mana for the full gain",
      ],
      result: `${formatNumber(mana)} Mana restored`,
      working: [
        `Eligible hit damage: smaller of ${formatNumber(hit)} and ${formatNumber(targetHealth)} = ${formatNumber(eligible)}`,
        `Mana gained: 35% × ${formatNumber(eligible)} = ${formatNumber(mana)} Mana, rounded down`,
      ],
    }),
  };
}
