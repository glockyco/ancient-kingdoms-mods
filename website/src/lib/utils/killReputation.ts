export type KillReputationDirection = "improve" | "decrease";

/**
 * One reputation change applied on kill: a direction, the magnitude shared by
 * every faction in the group, and the factions it affects. The amount is
 * uniform within a direction, so a kill yields at most one improve and one
 * decrease effect.
 */
export interface KillReputationEffect {
  direction: KillReputationDirection;
  /** Pre-formatted amount, e.g. "174" or a level range like "15-21". */
  amount: string;
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
  improve_faction: string[];
  decrease_faction: string[];
}

// Monster faction changes use the slain monster's level and exported max health.
// Improve adds (level + round(max health / 2000)) * rank factor. Decrease uses
// only level. Fractional results (normal-rank loss is level * 0.5) are kept
// exactly as the game adds them to the faction value, so up to one decimal is
// shown.
const reputationAmountFormat = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 1,
});

// Unity's Mathf.RoundToInt uses midpoint-to-even rounding.
function roundToInt(value: number): number {
  const lower = Math.floor(value);
  const fraction = value - lower;
  if (fraction < 0.5) return lower;
  if (fraction > 0.5) return lower + 1;
  return lower % 2 === 0 ? lower : lower + 1;
}

/**
 * Reputation changed per kill for a monster, formatted as a range across its
 * spawn levels (level_min..level_max).
 *
 * Source: server-scripts-0.9.25.1/Monster.cs:494-520 (formula),
 * 2677-2689 and 2713-2725 (party/solo reward application).
 * Improve adds (level.current + Mathf.RoundToInt(health.max / 2000)) *
 * (boss 20 / elite 10 / normal 2); decrease subtracts level.current *
 * (boss 2 / elite 1 / normal 0.5).
 */
function monsterReputationAmount(
  monster: MonsterKillReputationInput,
  direction: KillReputationDirection,
): string {
  let min: number;
  let max: number;
  if (direction === "improve") {
    const rankMultiplier = monster.is_boss ? 20 : monster.is_elite ? 10 : 2;
    const healthBonus = roundToInt(monster.health / 2000);
    min = (monster.level_min + healthBonus) * rankMultiplier;
    max = (monster.level_max + healthBonus) * rankMultiplier;
  } else {
    const multiplier = monster.is_boss ? 2 : monster.is_elite ? 1 : 0.5;
    min = monster.level_min * multiplier;
    max = monster.level_max * multiplier;
  }
  if (min === max) return reputationAmountFormat.format(min);
  return `${reputationAmountFormat.format(min)}-${reputationAmountFormat.format(max)}`;
}

export function monsterKillReputation(
  monster: MonsterKillReputationInput,
): KillReputationEffect[] {
  const effects: KillReputationEffect[] = [];
  if (monster.improve_faction.length > 0) {
    effects.push({
      direction: "improve",
      amount: monsterReputationAmount(monster, "improve"),
      factions: monster.improve_faction,
    });
  }
  if (monster.decrease_faction.length > 0) {
    effects.push({
      direction: "decrease",
      amount: monsterReputationAmount(monster, "decrease"),
      factions: monster.decrease_faction,
    });
  }
  return effects;
}

/**
 * Reputation changed per kill for an NPC.
 *
 * Source: server-scripts-0.9.25.1/Npc.cs:1590-1600 (solo) / 1557-1567 (party share).
 * Improve adds level.current * 1.5; decrease subtracts level.current * 5.
 */
export function npcKillReputation(
  npc: NpcKillReputationInput,
): KillReputationEffect[] {
  const effects: KillReputationEffect[] = [];
  if (npc.improve_faction.length > 0) {
    effects.push({
      direction: "improve",
      amount: reputationAmountFormat.format(npc.level * 1.5),
      factions: npc.improve_faction,
    });
  }
  if (npc.decrease_faction.length > 0) {
    effects.push({
      direction: "decrease",
      amount: reputationAmountFormat.format(npc.level * 5),
      factions: npc.decrease_faction,
    });
  }
  return effects;
}
