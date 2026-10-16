import type { Calculation } from "$lib/types/calculation";
import { ceilToInt, divideF32 } from "$lib/calculation/unity-math";
import { formatNumber } from "./format";
import { situational } from "./inputs";

// Source: server-scripts/PlayerLooting.cs:149-168 — each nearby player receives the float-divided share rounded upward.
export function partyGold(): Calculation {
  return {
    steps: [
      {
        name: "Gold per nearby player",
        expression: "Gold collected ÷ nearby party players",
        rounding: "up",
      },
    ],
    inputs: [
      situational("gold", "Gold collected", 100),
      { ...situational("members", "Nearby party players", 3), min: 1, max: 5 },
    ],
    example: ({ gold, members }) => {
      const share = ceilToInt(divideF32(gold, members));
      return {
        given: [
          `${formatNumber(gold)} gold collected`,
          `${members} nearby players`,
        ],
        result: `${formatNumber(share)} gold per nearby player`,
        working: [
          `Gold per nearby player: ${formatNumber(gold)} ÷ ${members} = ${formatNumber(share)} gold, rounded up`,
        ],
      };
    },
  };
}
