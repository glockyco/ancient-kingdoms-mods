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

// Per-kill reputation is the slain entity's level times a direction- and
// rank-specific factor. Fractional results (e.g. level * 0.5) are kept exactly
// as the game adds them to the faction value, so up to one decimal is shown.
const reputationAmountFormat = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 1,
});

/**
 * Reputation changed per kill for a monster, formatted as a range across its
 * spawn levels (level_min..level_max).
 *
 * Source: server-scripts/Monster.cs:2392-2420 (solo) / 2340-2368 (party share).
 * Improve adds level.current * (boss 3 / elite 2 / normal 1.5); decrease
 * subtracts level.current * (boss 2 / elite 1 / normal 0.5).
 */
function monsterReputationAmount(
  monster: MonsterKillReputationInput,
  direction: KillReputationDirection,
): string {
  let multiplier: number;
  if (direction === "improve") {
    if (monster.is_boss) multiplier = 3;
    else if (monster.is_elite) multiplier = 2;
    else multiplier = 1.5;
  } else {
    if (monster.is_boss) multiplier = 2;
    else if (monster.is_elite) multiplier = 1;
    else multiplier = 0.5;
  }

  const min = monster.level_min * multiplier;
  const max = monster.level_max * multiplier;
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
 * Source: server-scripts/Npc.cs:1590-1600 (solo) / 1557-1567 (party share).
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
