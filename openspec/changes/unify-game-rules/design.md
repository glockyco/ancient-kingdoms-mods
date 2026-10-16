## Context

`plan-shared-game-model` decides that game rules run in one TypeScript module during prerender and in the browser, and that the database stores only their inputs and parameters. This change sets that up with the rules whose copies already disagree.

### Altar reward tiers

The game picks the reward from the activating player's level plus total veteran points: the common reward below 40, magic from 40, epic from 50 and legendary from 150 (`server-scripts/DefaultEvent.cs:231-237`). Six places state this:

| Place | States | Matches the game |
| --- | --- | --- |
| `build-pipeline/src/compendium/denormalizers/items/sources.py:274-312` | `min_effective_level` 0, 35, 45, 55 | No |
| `build-pipeline/src/compendium/denormalizers/monsters/drops.py:163-296` | Notes "Level 30-34", "Level 35-44", "Level 45-50, Veteran 0-99", "Level 50, Veteran 100+" | No |
| `website/src/routes/items/[id]/+page.svelte:1923-1932` | "Required Level: 30-34" and so on | No |
| `website/src/lib/utils/format.ts:228-244` | "Lv < 40", "Lv 40–49", "Lv 50, Vet 0–99", "Lv 50, Vet 100+" | Yes |
| `website/src/routes/altars/[id]/+page.svelte:305` and `website/src/lib/components/map/EntityPopup.svelte:663,1244` | Through `format.ts` | Yes |
| `build-pipeline/src/compendium/denormalizers/items/source_entries.py:70`, `crafting_source_level.py:168` | Use `min_effective_level` as a source level for sorting | No |

### Chest rewards

`ChestItem.cs` rolls a chest's rewards in their configured order, awards each name at most once, and stops at the chest's item count or after 10 passes. On the Buried Treasure Chest, relic rolls gain the Treasure Hunter bonus. Two simulations of this loop exist:

- `build-pipeline/src/compendium/denormalizers/items/special_types.py:23-77`. It runs 100,000 trials per chest at no skill, and stores the result in `items.chest_rewards` and in the chest source rows.
- `website/src/lib/utils/treasureHunter.ts:58-115`. It runs 50,000 trials for the reader's skill, and compares the result with the stored baseline.

The Python copy skips an already awarded reward by id. The game rolls first and then skips an already awarded name, as the TypeScript copy does. Both give the same distribution. 15 chests carry rewards, with at most 28 each.

### Primal essence and item level

- The game accepts an item for primal essence when it is an `EquipmentItem` of quality 2 (Magic) or higher, sellable, with a sell price above 0, and not a pickaxe. The amount is `ceil(sellPrice × 0.06)` in single precision (`server-scripts/Utils.cs:527-539`). The trade window passes the item's raw `sellPrice` (`server-scripts/UINpcTrading.cs:580`). For an item bought with a token, that is a price in tokens, while vendors pay `SellPriceInGold()`, the token price times the token's own sell price (`server-scripts/ScriptableItem.cs:398-405`).
- The pipeline requires `item_type = 'equipment'` and quality 1 or higher, and uses the exported gold price (`build-pipeline/src/compendium/denormalizers/items/calculations.py:187-217`). Calling the game's own functions for all 1,813 items in the running game found 305 published items where the database differs from the game:
  - 127 Uncommon items have a value that the game refuses.
  - 113 weapons, 24 augments and one ammo item, Endless Quiver, have no value although the game accepts them. All three item types are `EquipmentItem` subclasses.
  - 40 armor set pieces bought with tokens show 60 to 150, while the game gives 1, because it computes the amount from their token price.
- `calculations.py:30-98` reimplements `EquipmentItem.CalculateItemLvl` and `AugmentItem.CalculateItemLvlAugment` (`server-scripts/EquipmentItem.cs:808`). The game's functions agree with it on every item except the Drum of War, where the game adds a delay term for an instrument and gives 60 instead of 56.

### Experience page

`website/src/routes/mechanics/experience/+page.svelte:22-24,88-170,209` hardcodes the level cap, every class's attribute gains and the veteran point cap. `progression_rules` and `class_level_progression` hold the same values from `mods/DataExporter/Exporters/ProgressionRows.cs`, and no website code reads those tables.

## Goals / Non-Goals

**Goals:**

- `website/src/lib/calculation/` is the one module for rules that depend on a character.
- Facts about an item that the game computes with a function of its own are exported by calling that function.
- The four rules above each have one implementation, and their copies are deleted.

**Non-Goals:**

- Moving every rule into the module. Rules move when a change touches them, as `utils/merc-stats.ts`, `utils/monster-stats.ts` and `utils/fishing-source-ranges.ts` will.
- The experience table. It stays a cited list, because the progression export does not carry it.
- The requirement vocabulary and "Where to Get". They belong to the acquisition change, which reads the altar thresholds this change stores.

