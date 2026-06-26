// Cooking profession mechanics, derived from the game's crafting code.
//
// The Cooking skill ("cookingLevel") is stored 0..1 in-game and shown 0..100 in
// the UI. Every helper here takes the skill as a 0..100 percentage to match the
// website's slider and the fishing utilities.

function cookingFraction(cookingPercent: number): number {
  return Math.min(1, Math.max(0, cookingPercent / 100));
}

// Source: server-scripts/UICraftingStation.cs:438 — a cooking oven refuses to
// craft when GetSuccessChanceProbCooking(...) < 0.1, so a recipe only becomes
// craftable once its raw success chance reaches 10%.
export const COOKING_SUCCESS_FLOOR = 0.1;

// Source: server-scripts/Utils.cs:507-516 — GetSuccessChanceProbCooking(levelFood,
// cookingLevel). `levelFood` is the result item's quality. Returns the raw
// success probability (0..1), ignoring the crafting-UI gate.
export function rawCookingSuccessChance(
  quality: number,
  cookingPercent: number,
): number {
  const skill = cookingFraction(cookingPercent);
  switch (quality) {
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

// Whether the cooking oven will let you attempt this recipe at all.
export function isCookable(quality: number, cookingPercent: number): boolean {
  return (
    rawCookingSuccessChance(quality, cookingPercent) >= COOKING_SUCCESS_FLOOR
  );
}

// Displayed success chance (0..100) for a cooking recipe.
//
// Below the craftable threshold it is 0% — you cannot make it yet. Once
// craftable, FoodItem results roll the chance, but non-food results (e.g.
// Dragonbait Stew, item_type "general") always succeed: Player.cs:11727 only
// rolls GetSuccessChanceProbCooking for `item.data is FoodItem`; everything else
// goes through the guaranteed-craft branch (Player.cs:11761-11774).
export function cookingSuccessPercent(
  quality: number,
  cookingPercent: number,
  isFoodItem: boolean,
): number {
  if (!isCookable(quality, cookingPercent)) return 0;
  return isFoodItem
    ? rawCookingSuccessChance(quality, cookingPercent) * 100
    : 100;
}

// Source: server-scripts/Player.cs:11737 — a high enough Cooking skill turns
// low-tier recipes into "simple tasks" that grant no skill gain (strict >).
export function isCookingEffortless(
  quality: number,
  cookingPercent: number,
): boolean {
  const skill = cookingFraction(cookingPercent);
  switch (quality) {
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

// Source: server-scripts/Player.cs:11741 — skill gain fires when
// Random.value > 0.1 + cookingLevel/2, i.e. with probability 0.9 - cookingLevel/2.
export function cookingSkillGainChancePercent(cookingPercent: number): number {
  const skill = cookingFraction(cookingPercent);
  return Math.max(0, (0.9 - skill / 2) * 100);
}

// Source: server-scripts/Player.cs:11743 — num3 = Random.Range(1, 4) /
// (successChance * 3000). Skill gain only happens for FoodItem results
// (Player.cs:11727), only when the recipe is craftable, and only while it still
// grants skill (not "effortless"). Returns percentage-point bounds, or null when
// no skill gain applies.
export function cookingSkillGainRange(
  quality: number,
  cookingPercent: number,
  isFoodItem: boolean,
): { min: number; max: number } | null {
  if (!isFoodItem) return null;
  if (!isCookable(quality, cookingPercent)) return null;
  if (isCookingEffortless(quality, cookingPercent)) return null;
  const raw = rawCookingSuccessChance(quality, cookingPercent);
  if (raw <= 0) return null;
  return {
    min: (1 / (raw * 3000)) * 100,
    max: (3 / (raw * 3000)) * 100,
  };
}
