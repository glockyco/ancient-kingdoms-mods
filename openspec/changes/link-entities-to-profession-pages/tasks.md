## 1. Link gathering resources

- [ ] 1.1 Add Herbalism, Mining, and Radiant Seeker links beside the Fishing conditional in `website/src/routes/gather-items/[id]/+page.svelte:533-552`, using loader flags at `+page.server.ts:122-133`; verify representative plant, mineral, spark, and fishing pages show every applicable destination in static HTML.
- [ ] 1.2 Check resource headers at 1440×900 and 390×844 with JavaScript disabled; verify the badges wrap without hiding the existing map link or tier data.

## 2. Link crafted outputs

- [ ] 2.1 Derive a deduplicated profession destination list from `sources.recipes` in `website/src/routes/items/[id]/+page.server.ts:105-107`, using `recipe_type` and `station_type` already projected by `website/src/lib/server/item-sources.ts:178-208`; verify alchemy, scribing, cooking, mixed-source, and ordinary crafting outputs against database-backed examples.
- [ ] 2.2 Render the derived Alchemy, Scroll Mastery, and Cooking links next to the existing Fishing badge in `website/src/routes/items/[id]/+page.svelte:390-410`; verify recipe links at `:1317-1322,1979-1983` remain available and plain crafting gets no fabricated profession.
- [ ] 2.3 Check item headers and recipe navigation in the actual browser at 1440×900 and 390×844, including a multi-recipe output and an ordinary crafting-only output; verify relevant links remain readable without JavaScript and each distinct profession appears once.
