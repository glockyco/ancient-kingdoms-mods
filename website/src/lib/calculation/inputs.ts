import type { CalculationInput } from "$lib/types/calculation";
import { statName } from "$lib/stats";
import { STATS, type StatId } from "$lib/generated/stat-vocabulary";

/*
 * Inputs every calculation shares. A remembered input describes the reader's
 * character, so its key must mean the same value on every page: the number the
 * game's character window shows. Defaults are round numbers that keep the
 * arithmetic easy to follow, not typical values for any level.
 */

function characterStat(
  key: string,
  stat: StatId,
  value: number,
): CalculationInput {
  return {
    key,
    label: statName(stat),
    value,
    min: 0,
    max: 1_000_000,
    step: 1,
    remember: true,
  };
}

export const MAX_HEALTH = characterStat("maxHealth", "health", 2000);
export const MAX_MANA = characterStat("maxMana", "mana", 1500);
export const STRENGTH = characterStat("strength", "strength", 100);
export const DEXTERITY = characterStat("dexterity", "dexterity", 100);
export const INTELLIGENCE = characterStat("intelligence", "intelligence", 100);
export const WISDOM = characterStat("wisdom", "wisdom", 100);
export const CHARISMA = characterStat("charisma", "charisma", 100);
/** The Damage the character window shows (`Combat.damage`). */
export const DAMAGE = characterStat("damage", "attack_power", 200);
/** The Magic Damage the character window shows (`Combat.magicDamage`). */
export const MAGIC_DAMAGE = characterStat("magicDamage", "spell_power", 200);

/**
 * The summed spell haste of every source. Casts use the full sum, while the
 * character window shows it capped at 50% (Player.cs:2901, Combat.spellHaste).
 */
export const SPELL_HASTE: CalculationInput = {
  key: "spellHaste",
  label: `${statName("spell_haste")}, all sources`,
  value: 0.2,
  min: -10,
  max: 10,
  step: 1,
  unit: STATS.spell_haste.format === "percent" ? "%" : undefined,
  remember: true,
};

// Source: server-scripts/Combat.cs:337-348 — haste is the summed bonus clamped between -80% and 80%.
export const HASTE: CalculationInput = {
  key: "haste",
  label: statName("haste"),
  value: 0.2,
  min: -0.8,
  max: 0.8,
  step: 1,
  unit: STATS.haste.format === "percent" ? "%" : undefined,
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

export const CONSTITUTION = characterStat("constitution", "constitution", 100);

export const DEFENSE = characterStat("defense", "armor_class", 100);
export const MAGIC_RESIST = characterStat("magicResist", "magic_resist", 100);
export const FIRE_RESIST = characterStat("fireResist", "fire_resist", 100);
export const COLD_RESIST = characterStat("coldResist", "cold_resist", 100);
export const POISON_RESIST = characterStat(
  "poisonResist",
  "poison_resist",
  100,
);
export const DISEASE_RESIST = characterStat(
  "diseaseResist",
  "disease_resist",
  100,
);

// Source: server-scripts/UICharacterInfo.cs:Update; server-scripts/PlayerSkills.cs:GetTotalVeteranPoints; server-scripts/Experience.cs:ShowVeteranLevelUp — the character window's VT total (Veteran Level) includes unspent points and learned base ranks.
export const TOTAL_VETERAN_POINTS_NOTE =
  'Total veteran points (Veteran Level) are your unspent veteran points plus your learned veteran skill ranks. The character window shows them as the VT number beside your level, as in "Level 50 (VT 20)". Use 0 if no VT number appears.';

export const TOTAL_VETERAN_POINTS: CalculationInput = {
  ...situational("veteran", "Total veteran points", 20),
  max: 200,
  remember: true,
};
