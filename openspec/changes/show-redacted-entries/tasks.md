# Tasks

## 1. Placeholder

- [ ] 1.1 Add `RedactedEntry` and replace every "Unpublished" label on the site and in the pipeline's quest tooltips with "Redacted <kind>".

## 2. Quests

- [ ] 2.1 List withheld item, monster and brew objectives and withheld item rewards on the quest page, in its search description and in its map popup. Verify Awakening Dawn of the Entombed in a browser at desktop and phone width.

## 3. Loot

- [ ] 3.1 Stop a withheld quest gate from making a pool's chances unknown, emit a chance for each withheld drop, and list it as a placeholder row on the monster page. Verify Lord Vaelric and Lost Adventurer, and the chance of Hood of the Lich on its item page.
- [ ] 3.2 Correct the reason in the drop-chance parity generator for skipping pools with a withheld entry.

## 4. Recipes

- [ ] 4.1 Record the items of each hidden recipe in `redacted_recipe_items` before the recipe is removed, and run `compendium redactions check`.
- [ ] 4.2 Show Crafted from Recipe with the placeholder on the product's page and a placeholder row in Used in Recipes on its mold and materials. Verify Draconium Wyrmguard, its mold, Draconium Ore and Primal Essence.

## 5. Portals and configuration

- [ ] 5.1 Pass a withheld portal key to the map and show the placeholder as the key in the portal popup and tooltip.
- [ ] 5.2 Rewrite the `redactions.toml` comments that describe `ignore_journal` and the door to the Northern Halls to state what the build publishes.

## 6. Release checks

- [ ] 6.1 Rebuild the database, run the website and pipeline tests, `compendium redactions verify` and `pnpm check`, and look at the changed pages in a browser.
