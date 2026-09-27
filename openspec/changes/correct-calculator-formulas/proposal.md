## Why

Two interactive calculators show numbers the game does not produce. The Forgotten Altar preview rounds down a "Veteran Level" divided by 40, but the game divides the player's total veteran points by 40 and rounds to the nearest level (`DefaultEvent.cs:209-217`). The Herbalism calculator uses factors 1 and 0.95 for plant tiers IV and V, but the game uses 1.05 and 1 (`Utils.cs:GetSuccessProbHerbalism`). The prose audit found both defects.

## What Changes

- The altar preview asks for total veteran points and adds `round(points / 40)` levels with the game's rounding, where a half rounds to the nearest even number.
- The Herbalism calculator takes its success chance from the shared profession tier table, which gains the game's herbalism tiers.
- The page text describes the rule the game applies instead of the preview's approximation.

## Capabilities

### New Capabilities

- `game-calculators`: interactive calculators compute with the formula the game code applies.

### Modified Capabilities

None.

## Impact

- `website/src/routes/altars/[id]/+page.svelte` and a new helper in `website/src/lib/utils/`.
- `website/src/lib/data/professions/mechanics.ts` and `website/src/routes/professions/herbalism/+page.svelte`.
- Unit tests for the altar rounding and the herbalism tiers.
