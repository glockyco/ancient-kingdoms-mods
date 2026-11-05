import { statName } from "$lib/stats";
import type {
  Calculation,
  CalculationExample,
  CalculationInput,
  CalculationStep,
} from "$lib/types/calculation";
import { divideF32, iround, multiplyF32 } from "$lib/calculation/unity-math";
import { applyHonestyGain, honestyGainBonus } from "$lib/calculation/virtues";
import { formatNumber } from "$lib/utils/format";

const percent = (fraction: number) => `${Math.round(fraction * 1000) / 10}%`;

// Source: server-scripts/Player.cs:ApplyVirtueFactionGain — Honesty raises each positive gain, rounded.
const HONESTY_STEP: CalculationStep = {
  name: "With an Honesty Blessing",
  expression: `Reputation Gained × (100% + ${percent(honestyGainBonus(1))} per Honesty rank, ${percent(honestyGainBonus(0))} at rank 0)`,
  rounding: "nearest",
};

const HONESTY_INPUT: CalculationInput = {
  key: "honestyRank",
  label: "Honesty Blessing",
  choices: [
    { value: -1, label: "None" },
    ...[0, 1, 2, 3, 4, 5].map((rank) => ({
      value: rank,
      label: `Rank ${rank}`,
    })),
  ],
  value: -1,
  min: -1,
  max: 5,
  step: 1,
};

/** A reputation calculation with the Honesty blessing as a choice under its "Use your numbers". */
function withHonesty(
  steps: CalculationStep[],
  gain: number,
  example: (blessed: number) => Omit<CalculationExample, "working"> & {
    working: string[];
  },
): Calculation {
  return {
    steps: [...steps.slice(0, -1), HONESTY_STEP, steps.at(-1)!],
    inputs: [HONESTY_INPUT],
    example: ({ honestyRank }) => {
      const rank =
        honestyRank === undefined || honestyRank < 0 ? null : honestyRank;
      const blessed = applyHonestyGain(gain, rank);
      const base = example(blessed);
      return {
        ...base,
        given:
          rank === null
            ? base.given
            : [...base.given, `Honesty blessing at rank ${rank}`],
        working:
          rank === null
            ? base.working
            : [
                ...base.working.slice(0, -1),
                `With an Honesty Blessing: ${formatNumber(gain)} × ${percent(1 + honestyGainBonus(rank))} = ${formatNumber(blessed)}, rounded`,
                base.working.at(-1)!,
              ],
      };
    },
  };
}
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
  return withHonesty(
    [
      {
        name: `${statName("health")} Contribution`,
        expression: `Monster's maximum Hit Points ÷ ${formatNumber(2000)}`,
        rounding: "nearest",
      },
      {
        name: "Base Gain",
        expression: "Monster level + Hit Points Contribution",
      },
      {
        name: "Reputation Gained",
        expression:
          "Base Gain × 20 for a boss, × 10 for an elite, or unchanged for a normal monster",
      },
      {
        name: "Reputation Lost",
        expression:
          "Monster level × 2 for a boss, × 1 for an elite, or × 75% for a normal monster, not rounded",
      },
    ],
    gain,
    (blessed) => ({
      given: [
        `Level ${level} ${boss ? "boss" : elite ? "elite" : "normal monster"}`,
        `${formatNumber(health)} maximum Hit Points`,
      ],
      result: `+${formatNumber(blessed)} reputation with each faction it raises, −${formatNumber(loss)} with each faction it lowers`,
      working: [
        `${statName("health")} Contribution: ${formatNumber(health)} ÷ ${formatNumber(2000)} = ${formatNumber(healthContribution)}, rounded`,
        `Base Gain: ${level} + ${formatNumber(healthContribution)} = ${formatNumber(base)}`,
        `Reputation Gained: ${formatNumber(base)} × ${factor} = ${formatNumber(gain)}`,
        `Reputation Lost: ${level} × ${lossFactor === 0.75 ? "75%" : lossFactor} = ${formatNumber(loss)}`,
      ],
    }),
  );
}

// Source: server-scripts/Npc.cs:1592-1593,1618-1628,1651-1661 — factionGain is level × 1.5, × 60 when isNotableNPC, while losses subtract level × 5.
// Source: website/data/compendium.db npcs table — King Darin's level is 60.
export function npcReputation(level = 60, notable = true): Calculation {
  const baseGain = multiplyF32(level, 1.5);
  const gain = multiplyF32(baseGain, notable ? 60 : 1);
  const loss = multiplyF32(level, 5);
  return withHonesty(
    [
      { name: "Base Reputation Gain", expression: "150% of NPC level" },
      {
        name: "Reputation Gained",
        expression:
          "Base Reputation Gain × 60 for a Notable NPC, otherwise unchanged",
      },
      {
        name: "Reputation Lost",
        expression: "5 reputation points per NPC level",
      },
    ],
    gain,
    (blessed) => ({
      given: [`Level ${level} ${notable ? "Notable" : "ordinary"} NPC`],
      result: `+${formatNumber(blessed)} reputation with each faction it raises, −${formatNumber(loss)} with each faction it lowers`,
      working: [
        `Base Reputation Gain: 150% × ${level} = ${formatNumber(baseGain)}`,
        `Reputation Gained: ${formatNumber(baseGain)} × ${notable ? 60 : "100%"} = ${formatNumber(gain)}`,
        `Reputation Lost: 5 × ${level} = ${formatNumber(loss)}`,
      ],
    }),
  );
}