## Decisions

### 1. One rules module, run at prerender and in the browser

Rules that depend on a character live in `website/src/lib/calculation/`. This change moves the chest loop there from `utils/treasureHunter.ts`, together with the altar rules from `utils/altar.ts` and `utils/format.ts`.

A prerendered page calls a rule with a baseline it states, such as "at Treasure Hunter 0". Where the page offers inputs, the browser calls the same function with the reader's values. The database never stores a rule's result for a particular character.

This is the pattern `website/src/lib/utils/fishing-source-ranges.ts` already follows, and it is the one source model on the site without contradictions.

### 2. The game computes item facts, the export carries them

Where the game computes a fact about an item with its own function, the exporter calls that function for every item and exports the result:

- primal essence: `Utils.isTradeableForPrimalEssence` and `Utils.getPrimalEssenceAmount`
- item level: `EquipmentItem.CalculateItemLvl` and `AugmentItem.CalculateItemLvlAugment`

The pipeline's reimplementations are deleted. Neither the pipeline nor the website can then drift from the game, and a game update that changes either rule changes the export.

This refines `plan-shared-game-model`, which kept item level as a pipeline derivation. That plan records the refinement.

Alternative considered: correcting the Python. The reimplementation would stay, and so would its two suspected differences.

### 3. Altar thresholds are exported data, tier choice is a rule

The thresholds are code constants, so the altar exporter holds their single cited copy and exports them with each altar's rewards. `ProgressionRows.cs` already plays this role for progression.

For each reward row, the pipeline stores the threshold of level plus veteran points, its level part and its veteran point part:

- The level part is the threshold capped at the level cap.
- The veteran point part is the remainder, because veteran points are earned only at the level cap (`server-scripts/Experience.cs:49-51`).

So 150 becomes level 50 with 100 veteran points. The sorting consumers in `source_entries.py` and `crafting_source_level.py` read the level part. The drop entries in `monsters.drops` carry the tier instead of a note string.

The website has one tier function and one formatter in `lib/calculation/altar.ts`. The item page, altar page, monster page and map popups use them, and the hardcoded ranges in `format.ts`, the item page and `drops.py` are deleted.

### 4. One chest loop

`lib/calculation/chest-rewards.ts` is the only implementation of the reward loop, with the game's order: roll, then skip a name already awarded. The pipeline stores each reward's roll order and base chance, and whether its roll gains the Treasure Hunter bonus. It deletes `_estimate_chest_drop_chances` and the stored estimates.

Item pages, chest pages and map popups state the chance at Treasure Hunter 0. The Treasure Hunter page recomputes it for the reader's skill. Results are memoized per chest and skill, so prerendering simulates each chest once. The estimate is a Monte Carlo simulation with a fixed seed and 100,000 trials, which keeps it deterministic between builds.

### 5. The experience page reads the progression tables

The page's server load reads the level cap, the veteran point cap and the class attribute gains from `progression_rules` and `class_level_progression`, and the constants are deleted. The page shows the same content.

## Pages that change

The owner approved these changes. The primal essence and item level changes are confirmed in the game. The altar and chest changes still wait for their game checks.

| Page | Change |
| --- | --- |
| Item pages of altar rewards | The required level and veteran points of each tier follow the game: below 40, 40 to 49, 50 with 0 to 99 veteran points, 50 with 100 or more |
| Monster pages of altar bosses | The same tier requirements, in place of the current notes |
| Item pages and the item list | Primal essence values disappear from 127 Uncommon items, appear on 113 weapons, 24 augments and Endless Quiver, and drop to 1 on 40 armor set pieces bought with tokens, as the game computes them |
| Item level, wherever it shows | The Drum of War changes from 56 to 60 |
| Chest, item and Treasure Hunter pages | Chest chances can move by up to about 0.1 percentage points, because a different random sequence produces the estimate |

## Risks / Trade-offs

- [The game functions need loaded items] The item cache is empty at the title screen, so the exporter calls them in the world, where `compendium.export` already runs.
- [The altar thresholds change in a game update] The citation check fails when the cited lines change.
- [The sitemap marks the changed pages as updated] Their content does change. Chest pages whose rounded chances stay the same can still change hash once, because the stored rows change. `prune-unread-database-data` handles the hash bridge for storage-only changes.
- [Rules and their consumers move at the same time] Each task moves one rule with all of its consumers, and is checked in a browser before the next one starts.

## Migration Plan

1. Confirm each rule in the game.
2. Export primal essence and item level, and delete the Python.
3. Export the altar thresholds, and migrate their consumers.
4. Move the chest loop, and migrate its consumers.
5. Switch the experience page.
6. Compare the prerendered pages with the previous build.

Each step is a revert on its own.

## Open Questions

- None.
