import type { Calculation } from "$lib/types/calculation";
import { addF32, clamp, multiplyF32 } from "$lib/calculation/unity-math";
import { formatNumber, formatPercent } from "$lib/utils/format";
import { situational } from "./inputs";

// Source: server-scripts/Database.cs:3431-3439 — each target adds 0.0002 × min(50, account kills) in float, and the sum is clamped between 0 and 1.
const PER_KILL = 0.0002;
const KILL_LIMIT = 50;

/** Slayer mastery from targets at the kill limit plus kills on targets below it. */
export function slayerMastery(cappedTargets: number, otherKills: number) {
  const capped = multiplyF32(cappedTargets, multiplyF32(PER_KILL, KILL_LIMIT));
  const other = multiplyF32(otherKills, PER_KILL);
  return { capped, other, total: clamp(addF32(capped, other), 0, 1) };
}

export function slayerMasteryCalculation(): Calculation {
  return {
    steps: [
      {
        name: "Target contribution",
        expression:
          "Adds 0.02% Slayer mastery per kill of that target on your account",
        limit: "at most 1% per target, reached at 50 kills",
      },
      {
        name: "Slayer mastery",
        expression: "Every target's contribution added together",
        limit: "at most 100%",
      },
    ],
    inputs: [
      situational("cappedTargets", "Targets with 50 or more kills", 30),
      situational(
        "otherKills",
        "Kills on targets with fewer than 50 kills",
        120,
      ),
    ],
    example: ({ cappedTargets, otherKills }) => {
      const mastery = slayerMastery(cappedTargets, otherKills);
      return {
        given: [
          `${formatNumber(cappedTargets)} targets with 50 or more kills`,
          `${formatNumber(otherKills)} kills on targets with fewer than 50 kills`,
        ],
        result: `${formatPercent(mastery.total, { decimals: 2, preserveNonzero: true })} Slayer mastery`,
        working: [
          `Targets at the limit: ${formatNumber(cappedTargets)} × 1% = ${formatPercent(mastery.capped, { decimals: 2, preserveNonzero: true })}`,
          `Other kills: ${formatNumber(otherKills)} × 0.02% = ${formatPercent(mastery.other, { decimals: 2, preserveNonzero: true })}`,
          `Slayer mastery: ${formatPercent(mastery.capped, { decimals: 2, preserveNonzero: true })} + ${formatPercent(mastery.other, { decimals: 2, preserveNonzero: true })} = ${formatPercent(mastery.total, { decimals: 2, preserveNonzero: true })}, at most 100%`,
        ],
      };
    },
  };
}
