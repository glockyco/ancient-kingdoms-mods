import {
  PROFESSION_MECHANICS,
  isEffortlessAtTier,
  rawTierSuccessChance,
  skillGainChance,
} from "$lib/data/professions/mechanics";

const mechanics = PROFESSION_MECHANICS.mining;

// Mining profession mechanics, derived from the game's gathering code.
//
// The Mining skill ("miningLevel") is stored 0..1 in-game and shown 0..100 in
// the UI. Every helper takes the skill as a 0..100 percentage to match the
// website's slider, and pickaxe quality as the raw 0..4 item quality.
//
// Mining and Fishing share one success shape: a per-tier constant, plus the
// tool quality and the skill each scaled by a per-tier factor. They are kept as
// separate game methods and separate modules here because their floors, their
// gain divisors and their tool categories differ.

// Source: server-scripts/GatherItem.cs:OnInteractServer — a mineral node refuses
// the attempt when the success probability is below 0.2.
export const MINING_SUCCESS_FLOOR = mechanics.success.floor;

// Raw success probability (0..1), ignoring the attempt floor.
export function rawMiningSuccessChance(
  tier: number,
  pickaxeQuality: number,
  skillPercent: number,
): number {
  return rawTierSuccessChance(
    mechanics.success,
    tier,
    skillPercent,
    pickaxeQuality,
  );
}

// Whether the node will let you attempt it at all.
export function isMineable(
  tier: number,
  pickaxeQuality: number,
  skillPercent: number,
): boolean {
  return (
    rawMiningSuccessChance(tier, pickaxeQuality, skillPercent) >=
    MINING_SUCCESS_FLOOR
  );
}

// Displayed success chance (0..100). Below the floor it is 0 — the node refuses
// the attempt rather than rolling and failing.
export function miningSuccessPercent(
  tier: number,
  pickaxeQuality: number,
  skillPercent: number,
): number {
  if (!isMineable(tier, pickaxeQuality, skillPercent)) return 0;
  return rawMiningSuccessChance(tier, pickaxeQuality, skillPercent) * 100;
}

// Source: server-scripts/GatherItem.cs:OnInteractServer — a high enough Mining
// skill turns low-tier nodes into tasks that grant no skill gain. The comparison
// is strict, so exactly 25% still pays on tier 0.
export function isMiningEffortless(
  tier: number,
  skillPercent: number,
): boolean {
  return isEffortlessAtTier(mechanics.effortless, tier, skillPercent);
}

// Source: server-scripts/GatherItem.cs:OnInteractServer — skill gain fires when
// Random.value > 0.1 + miningLevel/2, i.e. with probability 0.9 - miningLevel/2.
export function miningSkillGainChancePercent(skillPercent: number): number {
  return skillGainChance(mechanics.skillGain, skillPercent) * 100;
}

// Source: server-scripts/GatherItem.cs:OnInteractServer — the gain is
// Random.Range(1, 4) / (successProbability * 1000), so it is larger on nodes you
// are more likely to fail. Returns percentage-point bounds, or null when the node
// grants no skill at this level.
export function miningSkillGainRange(
  tier: number,
  pickaxeQuality: number,
  skillPercent: number,
): { min: number; max: number } | null {
  if (!isMineable(tier, pickaxeQuality, skillPercent)) return null;
  if (isMiningEffortless(tier, skillPercent)) return null;
  const success = rawMiningSuccessChance(tier, pickaxeQuality, skillPercent);
  return {
    min:
      (mechanics.skillGain.range[0] / (success * mechanics.skillGain.divisor)) *
      100,
    max:
      (mechanics.skillGain.range[1] / (success * mechanics.skillGain.divisor)) *
      100,
  };
}

// Source: server-scripts/Database.cs:CharacterCreate — the character-creation branch that
// grants Children of Illithor standing, the Dwarf faction, also sets miningLevel
// to 0.05. Every other race starts at 0.
export const DWARF_STARTING_MINING_PERCENT = mechanics.startingBonus.percent;
