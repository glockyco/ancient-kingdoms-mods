import type { Calculation } from "$lib/types/calculation";
import { addF32, iround, multiplyF32 } from "$lib/planner/engine-math";
import { formatNumber, formatPercent } from "./format";
import { situational } from "./inputs";

// Source: server-scripts/BardFinalCadenceSkill.cs:67-70; server-scripts/PlayerSkills.cs:1576-1602 — Melody multiplies each already rounded Charisma-scaled amount and rounds again.
export function melodyBonus(songs: number): number {
  return songs >= 6 ? 0.3 : songs === 5 ? 0.25 : songs === 4 ? 0.15 : 0;
}
export function finalCadenceMelody(): Calculation {
  return {
    steps: [
      {
        name: "Melody multiplier",
        expression: "100% + the bonus for distinct songs from the table",
      },
      {
        name: "Damage or healing",
        expression: "Charisma-scaled amount × Melody multiplier",
        rounding: "nearest",
      },
    ],
    inputs: [
      situational(
        "scaledAmount",
        "Amount after Charisma scaling and rounding",
        100,
      ),
      { ...situational("songs", "Distinct songs cast by hand", 4), max: 30 },
    ],
    example: ({ scaledAmount, songs }) => {
      const multiplier = addF32(1, melodyBonus(songs));
      const total = iround(multiplyF32(scaledAmount, multiplier));
      return {
        given: [
          `${formatNumber(scaledAmount)} after Charisma scaling`,
          `${songs} distinct songs cast by hand`,
        ],
        result: `${formatNumber(total)} damage before defenses, or healing before missing-Health limits`,
        working: [
          `Melody multiplier: 100% + ${formatPercent(melodyBonus(songs))} = ${formatPercent(multiplier)}`,
          `Damage or healing: ${formatNumber(scaledAmount)} × ${formatPercent(multiplier)} = ${formatNumber(total)}, rounded`,
        ],
      };
    },
  };
}
