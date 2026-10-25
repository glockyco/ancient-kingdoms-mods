import { statName } from "$lib/stats";
import type { Calculation } from "$lib/types/calculation";
import { divideF32, iround, multiplyF32 } from "$lib/calculation/unity-math";
import { formatNumber } from "$lib/utils/format";

// Source: server-scripts/Monster.cs:591-615 — only the Health contribution rounds, and normal monster reputation loss keeps its fraction.
export function reputationExample(
  level = 70,
  health = 3_000_000,
  boss = true,
  elite = false,
): Calculation {
  const healthContribution = iround(divideF32(health, 2000));
  const base = level + healthContribution;
  const factor = boss ? 20 : elite ? 10 : 1;
  const gain = multiplyF32(base, factor);
  const lossFactor = boss ? 2 : elite ? 1 : 0.75;
  const loss = multiplyF32(level, lossFactor);
  return {
    steps: [
      {
        name: `${statName("health")} contribution`,
        expression: `Monster's maximum Hit Points ÷ ${formatNumber(2000)}`,
        rounding: "nearest",
      },
      {
        name: "Base gain",
        expression: "Monster level + Hit Points contribution",
      },
      {
        name: "Reputation gained",
        expression:
          "Base gain × 20 for a boss, × 10 for an elite, or unchanged for a normal monster",
      },
      {
        name: "Reputation lost",
        expression:
          "Monster level × 2 for a boss, × 1 for an elite, or × 75% for a normal monster, not rounded",
      },
    ],
    example: () => ({
      given: [
        `Level ${level} ${boss ? "boss" : elite ? "elite" : "normal monster"}`,
        `${formatNumber(health)} maximum Hit Points`,
      ],
      result: `+${formatNumber(gain)} reputation with each faction it raises, −${formatNumber(loss)} with each faction it lowers`,
      working: [
        `${statName("health")} contribution: ${formatNumber(health)} ÷ ${formatNumber(2000)} = ${formatNumber(healthContribution)}, rounded`,
        `Base gain: ${level} + ${formatNumber(healthContribution)} = ${formatNumber(base)}`,
        `Reputation gained: ${formatNumber(base)} × ${factor} = ${formatNumber(gain)}`,
        `Reputation lost: ${level} × ${lossFactor === 0.75 ? "75%" : lossFactor} = ${formatNumber(loss)}`,
      ],
    }),
  };
}

// Source: server-scripts/Npc.cs:1592-1593,1618-1628,1651-1661 — factionGain is level × 1.5, × 60 when isNotableNPC, while losses subtract level × 5.
// Source: website/data/compendium.db npcs table — King Darin's level is 60.
export function npcReputation(level = 60, notable = true): Calculation {
  const baseGain = multiplyF32(level, 1.5);
  const gain = multiplyF32(baseGain, notable ? 60 : 1);
  const loss = multiplyF32(level, 5);
  return {
    steps: [
      { name: "Base reputation gain", expression: "150% of NPC level" },
      {
        name: "Reputation gained",
        expression:
          "Base reputation gain × 60 for a Notable NPC, otherwise unchanged",
      },
      {
        name: "Reputation lost",
        expression: "5 reputation points per NPC level",
      },
    ],
    example: () => ({
      given: [`Level ${level} ${notable ? "Notable" : "ordinary"} NPC`],
      result: `+${formatNumber(gain)} reputation with each faction it raises, −${formatNumber(loss)} with each faction it lowers`,
      working: [
        `Base reputation gain: 150% × ${level} = ${formatNumber(baseGain)}`,
        `Reputation gained: ${formatNumber(baseGain)} × ${notable ? 60 : "100%"} = ${formatNumber(gain)}`,
        `Reputation lost: 5 × ${level} = ${formatNumber(loss)}`,
      ],
    }),
  };
}
