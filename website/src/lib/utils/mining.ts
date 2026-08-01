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

function miningFraction(skillPercent: number): number {
  return Math.min(1, Math.max(0, skillPercent / 100));
}

// Source: server-scripts/GatherItem.cs:OnInteractServer — a mineral node refuses
// the attempt when the success probability is below 0.2.
export const MINING_SUCCESS_FLOOR = 0.2;

// Source: server-scripts/Utils.cs:GetSuccessProbMining — per-tier coefficients as
// [constant, pickaxeFactor, skillFactor]. Tier is the node's level, 0..4.
const MINING_COEFFICIENTS: readonly (readonly [number, number, number])[] = [
  [0.8, 1, 1],
  [0.3, 0.2, 1],
  [0, 0.15, 0.6],
  [0, 0.1, 0.5],
  [0, 0.05, 0.4],
];

// Raw success probability (0..1), ignoring the attempt floor.
export function rawMiningSuccessChance(
  tier: number,
  pickaxeQuality: number,
  skillPercent: number,
): number {
  const index = Math.min(Math.max(tier, 0), MINING_COEFFICIENTS.length - 1);
  const [constant, pickaxeFactor, skillFactor] = MINING_COEFFICIENTS[index];
  const raw =
    constant +
    pickaxeFactor * pickaxeQuality +
    skillFactor * miningFraction(skillPercent);
  return Math.min(1, Math.max(0, raw));
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
  const skill = miningFraction(skillPercent);
  return (
    (skill > 0.25 && tier === 0) ||
    (skill > 0.5 && tier <= 1) ||
    (skill > 0.75 && tier <= 2)
  );
}

// Source: server-scripts/GatherItem.cs:OnInteractServer — skill gain fires when
// Random.value > 0.1 + miningLevel/2, i.e. with probability 0.9 - miningLevel/2.
export function miningSkillGainChancePercent(skillPercent: number): number {
  return (0.9 - miningFraction(skillPercent) / 2) * 100;
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
    min: (1 / (success * 1000)) * 100,
    max: (3 / (success * 1000)) * 100,
  };
}

// Source: server-scripts/Database.cs:CharacterCreate — the character-creation branch that
// grants Children of Illithor standing, the Dwarf faction, also sets miningLevel
// to 0.05. Every other race starts at 0.
export const DWARF_STARTING_MINING_PERCENT = 5;
