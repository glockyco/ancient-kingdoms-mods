import type { Calculation } from "$lib/types/calculation";
import { formatDuration, formatPercent } from "$lib/utils/format";
import { situational } from "./inputs";

// Source: server-scripts/Monster.cs:UpdateServer_DEAD,OnDeath — failed independent rolls restart the respawn timer; the first deadline also includes corpse time. Odds and average waits are derived from these rolls for non-summoned rares in an active zone.
export function rareSpawnOdds(chance: number): Calculation {
  return {
    steps: [
      {
        name: "Failure Chance per Roll",
        expression: "100% − the rare's spawn chance",
      },
      {
        name: "Chance Every Roll Fails",
        expression: "Failure Chance per Roll raised to the number of rolls",
      },
      {
        name: "Chance of at Least One Spawn",
        expression: "100% − Chance Every Roll Fails",
      },
    ],
    inputs: [{ ...situational("rolls", "Spawn Rolls", 3), min: 1, max: 100 }],
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
          `Failure Chance per Roll: 100% − ${formatPercent(chance, { decimals: 2, preserveNonzero: true })} = ${formatPercent(failure, { decimals: 2, preserveNonzero: true })}`,
          `Chance Every Roll Fails: ${formatPercent(failure, { decimals: 2, preserveNonzero: true })} raised to ${rolls} = ${formatPercent(allFail, { decimals: 2, preserveNonzero: true })}`,
          `Chance of at Least One Spawn: 100% − ${formatPercent(allFail, { decimals: 2, preserveNonzero: true })} = ${formatPercent(1 - allFail, { decimals: 2, preserveNonzero: true })}`,
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
        name: "Average Wait",
        expression: "Respawn timer ÷ spawn chance, excluding corpse time",
      },
    ],
    example: () => ({
      given: [
        `${formatDuration(interval)} respawn timer`,
        `${formatPercent(chance, { decimals: 2, preserveNonzero: true })} spawn chance`,
      ],
      result: `${formatDuration(seconds)} on average`,
      working: [
        `Average Wait: ${formatDuration(interval)} ÷ ${formatPercent(chance, { decimals: 2, preserveNonzero: true })} = ${formatDuration(seconds)}`,
      ],
    }),
  };
}
