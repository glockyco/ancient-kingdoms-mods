import type { Calculation } from "$lib/types/calculation";
import { formatPercent } from "$lib/utils/format";
import { situational } from "./inputs";

// Source: server-scripts/Monster.cs:UpdateServer_DEAD,OnDeath — failed independent rolls restart the respawn timer; the first deadline also includes corpse time. Odds and average waits are derived from these rolls for non-summoned rares in an active zone.
export function rareSpawnOdds(chance: number): Calculation {
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
          `${formatPercent(chance, { decimals: 2, preserveNonzero: true })} chance per roll`,
          `${rolls} independent rolls`,
        ],
        result: `${formatPercent(1 - allFail, { decimals: 2, preserveNonzero: true })} chance of at least one spawn`,
        working: [
          `Failure chance per roll: 100% − ${formatPercent(chance, { decimals: 2, preserveNonzero: true })} = ${formatPercent(failure, { decimals: 2, preserveNonzero: true })}`,
          `Chance every roll fails: ${formatPercent(failure, { decimals: 2, preserveNonzero: true })} raised to ${rolls} = ${formatPercent(allFail, { decimals: 2, preserveNonzero: true })}`,
          `Chance of at least one spawn: 100% − ${formatPercent(allFail, { decimals: 2, preserveNonzero: true })} = ${formatPercent(1 - allFail, { decimals: 2, preserveNonzero: true })}`,
        ],
      };
    },
  };
}
function duration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = Number((seconds % 60).toFixed(2));
  return (
    [
      [hours, "h"],
      [minutes, "min"],
      [remainder, "s"],
    ]
      .filter(([amount]) => Number(amount) > 0)
      .map(([amount, unit]) => `${amount} ${unit}`)
      .join(" ") || "0 s"
  );
}

export function rareSpawnWait(chance: number, interval: number): Calculation {
  const seconds = interval / chance;
  return {
    steps: [
      {
        name: "Average wait",
        expression: "Respawn timer ÷ spawn chance, excluding corpse time",
      },
    ],
    example: () => ({
      given: [
        `${duration(interval)} respawn timer`,
        `${formatPercent(chance, { decimals: 2, preserveNonzero: true })} spawn chance`,
      ],
      result: `About ${duration(seconds)} on average`,
      working: [
        `Average wait: ${duration(interval)} ÷ ${formatPercent(chance, { decimals: 2, preserveNonzero: true })} = about ${duration(seconds)}`,
      ],
    }),
  };
}
