import { formatNumber } from "$lib/utils/format";
import { iround } from "$lib/calculation/unity-math";

export type KillReputationDirection = "improve" | "decrease";

/**
 * One reputation change applied on kill: a direction, the magnitude shared by
 * every faction in the group, and the factions it affects. The amount is
 * uniform within a direction, so a kill yields at most one improve and one
 * decrease effect.
 */
export interface KillReputationEffect {
  direction: KillReputationDirection;
  /** Signed amount or range, ready to display. */
  amount: string;
  /** Unsigned bounds for sorting without parsing display text. */
  amount_min: number;
  amount_max: number;
  factions: string[];
}

interface MonsterKillReputationInput {
  level_min: number;
  level_max: number;
  /** Exported Monster.health.max value used by GetFactionGain. */
  health: number;
  is_boss: boolean;
  is_elite: boolean;
  improve_faction: string[];
  decrease_faction: string[];
}

interface NpcKillReputationInput {
  level: number;
  is_notable: boolean;
  improve_faction: string[];
  decrease_faction: string[];
}

// Monster faction changes use the slain monster's level and exported max health.
// Improve adds (level + round(max health / 2000)) * rank factor. Decrease uses
// only level. Fractional results (normal-rank loss is level * 0.75) are kept
// exactly as the game adds them to the faction value, so up to two decimals are
// shown.

/**
 * Reputation changed per kill for a monster, formatted as a range across its
 * spawn levels (level_min..level_max).
 *
 * Source: server-scripts/Monster.cs:574-600 (formula),
 * 3150-3162 and 3186-3198 (party/solo reward application).
 * Improve adds (level.current + Mathf.RoundToInt(health.max / 2000)) *
 * (boss 20 / elite 10 / normal 1); decrease subtracts level.current *
 * (boss 2 / elite 1 / normal 0.75).
 */
function monsterReputationAmount(
  monster: MonsterKillReputationInput,
  direction: KillReputationDirection,
): Pick<KillReputationEffect, "amount" | "amount_min" | "amount_max"> {
  let min: number;
  let max: number;
  if (direction === "improve") {
    const rankMultiplier = monster.is_boss ? 20 : monster.is_elite ? 10 : 1;
    const healthBonus = iround(monster.health / 2000);
    min = (monster.level_min + healthBonus) * rankMultiplier;
    max = (monster.level_max + healthBonus) * rankMultiplier;
  } else {
    const multiplier = monster.is_boss ? 2 : monster.is_elite ? 1 : 0.75;
    min = monster.level_min * multiplier;
    max = monster.level_max * multiplier;
  }
  const sign = direction === "improve" ? "+" : "−";
  const first = `${sign}${formatNumber(min, { decimals: 2 })}`;
  return {
    amount:
      min === max
        ? first
        : `${first} to ${sign}${formatNumber(max, { decimals: 2 })}`,
    amount_min: min,
    amount_max: max,
  };
}

export function monsterKillReputation(
  monster: MonsterKillReputationInput,
): KillReputationEffect[] {
  const effects: KillReputationEffect[] = [];
  if (monster.improve_faction.length > 0) {
    effects.push({
      direction: "improve",
      ...monsterReputationAmount(monster, "improve"),
      factions: monster.improve_faction,
    });
  }
  if (monster.decrease_faction.length > 0) {
    effects.push({
      direction: "decrease",
      ...monsterReputationAmount(monster, "decrease"),
      factions: monster.decrease_faction,
    });
  }
  return effects;
}

/**
 * Reputation changed per kill for an NPC.
 *
 * Source: server-scripts/Npc.cs:1582-1614 (party) / 1629-1661 (solo).
 * Improve adds level.current * 1.5, multiplied by 60 for a notable NPC.
 * Decrease subtracts level.current * 5.
 */
export function npcKillReputation(
  npc: NpcKillReputationInput,
): KillReputationEffect[] {
  const effects: KillReputationEffect[] = [];
  const gain = npc.level * 1.5 * (npc.is_notable ? 60 : 1);
  const loss = npc.level * 5;
  if (npc.improve_faction.length > 0) {
    effects.push({
      direction: "improve",
      amount: `+${formatNumber(gain, { decimals: 2 })}`,
      amount_min: gain,
      amount_max: gain,
      factions: npc.improve_faction,
    });
  }
  if (npc.decrease_faction.length > 0) {
    effects.push({
      direction: "decrease",
      amount: `−${formatNumber(loss, { decimals: 2 })}`,
      amount_min: loss,
      amount_max: loss,
      factions: npc.decrease_faction,
    });
  }
  return effects;
}
