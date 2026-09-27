import { iround } from "$lib/planner/engine-math";

// Source: server-scripts/DefaultEvent.cs:209-217 — a Forgotten Altar event adds
// Mathf.RoundToInt(GetTotalVeteranPoints() / 40f) to the player level before it
// scales each wave monster.
export function altarVeteranLevelBonus(totalVeteranPoints: number): number {
  return iround(totalVeteranPoints / 40);
}
