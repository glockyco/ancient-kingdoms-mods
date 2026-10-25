# Tasks

## 1. Pipeline

- [ ] 1.1 Record `tooltip_stat_fields` in `build-pipeline/src/compendium/denormalizers/items/tooltips.py` from the placeholders present in each item's template, using the same field-to-placeholder map that fills them, and add the column to `build-pipeline/schema.sql`. Cite `server-scripts/EquipmentItem.cs:ToolTip` beside the map. Add a pipeline test for a template with a placeholder, a typed number and no mention. Verify `uv run pytest -q` and `uv run ruff check` pass.
- [ ] 1.2 Drop `recipe_potion_learned_name` from `build-pipeline/schema.sql` and from every reader. Rebuild the database and verify that Cinderchant Chestplate's `tooltip_stat_fields` lacks `haste`, Abyssal Tidehammer's covers all its nonzero stats, and items without a template have an empty list.

## 2. Item readers

- [ ] 2.1 Derive the taught item's name in `ITEM_DETAIL_SELECT` in `website/src/lib/queries/items.ts` as `taught_by_recipe_name` already is, and update `meta-description.ts`. Verify a database test reads Cold Resistance Potion as the item Cold Resistance Potion Recipe teaches.
- [ ] 2.2 Add zones to drop rows in `website/src/lib/server/item-sources.ts` and `website/src/lib/types/item-sources.ts`, taken from the kill method's spawn providers, or the altar's zone for an altar event, and none otherwise. Verify a database test in `website/src/lib/queries/popup.db.test.ts` or a sibling that Black Pearl's Fire Templar rows name Despair at 10% and Molten Sanctuary at 1%, and Ashen Key Shard's names only Molten Sanctuary.

## 3. Opening row

- [ ] 3.1 Rebuild the top of `website/src/routes/items/[id]/+page.svelte` as the tooltip beside a one-column fact list stretched to the same height, with the fact list at full width when the item has no tooltip, and the existing companion cards (Pet, Fatecharm, Treasure Location, Currency for, Seasonal Shop and the rest) moved to full-width sections below. Verify in the browser at 1440, 768 and 390 pixels wide in both themes on Abyssal Tidehammer, Arcane Essence, Cold Dwarven Beer, Cinderchant Boots and Random Gem 1.
- [ ] 3.2 Remove the Stats card. List every nonzero stat outside `tooltip_stat_fields` in the fact list under a heading stating the tooltip does not show it, keep the weapon proc as a fact row with its skill link and chance, and drop Attack Delay for tools with a source comment citing `server-scripts/EquipmentItem.cs:CanEquip`. Verify that Cinderchant Chestplate shows Haste +10%, Cindersoul Sash shows Mana +250, Journeyman's Boots shows Movement Speed +1, Abyssal Tidehammer shows no stat outside its tooltip and Bamboo Fishing Rod shows no delay.
- [ ] 3.3 Remove the fact list's Set Bonus row and link the set section's title to the set's page. On armor set bonus entries remove the quality badge, the augment mechanics line and the no-known-source notice. Remove the augment socketing line from Mechanics where How to Use is shown. Verify on Cinderchant Boots, Cinderchant Armor Bonus Set and Great Amethyst of Warding.
- [ ] 3.4 Render Teaches Recipe on recipe items with the taught item's link, level and materials. Verify on Cold Resistance Potion Recipe.

## 4. Relationship sections

- [ ] 4.1 Lay out every section after the opening row at full width in the order effects, sources, uses, and add the entry count to each relationship title. Verify on Arcane Essence, Festival Token and Broken Map.
- [ ] 4.2 Move Dropped by to the shared data table with Monster, Level, Zone and Chance columns, sorted by chance, ten rows a page, keeping fatecharm chances, season labels and map links. Group rows by zone as well as monster and chance. Verify Black Pearl shows the Despair and Molten Sanctuary rows, Broken Map pages its sources with the first page in the prerendered HTML, and a one-row list shows no paging controls.
- [ ] 4.3 Move the remaining relationship lists to tables with columns suited to each relation, with season labels on their own line under the name and a text link wherever a row links a recipe. Verify Sold by, Rewarded by Quests, Used in Recipes, Required for Quests, Gathered from, Found in Random Loot, Currency for and the chest relations on representative items in both themes at 1440 and 390 pixels wide.

## 5. Integration

- [ ] 5.1 Audit all prerendered item pages after `pnpm build`: no two sections share a row, the opening row holds the tooltip and fact list on every page with a tooltip, every nonzero stat appears in the tooltip or the fact list, and every relationship title states its count. Verify the audit reports no exception.
- [ ] 5.2 Run `pnpm exec svelte-check`, `pnpm exec eslint`, `pnpm exec vitest run`, the pipeline tests, `node --import tsx scripts/build-sitemap-manifest.mjs` and `openspec validate redesign-item-detail-page --strict`. Sync citations. Verify all pass.
