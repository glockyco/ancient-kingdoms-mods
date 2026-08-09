import {
  PROFESSION_MECHANICS,
  isEffortlessAtTier,
  rawTierSuccessChance,
  skillGainChance,
} from "$lib/data/professions/mechanics";

const mechanics = PROFESSION_MECHANICS.cooking;

// Cooking profession mechanics, derived from the game's crafting code.
//
// The Cooking skill ("cookingLevel") is stored 0..1 in-game and shown 0..100 in
// the UI. Every helper here takes the skill as a 0..100 percentage to match the
// website's slider and the fishing utilities.

// Source: server-scripts/UICraftingStation.cs:438 — a cooking oven refuses to
// craft when GetSuccessProbCooking(...) < 0.1, so a recipe only becomes
// craftable once its raw success chance reaches 10%.
export const COOKING_SUCCESS_FLOOR = mechanics.success.floor;

// Source: server-scripts/Utils.cs:558-567 — GetSuccessProbCooking(levelFood,
// cookingLevel). `levelFood` is the result item's quality. Returns the raw
// success probability (0..1), ignoring the crafting-UI gate.
export function rawCookingSuccessChance(
  quality: number,
  cookingPercent: number,
): number {
  return rawTierSuccessChance(mechanics.success, quality, cookingPercent);
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
// rolls GetSuccessProbCooking for `item.data is FoodItem`; everything else
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

// Source: server-scripts/Player.cs:12697 — a high enough Cooking skill turns
// low-tier recipes into "simple tasks" that grant no skill gain (strict >).
export function isCookingEffortless(
  quality: number,
  cookingPercent: number,
): boolean {
  return isEffortlessAtTier(mechanics.effortless, quality, cookingPercent);
}

// Source: server-scripts/Player.cs:UserCode_CmdCraftItem__NetworkIdentity__Int32 — skill gain fires when
// Random.value > 0.1 + cookingLevel/2, i.e. with probability 0.9 - cookingLevel/2.
export function cookingSkillGainChancePercent(cookingPercent: number): number {
  return skillGainChance(mechanics.skillGain, cookingPercent) * 100;
}

// Source: server-scripts/Player.cs:UserCode_CmdCraftItem__NetworkIdentity__Int32 — num3 = Random.Range(1, 4) /
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
    min:
      (mechanics.skillGain.range[0] / (raw * mechanics.skillGain.divisor)) *
      100,
    max:
      (mechanics.skillGain.range[1] / (raw * mechanics.skillGain.divisor)) *
      100,
  };
}
