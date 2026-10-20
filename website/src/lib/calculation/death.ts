import { statName } from "$lib/stats";
import type { Calculation } from "$lib/types/calculation";
import { iround, multiplyF32 } from "$lib/calculation/unity-math";
import { formatNumber } from "$lib/utils/format";
import { MAX_HEALTH, MAX_MANA, situational } from "./inputs";

// Source: server-scripts/Player.cs:13370-13377,14533-14537; server-scripts/EnergyResource.cs:21-35 — XP fractions and resurrection resources round to even, restored Mana is capped independently.
export function deathRecovery(): Calculation {
  return {
    steps: [
      {
        name: "Remains XP recovery",
        expression: "50% of XP lost",
        rounding: "nearest",
      },
      {
        name: "Resurrection XP recovery",
        expression: "75% of XP lost",
        rounding: "nearest",
      },
      {
        name: `${statName("health")} after Resurrection`,
        expression: "60% of maximum Hit Points",
        rounding: "nearest",
      },
      {
        name: `${statName("mana")} after Resurrection`,
        expression: "20% of maximum Hit Points",
        rounding: "nearest",
        limit: "at most maximum Mana",
      },
    ],
    inputs: [
      situational("lostXp", "XP lost on death", 101),
      MAX_HEALTH,
      MAX_MANA,
    ],
    example: ({ lostXp, maxHealth, maxMana }) => {
      const remains = iround(multiplyF32(lostXp, 0.5));
      const resurrection = iround(multiplyF32(lostXp, 0.75));
      const health = iround(multiplyF32(maxHealth, 0.6));
      const uncappedMana = iround(multiplyF32(maxHealth, 0.2));
      const mana = Math.min(maxMana, uncappedMana);
      return {
        given: [
          `${formatNumber(lostXp)} XP lost`,
          `${formatNumber(maxHealth)} maximum Hit Points`,
          `${formatNumber(maxMana)} maximum Mana`,
        ],
        result: `${formatNumber(remains)} XP from remains, or ${formatNumber(resurrection)} XP, ${formatNumber(health)} Hit Points and ${formatNumber(mana)} Mana from Resurrection`,
        working: [
          `Remains XP recovery: 50% × ${formatNumber(lostXp)} = ${formatNumber(remains)} XP, rounded`,
          `Resurrection XP recovery: 75% × ${formatNumber(lostXp)} = ${formatNumber(resurrection)} XP, rounded`,
          `${statName("health")} after Resurrection: 60% × ${formatNumber(maxHealth)} = ${formatNumber(health)} Hit Points, rounded`,
          `${statName("mana")} after Resurrection: 20% × ${formatNumber(maxHealth)} = ${formatNumber(uncappedMana)} Mana, rounded${mana < uncappedMana ? `, limited to ${formatNumber(mana)} Mana` : ""}`,
        ],
      };
    },
  };
}
