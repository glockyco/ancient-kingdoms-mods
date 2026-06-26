// Alchemy profession mechanics, derived from the game's crafting code.
//
// The Alchemy skill ("alchemyLevel") is stored 0..1 in-game and shown 0..100 in
// the UI. Every helper takes the skill as a 0..100 percentage to match the
// website's slider. Success is keyed on the recipe's level (level_required), not
// the result item's quality.
//
// The success formula is the same switch the game uses for cooking
// (GetSuccessChanceProb == GetSuccessChanceProbCooking), but it is kept separate
// here to mirror the two distinct game methods and to isolate alchemy-only
// differences: the skill-gain divisor is 1000 (cooking uses 3000) and the
// success roll applies to every output (cooking exempts non-FoodItem results).

function alchemyFraction(skillPercent: number): number {
  return Math.min(1, Math.max(0, skillPercent / 100));
}

// Source: server-scripts/Player.cs:11432 and TableUI.cs:92 — an alchemy/scribing
// table refuses to craft when GetSuccessChanceProb(...) < 0.1, so a recipe only
// becomes craftable once its raw success chance reaches 10%.
export const ALCHEMY_SUCCESS_FLOOR = 0.1;

// Source: server-scripts/Utils.cs:483-493 — GetSuccessChanceProb(levelPotion,
// alchemyLevel). Returns the raw success probability (0..1), ignoring the gate.
export function rawAlchemySuccessChance(
  level: number,
  skillPercent: number,
): number {
  const skill = alchemyFraction(skillPercent);
  switch (level) {
    case 0:
      return 1;
    case 1:
      return Math.min(1, 0.4 + skill * 2);
    case 2:
      return Math.min(1, 0.2 + skill);
    case 3:
      return Math.min(1, skill * 0.95);
    default:
      return Math.min(1, skill * 0.9);
  }
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

// Source: server-scripts/Player.cs:11457 — a high enough Alchemy skill turns
// low-level recipes into "too simple" tasks that grant no skill gain (strict >).
export function isAlchemyEffortless(
  level: number,
  skillPercent: number,
): boolean {
  const skill = alchemyFraction(skillPercent);
  switch (level) {
    case 0:
      return skill > 0.25;
    case 1:
      return skill > 0.5;
    case 2:
      return skill > 0.75;
    default:
      return false;
  }
}

// Source: server-scripts/Player.cs:11461 — skill gain fires when
// Random.value > 0.1 + alchemyLevel/2, i.e. with probability 0.9 - alchemyLevel/2.
export function alchemySkillGainChancePercent(skillPercent: number): number {
  const skill = alchemyFraction(skillPercent);
  return Math.max(0, (0.9 - skill / 2) * 100);
}

// Source: server-scripts/Player.cs:11463 — num4 = Random.Range(1, 4) /
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
    min: (1 / (raw * 1000)) * 100,
    max: (3 / (raw * 1000)) * 100,
  };
}
