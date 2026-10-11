import type { Calculation } from "$lib/types/calculation";
import { formatPercent, formatSeconds } from "./format";
import { situational } from "./inputs";

// Source: server-scripts/Monster.cs:2214-2219,2866-2877 — a failed independent probability roll starts another respawn interval. Expected waits and repeated-roll odds below are derived from that process, not game-side stat calculations.
export function rareSpawnOdds(chance: number, interval: number): Calculation {
  return {
    steps: [
      {
        name: "Failure chance per roll",
        expression: "100% − the rare's spawn chance",
      },
      {
        name: "Chance every roll fails",
        expression: "Failure chance per roll raised to the number of rolls",
      },
      {
        name: "Chance of at least one spawn",
        expression: "100% − chance every roll fails",
      },
    ],
    inputs: [{ ...situational("rolls", "Spawn rolls", 3), min: 1, max: 100 }],
    example: ({ rolls }) => {
      const failure = 1 - chance;
      const allFail = failure ** rolls;
      return {
        given: [
          `${formatPercent(chance)} chance per roll`,
          `${rolls} independent rolls`,
          `${formatSeconds(interval)} between rolls without renewals`,
        ],
        result: `${formatPercent(1 - allFail)} chance of at least one spawn`,
        working: [
          `Failure chance per roll: 100% − ${formatPercent(chance)} = ${formatPercent(failure)}`,
          `Chance every roll fails: ${formatPercent(failure)} raised to ${rolls} = ${formatPercent(allFail)}`,
          `Chance of at least one spawn: 100% − ${formatPercent(allFail)} = ${formatPercent(1 - allFail)}`,
        ],
      };
    },
  };
}
export function rareSpawnWait(chance: number, interval: number): Calculation {
  const seconds = interval / chance;
  return {
    steps: [
      {
        name: "Expected wait",
        expression: "Respawn interval ÷ spawn chance, excluding corpse time",
      },
    ],
    example: () => ({
      given: [
        `${formatSeconds(interval)} interval`,
        `${formatPercent(chance)} spawn chance`,
      ],
      result: `About ${formatSeconds(seconds)} on average`,
      working: [
        `Expected wait: ${formatSeconds(interval)} ÷ ${formatPercent(chance)} = about ${formatSeconds(seconds)}`,
      ],
    }),
  };
}
