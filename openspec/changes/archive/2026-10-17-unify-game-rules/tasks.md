## 1. Confirm the rules in the game

- [x] 1.1 With HotRepl, call `Utils.isTradeableForPrimalEssence` and `Utils.getPrimalEssenceAmount` for every item in the game's item cache. Verify the eligible count per item type against the 127 Uncommon items, 113 weapons and 24 augments in `design.md`, and record any difference there. Confirmed, plus Endless Quiver and 40 token-bought set pieces, recorded in `design.md`.
- [x] 1.2 With HotRepl, call `CalculateItemLvl` and `CalculateItemLvlAugment` for every equipment item and augment, and compare the result with the pipeline's item level. Verify the list of differing items is recorded in `design.md`, or that there is none. Only the Drum of War differs, recorded in `design.md`.
- [x] 1.3 On the scratch database, run each altar's final wave with the activating player at level plus veteran points of 39, 40, 49, 50, 149 and 150. Verify that the boss carries the common, magic, epic and legendary reward at the thresholds in `design.md`. Done with HotRepl through the game's own `DefaultEvent.SummonMonsters`: all five altars with reward tiers switch at 40, 50 and 150.
- [x] 1.4 On the scratch database, open the Buried Treasure Chest many times at Treasure Hunter 0 and at a higher skill with the game's own `ChestItem.Use`. Verify that the reward frequencies match the reward loop within sampling error. 4,000 opens each at 0% and 100% Treasure Hunter matched a model of the loop on all 28 rewards, the largest deviation 2.7 standard errors.
- [x] 1.5 Get approval of "Pages that change" in `design.md`. Pages change only after this task and the game check of their rule are done.

## 2. Export what the game computes

- [x] 2.1 Make the item exporter call the primal essence and item level functions and export their results. Verify in a real `build-tool export` that the values match task 1.1 and 1.2. The export gives values to exactly the 646 equipment items, 117 weapons, 24 augments and 1 ammo item the game accepts, 1 to the token-bought set pieces, and 60 to the Drum of War.
- [x] 2.2 Load the exported values, and delete `_calculate_primal_essence` and the item level reimplementation from `build-pipeline/src/compendium/denormalizers/items/calculations.py` together with their tests. Verify that `compendium build` produces the exported values and that item pages show them.

## 3. Altar tiers

- [x] 3.1 Export the altar tier thresholds from the altar exporter as a cited constant. Store each reward row's threshold, level part and veteran point part. Make `source_entries.py` and `crafting_source_level.py` read the level part. Verify the source level of each altar reward row against the thresholds.
- [x] 3.2 Replace the note strings in `build-pipeline/src/compendium/denormalizers/monsters/drops.py` with the reward tier. Verify that an altar boss's drops carry tiers and no notes.
- [x] 3.3 Add the tier function and its formatter to `website/src/lib/calculation/altar.ts`, and move the altar rules from `website/src/lib/utils/altar.ts` there. Make the item page, altar page, monster page and map popups use them, and delete the hardcoded ranges in `website/src/lib/utils/format.ts` and `website/src/routes/items/[id]/+page.svelte`. Verify an altar reward item page, an altar page, an altar boss page and a map popup in Chromium at 1440×900 and 390×844. All passed at both sizes. The map needs a dedicated Chrome for Testing, because the shared test browser renders no frames.

## 4. Chest rewards

- [x] 4.1 Implement the exact chest computation in `website/src/lib/calculation/chest-rewards.ts` as `design.md` describes, and delete `website/src/lib/utils/treasureHunter.ts`. Verify with focused tests that a chest whose rewards all roll 100% awards its item count and stops, that a name is awarded at most once, that the 10-pass limit holds, and that the exact values agree with a seeded simulation of the loop.
- [x] 4.2 Store chest rewards in `chest_item_rewards` with roll order, roll chance and the exported Treasure Hunter flag, register the table for redaction, and delete `_estimate_chest_drop_chances`, the stored estimates and the chest rows in `item_sources_random`. Make item pages, chest item pages and the Treasure Hunter page compute chances with the exact computation. Verify that every chance agrees with the previous build within four standard errors of its 100,000-trial estimate, and with the in-game counts of task 1.4. All 306 previous estimates lie within 2.3 standard errors, the in-game counts within 2.6, and the Treasure Hunter page recomputes in the browser.

## 5. Experience page

- [x] 5.1 Read the level cap, the veteran point cap and the class attribute gains from `progression_rules` and `class_level_progression` in the experience page's server load, and delete the constants. Verify that the prerendered page is unchanged.

## 6. Prove

- [x] 6.1 Prerender the site from the same export before and after the change and compare the pages. Verify that only the approved changes differ. 400 of 3,756 pages changed. Every changed line is an approved wording, value or note, or one of six rank swaps between rewards whose exact chances are close.
- [x] 6.2 Record in the invariants of `ARCHITECTURE.md` that character rules live in `website/src/lib/calculation/` and that the database stores only their inputs. Verify the documentation checks pass.
