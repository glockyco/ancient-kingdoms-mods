## 1. Confirm the rules in the game

- [x] 1.1 With HotRepl, call `Utils.isTradeableForPrimalEssence` and `Utils.getPrimalEssenceAmount` for every item in the game's item cache. Verify the eligible count per item type against the 127 Uncommon items, 113 weapons and 24 augments in `design.md`, and record any difference there. Confirmed, plus Endless Quiver and 40 token-bought set pieces, recorded in `design.md`.
- [x] 1.2 With HotRepl, call `CalculateItemLvl` and `CalculateItemLvlAugment` for every equipment item and augment, and compare the result with the pipeline's item level. Verify the list of differing items is recorded in `design.md`, or that there is none. Only the Drum of War differs, recorded in `design.md`.
- [x] 1.3 On the scratch database, run each altar's final wave with the activating player at level plus veteran points of 39, 40, 49, 50, 149 and 150. Verify that the boss carries the common, magic, epic and legendary reward at the thresholds in `design.md`. Done with HotRepl through the game's own `DefaultEvent.SummonMonsters`: all five altars with reward tiers switch at 40, 50 and 150.
- [x] 1.4 On the scratch database, open the Buried Treasure Chest many times at Treasure Hunter 0 and at a higher skill with the game's own `ChestItem.Use`. Verify that the reward frequencies match the reward loop within sampling error. 4,000 opens each at 0% and 100% Treasure Hunter matched a model of the loop on all 28 rewards, the largest deviation 2.7 standard errors.
- [x] 1.5 Get approval of "Pages that change" in `design.md`. Pages change only after this task and the game check of their rule are done.

## 2. Export what the game computes

- [ ] 2.1 Make the item exporter call the primal essence and item level functions and export their results. Verify in a real `build-tool export` that the values match task 1.1 and 1.2.
- [ ] 2.2 Load the exported values, and delete `_calculate_primal_essence` and the item level reimplementation from `build-pipeline/src/compendium/denormalizers/items/calculations.py` together with their tests. Verify that `compendium build` produces the exported values and that item pages show them.

## 3. Altar tiers

- [ ] 3.1 Export the altar tier thresholds from the altar exporter as a cited constant. Store each reward row's threshold, level part and veteran point part. Make `source_entries.py` and `crafting_source_level.py` read the level part. Verify the source level of each altar reward row against the thresholds.
- [ ] 3.2 Replace the note strings in `build-pipeline/src/compendium/denormalizers/monsters/drops.py` with the reward tier. Verify that an altar boss's drops carry tiers and no notes.
- [ ] 3.3 Add the tier function and its formatter to `website/src/lib/calculation/altar.ts`, and move the altar rules from `website/src/lib/utils/altar.ts` there. Make the item page, altar page, monster page and map popups use them, and delete the hardcoded ranges in `website/src/lib/utils/format.ts` and `website/src/routes/items/[id]/+page.svelte`. Verify an altar reward item page, an altar page, an altar boss page and a map popup in Chromium at 1440×900 and 390×844.

## 4. Chest rewards

- [ ] 4.1 Move the reward loop to `website/src/lib/calculation/chest-rewards.ts` with the game's roll order, memoized per chest and skill, and delete `website/src/lib/utils/treasureHunter.ts`. Verify with a focused test that a chest whose rewards all roll 100% awards its item count and stops, and that a name is awarded at most once.
- [ ] 4.2 Make the pipeline store each reward's roll order, base chance and Treasure Hunter flag, and delete `_estimate_chest_drop_chances` and the stored estimates. Make item pages, chest pages, map popups and the Treasure Hunter page compute chances with the loop. Verify that every chest reward chance on those pages is within 0.1 percentage points of the previous build.

## 5. Experience page

- [ ] 5.1 Read the level cap, the veteran point cap and the class attribute gains from `progression_rules` and `class_level_progression` in the experience page's server load, and delete the constants. Verify that the prerendered page is unchanged.

## 6. Prove

- [ ] 6.1 Prerender the site from the same export before and after the change and compare the pages. Verify that only the approved changes differ.
- [ ] 6.2 Record in the invariants of `ARCHITECTURE.md` that character rules live in `website/src/lib/calculation/` and that the database stores only their inputs. Verify the documentation checks pass.
