# Tasks

## 1. Placeholder

- [x] 1.1 Add `RedactedEntry` and replace every "Unpublished" label on the site and in the pipeline's quest tooltips with "Redacted <kind>".

## 2. Quests

- [x] 2.1 List withheld item, monster and brew objectives and withheld item rewards on the quest page, in its search description and in its map popup. Verify Awakening Dawn of the Entombed in a browser at desktop and phone width.

## 3. Loot

- [x] 3.1 Stop a withheld quest gate from making a pool's chances unknown, emit a chance for each withheld drop, and list it as a placeholder row on the monster page. Verify Lord Vaelric and Lost Adventurer, and the chance of Hood of the Lich on its item page.
- [x] 3.2 Correct the reason in the drop-chance parity generator for skipping pools with a withheld entry.

## 4. Recipes

- [x] 4.1 Record the items of each hidden recipe in `redacted_recipe_items` before the recipe is removed, and run `compendium redactions check`.
- [x] 4.2 Show Crafted from Recipe with the placeholder on the product's page and a placeholder row in Used in Recipes on its mold and materials. Verify Draconium Wyrmguard, its mold, Draconium Ore and Primal Essence.

## 5. Portals and configuration

- [x] 5.1 Pass a withheld portal key to the map and show the placeholder as the key in the portal popup and tooltip.
- [x] 5.2 Rewrite the `redactions.toml` comments that describe `ignore_journal` and the door to the Northern Halls to state what the build publishes.

## 6. Quests named for exclusion

- [x] 6.1 Count the published NPCs, items and factions of each removed quest in `redacted_quest_npcs`, `redacted_quest_items` and `redacted_quest_factions` before the closure deletes the quest, and rewrite the `redactions.toml` comment on the two quests.
- [x] 6.2 Show one placeholder row in an NPC's quest lists, an item's Required for Quests and a faction's Quests, counted in the heading and the meta description. Verify Vaerion Shadeborn, Draconium Wyrmguard and Ancient Gods.

## 7. Release checks

- [x] 7.1 Rebuild the database, run the website and pipeline tests, `compendium redactions verify` and `pnpm check`, and look at the changed pages in a browser.
