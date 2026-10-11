import type { Calculation } from "$lib/types/calculation";
import { iround, multiplyF32 } from "$lib/planner/engine-math";
import { formatNumber } from "./format";
import { MAX_HEALTH, MAX_MANA, situational } from "./inputs";

// Source: server-scripts/Player.cs:13182-13189,14345-14349; server-scripts/EnergyResource.cs:21-35 — XP fractions and resurrection resources round to even, restored Mana is capped independently.
// Source: server-scripts/Player.cs:3556-3569; server-scripts/Entity.cs:346-356 — ordinary respawn restores half of maximum Health, rounded.
export function deathRecovery(): Calculation {
  return {
    steps: [
      {
        name: "Respawn Health",
        expression: "50% of maximum Health",
        rounding: "nearest",
      },
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
        name: "Resurrection Health",
        expression: "60% of maximum Health",
        rounding: "nearest",
      },
      {
        name: "Resurrection Mana",
        expression: "20% of maximum Health",
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
      const respawn = iround(multiplyF32(maxHealth, 0.5));
      const remains = iround(multiplyF32(lostXp, 0.5));
      const resurrection = iround(multiplyF32(lostXp, 0.75));
      const health = iround(multiplyF32(maxHealth, 0.6));
      const uncappedMana = iround(multiplyF32(maxHealth, 0.2));
      const mana = Math.min(maxMana, uncappedMana);
      return {
        given: [
          `${formatNumber(lostXp)} XP lost`,
          `${formatNumber(maxHealth)} maximum Health`,
          `${formatNumber(maxMana)} maximum Mana`,
        ],
        result: `${formatNumber(respawn)} Health on respawn, ${formatNumber(remains)} XP from remains, or ${formatNumber(resurrection)} XP, ${formatNumber(health)} Health and ${formatNumber(mana)} Mana from Resurrection`,
        working: [
          `Respawn Health: 50% × ${formatNumber(maxHealth)} = ${formatNumber(respawn)} Health, rounded`,
          `Remains XP recovery: 50% × ${formatNumber(lostXp)} = ${formatNumber(remains)} XP, rounded`,
          `Resurrection XP recovery: 75% × ${formatNumber(lostXp)} = ${formatNumber(resurrection)} XP, rounded`,
          `Resurrection Health: 60% × ${formatNumber(maxHealth)} = ${formatNumber(health)} Health, rounded`,
          `Resurrection Mana: 20% × ${formatNumber(maxHealth)} = ${formatNumber(uncappedMana)} Mana, rounded${mana < uncappedMana ? `, limited to ${formatNumber(mana)} Mana` : ""}`,
        ],
      };
    },
  };
}
