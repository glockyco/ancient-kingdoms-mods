import type { Calculation } from "$lib/types/calculation";
import { divideF32, iround, multiplyF32 } from "$lib/planner/engine-math";
import { formatNumber } from "./format";

// Source: server-scripts/Monster.cs:574-598 — only the Health contribution rounds, and normal monster reputation loss keeps its fraction.
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
        name: "Health contribution",
        expression: "Monster's maximum Health ÷ 2,000",
        rounding: "nearest",
      },
      { name: "Base gain", expression: "Monster level + Health contribution" },
      {
        name: "Reputation gained",
        expression: "Base gain × monster rank's multiplier from the table",
      },
      {
        name: "Reputation lost",
        expression:
          "Monster level × monster rank's loss multiplier from the table",
      },
    ],
    example: () => ({
      given: [
        `Level ${level} ${boss ? "boss" : elite ? "elite" : "normal monster"}`,
        `${formatNumber(health)} maximum Health`,
      ],
      result: `+${formatNumber(gain)} reputation for each improved faction, −${formatNumber(loss)} for each decreased faction`,
      working: [
        `Health contribution: ${formatNumber(health)} ÷ 2,000 = ${formatNumber(healthContribution)}, rounded`,
        `Base gain: ${level} + ${formatNumber(healthContribution)} = ${formatNumber(base)}`,
        `Reputation gained: ${formatNumber(base)} × ${factor} = ${formatNumber(gain)}`,
        `Reputation lost: ${level} × ${lossFactor} = ${formatNumber(loss)}`,
      ],
    }),
  };
}

// Source: server-scripts/Npc.cs:1582-1583,1608-1618,1641-1651 — factionGain is level × 1.5, × 60 when isNotableNPC, while losses subtract level × 5.
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
        expression: "Five reputation points per NPC level",
      },
    ],
    example: () => ({
      given: [`Level ${level} ${notable ? "Notable" : "ordinary"} NPC`],
      result: `+${formatNumber(gain)} for each improved faction, −${formatNumber(loss)} for each decreased faction`,
      working: [
        `Base reputation gain: 150% × ${level} = ${formatNumber(baseGain)}`,
        `Reputation gained: ${formatNumber(baseGain)} × ${notable ? 60 : "100%"} = ${formatNumber(gain)}`,
        `Reputation lost: 5 × ${level} = ${formatNumber(loss)}`,
      ],
    }),
  };
}
