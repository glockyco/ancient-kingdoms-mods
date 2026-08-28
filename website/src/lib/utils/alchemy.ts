import {
  PROFESSION_MECHANICS,
  isEffortlessAtTier,
  rawTierSuccessChance,
  skillGainChance,
} from "$lib/data/professions/mechanics";

const mechanics = PROFESSION_MECHANICS.alchemy;

// Alchemy profession mechanics, derived from the game's crafting code.
//
// The Alchemy skill ("alchemyLevel") is stored 0..1 in-game and shown 0..100 in
// the UI. Every helper takes the skill as a 0..100 percentage to match the
// website's slider. Success is keyed on the recipe's level (level_required), not
// the result item's quality.
//
// The success formula is the same switch the game uses for cooking
// (GetSuccessProbAlchemy == GetSuccessProbCooking), but it is kept separate
// here to mirror the two distinct game methods and to isolate alchemy-only
// differences: the skill-gain divisor is 1000 (cooking uses 3000) and the
// success roll applies to every output (cooking exempts non-FoodItem results).

// Source: server-scripts/Player.cs:12850-12853 and TableUI.cs:92 — an alchemy/scribing
// table refuses to craft when GetSuccessProbAlchemy(...) < 0.1, so a recipe only
// becomes craftable once its raw success chance reaches 10%.
export const ALCHEMY_SUCCESS_FLOOR = mechanics.success.floor;

// Source: server-scripts/Utils.cs:539-549 — GetSuccessProbAlchemy(levelPotion,
// alchemyLevel). Returns the raw success probability (0..1), ignoring the gate.
export function rawAlchemySuccessChance(
  level: number,
  skillPercent: number,
): number {
  return rawTierSuccessChance(mechanics.success, level, skillPercent);
}

// Whether the table will let you attempt this recipe at all.
export function isAlchemyCraftable(
  level: number,
  skillPercent: number,
): boolean {
  return rawAlchemySuccessChance(level, skillPercent) >= ALCHEMY_SUCCESS_FLOOR;
}

// Displayed success chance (0..100). Below the craftable threshold it is 0% — you
// cannot make it yet. The success roll applies to every alchemy output
// (Player.cs:11438 is not gated on item type), so unlike cooking there is no
// always-succeeds case for non-potion results.
export function alchemySuccessPercent(
  level: number,
  skillPercent: number,
): number {
  if (!isAlchemyCraftable(level, skillPercent)) return 0;
  return rawAlchemySuccessChance(level, skillPercent) * 100;
}

// Source: server-scripts/Player.cs:12876-12880 — a high enough Alchemy skill turns
// low-level recipes into "too simple" tasks that grant no skill gain (strict >).
export function isAlchemyEffortless(
  level: number,
  skillPercent: number,
): boolean {
  return isEffortlessAtTier(mechanics.effortless, level, skillPercent);
}

// Source: server-scripts/Player.cs:12880 — skill gain fires when
// Random.value > 0.1 + alchemyLevel/2, i.e. with probability 0.9 - alchemyLevel/2.
export function alchemySkillGainChancePercent(skillPercent: number): number {
  return skillGainChance(mechanics.skillGain, skillPercent) * 100;
}

// Source: server-scripts/Player.cs:12882 — num4 = Random.Range(1, 4) /
// (successChanceProb * 1000). Note the 1000 divisor (cooking uses 3000). Skill
// gain only happens when the recipe is craftable and still grants skill (not
// "effortless"). Returns percentage-point bounds, or null when none applies.
export function alchemySkillGainRange(
  level: number,
  skillPercent: number,
): { min: number; max: number } | null {
  if (!isAlchemyCraftable(level, skillPercent)) return null;
  if (isAlchemyEffortless(level, skillPercent)) return null;
  const raw = rawAlchemySuccessChance(level, skillPercent);
  if (raw <= 0) return null;
  return {
    min:
      (mechanics.skillGain.range[0] / (raw * mechanics.skillGain.divisor)) *
      100,
    max:
      (mechanics.skillGain.range[1] / (raw * mechanics.skillGain.divisor)) *
      100,
  };
}
