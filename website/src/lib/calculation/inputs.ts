import type { CalculationInput } from "$lib/types/calculation";

/*
 * Inputs every calculation shares. A remembered input describes the reader's
 * character, so its key must mean the same value on every page: the number the
 * game's character window shows. Defaults are round numbers that keep the
 * arithmetic easy to follow, not typical values for any level.
 */

function characterStat(
  key: string,
  label: string,
  value: number,
): CalculationInput {
  return {
    key,
    label,
    value,
    min: 0,
    max: 1_000_000,
    step: 1,
    remember: true,
  };
}

export const MAX_HEALTH = characterStat("maxHealth", "Maximum Health", 2000);
export const MAX_MANA = characterStat("maxMana", "Maximum Mana", 1500);
export const STRENGTH = characterStat("strength", "Strength", 100);
export const DEXTERITY = characterStat("dexterity", "Dexterity", 100);
export const INTELLIGENCE = characterStat("intelligence", "Intelligence", 100);
export const WISDOM = characterStat("wisdom", "Wisdom", 100);
export const CHARISMA = characterStat("charisma", "Charisma", 100);
/** The Damage the character window shows (`Combat.damage`). */
export const DAMAGE = characterStat("damage", "Damage", 200);
/** The Magic Damage the character window shows (`Combat.magicDamage`). */
export const MAGIC_DAMAGE = characterStat("magicDamage", "Magic Damage", 200);

/**
 * The summed spell haste of every source. Casts use the full sum, while the
 * character window shows it capped at 50% (Player.cs:2873, Combat.spellHaste).
 */
export const SPELL_HASTE: CalculationInput = {
  key: "spellHaste",
  label: "Spell haste, all sources",
  value: 0.2,
  min: -10,
  max: 10,
  step: 1,
  unit: "%",
  remember: true,
};

// Source: server-scripts/Combat.cs:335-346 — haste is the summed bonus clamped between -80% and 80%.
export const HASTE: CalculationInput = {
  key: "haste",
  label: "Haste",
  value: 0.2,
  min: -0.8,
  max: 0.8,
  step: 1,
  unit: "%",
  remember: true,
};

/** A skill's rank, from 1 to its maximum, starting at the maximum. Not remembered: each skill has its own. */
export function rankInput(maxRank: number): CalculationInput {
  return {
    key: "rank",
    label: "Rank",
    phrase: "rank",
    options: Array.from({ length: maxRank }, (_, index) => index + 1),
    value: maxRank,
    min: 1,
    max: maxRank,
    step: 1,
  };
}

/** A per-block value, such as missing Mana or the damage a hit dealt. */
export function situational(
  key: string,
  label: string,
  value: number,
): CalculationInput {
  return { key, label, value, min: 0, max: 10_000_000, step: 1 };
}

export const CONSTITUTION = characterStat("constitution", "Constitution", 100);

export const DEFENSE = characterStat("defense", "Defense", 100);
export const MAGIC_RESIST = characterStat("magicResist", "Magic Resist", 100);
export const FIRE_RESIST = characterStat("fireResist", "Fire Resist", 100);
export const COLD_RESIST = characterStat("coldResist", "Cold Resist", 100);
export const POISON_RESIST = characterStat(
  "poisonResist",
  "Poison Resist",
  100,
);
export const DISEASE_RESIST = characterStat(
  "diseaseResist",
  "Disease Resist",
  100,
);

// Source: server-scripts/PlayerSkills.cs:1762-1772,1826-1853,2477-2480; server-scripts/Experience.cs:45-53 — the total and reset refund count learned base ranks without weighting their costs.
// Observed: docs/game-bugs/two-point-veteran-skills-lose-points-and-progression.md — two-point ranks lower VT and XP cost, and paid resets lose the second point.
export const TOTAL_VETERAN_POINTS_NOTE =
  "Total veteran points are your unspent veteran points plus the ranks of your learned veteran skills. A game defect counts a veteran skill rank that costs 2 points as 1 point. Each such rank lowers your Veteran Level by 1 and the next point's experience cost by 20,000 XP, and a token reset refunds only 1 of its 2 points.";

export const TOTAL_VETERAN_POINTS: CalculationInput = {
  ...situational("veteran", "Total veteran points", 20),
  max: 200,
  remember: true,
};
