# Tasks

## 1. Work already in the tree

- [x] 1.1 Finish the uncommitted currency-use season labels in `website/src/lib/server/item-usages.ts`, `website/src/lib/types/item-sources.ts` and `website/src/routes/items/[id]/+page.svelte`: group "Currency for" rows by product and season, as item-usage "Reverse uses read the same relationship" requires, and render season labels at 14 px or more. Verify that `/items/festival_token` lists the four firework packs with both seasons, and that `/items/spook_token` lists the four Halloween treats, in light and dark mode.

## 2. Export

- [ ] 2.1 Replace `is_halloween` in `mods/DataExporter/Models/MonsterData.cs` and `Exporters/MonsterExporter.cs` with `season`, and `is_christmas_npc` in `NpcData.cs` and `NpcExporter.cs` with `season`, each with a comment citing the game field. Verify the exporter builds.
- [ ] 2.2 Replace `seasonal_items` in `GameConfigData.cs` and `GameConfigExporter.cs` with `seasons` entries of id, buff skill id and shop item ids read from `GameManager`, failing on a missing list or buff. Verify the exporter builds and the export-game-data skill's checks pass.
- [ ] 2.3 Run a fresh export of the current build following the export-game-data skill and promote it. Verify that `monsters.json` has `season: "halloween"` only for pumpkin_head and witch, `npcs.json` has `season: "christmas"` only for santa_claus, and `game_config.json` lists both seasons with halloween_event and winter_festival as buff skills.

## 3. Pipeline schema and load

- [ ] 3.1 Add the `seasons` table and make `monsters.season`, `npcs.season` and `acquisition_vendor_details.season` nullable foreign keys in `build-pipeline/schema.sql`. Remove both booleans and the `'none'` CHECK. Declare the new references in `redactions/references.py`. Verify `uv run pytest` passes for schema and reference tests.
- [ ] 3.2 Type `seasons` in `GameConfigData` and `season` in `MonsterData` and `NpcData` in `models.py`, register the `seasons` table load, and make `denormalizers/acquisition.py` read `config["seasons"]` instead of the hard-coded tuple, writing null for year-round offers. Update `tests/acquisition_fixtures.py` and `tests/test_acquisition_derivation.py`. Verify the pipeline tests pass and a rebuilt database has 104 Halloween and 104 Winter Festival offer rows.

## 4. Pipeline derivations

- [ ] 4.1 Derive `item_seasons` in the acquisition reachability fixed point per design decision 4, with tests for a direct seasonal shop item, a Halloween drop, an item obtained only from a seasonal pack, an item sold in both seasons, and a year-round item with a seasonal name. Verify the rebuilt database lists exactly the 30 seasonal items from the audit.
- [ ] 4.2 Exclude seasonal monsters from zone level range and median in `denormalizers/zones/levels.py`, with a test. Verify The Lone-lands median is 19 and the other five Halloween zones are unchanged. Review the resulting `source_level_hint` changes in the data diff.
- [ ] 4.3 Add season keywords ("halloween", or "winter festival christmas") to seasonal monsters, NPCs, quests and items in `denormalizers/search/keywords.py`, with a test. Verify the keywords in the rebuilt database.

## 5. Shared reader

- [ ] 5.1 Add the `season_active` predicate to `website/src/lib/acquisition/types.ts`, `conditions.ts` (fields, validation, evaluation with the year-end wrap, description) and `fingerprint.ts`. Move the season dates, icons and tones into `website/src/lib/data/seasonal-events.ts`. Verify condition tests cover January 3, December 18, November 1 and a missing current time.
- [ ] 5.2 Attach season roots in `assemble.ts` to seasonal vendor offers and to placements of seasonal monsters and NPCs, and load `item_seasons`. Verify a model test shows Grimnir's completion of A Wish for the Winter Heart has no season root.
- [ ] 5.3 Add the method and item season projection to `projections.ts`. Verify tests return Halloween for Spook Token's drops, the Winter Festival for Santa's quest rewards and Winter Festival Coin, and both seasons for Pack 10 Skyflares. Add a database test that `SEASONS` keys equal the `seasons` table.

## 6. Server consumers

- [ ] 6.1 Make `item-sources.ts`, `item-usages.ts`, `item-source-summary.ts` and `obtainability.ts` read seasons from the projection, carrying seasons on drop, quest and pack rows. Delete every `season === "none"` filter. Verify existing tests pass and new tests cover a seasonal drop row and a seasonal quest row.
- [ ] 6.2 Add season clauses to item, monster, NPC, quest and skill meta descriptions in `meta-description.ts`, stating the season and the amount and price where relevant. Verify description tests for Festive Cookie, Spook Token, Pumpkin Head, Santa Claus and Keeping the Winter Peace.
- [ ] 6.3 Replace the raw SQL in `website/src/lib/queries/seasonal-events.server.ts` with the shared reader and update the `seasonal-events` case in `website/scripts/build-sitemap-manifest.mjs` and `page-fingerprint-fields.mjs` for the new columns. Verify the sitemap manifest builds.

## 7. Season label and detail pages

- [ ] 7.1 Add a `SeasonLabel` component that reads icon, name and link from `SEASONS`, and replace the existing monster and NPC badges with it. Verify both pages in light and dark mode.
- [ ] 7.2 Item page: label Dropped by, Rewarded by Quests and Found in Packs rows with their seasons, and keep the Seasonal Shop card at 14 px or more. Verify `/items/pumpkin_costume`, `/items/winter_festival_coin`, `/items/pack_10_skyflares` and `/items/haunted_chews` in light and dark mode at desktop and phone widths.
- [ ] 7.3 Monster and NPC pages: one sentence under the header stating the season, and seasons in the spawn table's Active column. NPC pages: a "Seasonal stock" card per season on repair merchants, with the season in the dedupe key, and the quests completed at the NPC. Verify `/monsters/witch`, `/npcs/santa_claus`, `/npcs/grimnir_stonehammer` and one other repair merchant in the browser.
- [ ] 7.4 Quest pages: season label, a timing box saying the quest can be accepted only during the Winter Festival and repeated 8 hours after completion, and a labeled Santa in the NPCs section. Verify the three Santa quests in the browser.
- [ ] 7.5 Skill pages for the season buffs: a "Granted to" section saying every online player has the buff during the season, no rank or learning link, and no one-hour duration. Reconcile the Double XP scope in `formatSkillEffect.ts` with the game's `hasDoubleExp` call sites, checking cooking and scribing in the code. Verify both skill pages.
- [ ] 7.6 Zone pages: season labels in monster and NPC tables, and a "Seasonal events" section beside "Regional events". Verify `/zones/the_lone-lands` shows median 19 and lists Pumpkin Head and Witch in the seasonal section, and `/zones/everfrost` lists Santa Claus and both Halloween monsters.

## 8. Map

- [ ] 8.1 Delete `mapMethodIsVisible` and its call sites in `website/src/lib/map/acquisition.ts` and `website/src/lib/queries/popup.ts`. Add `season` to `MonsterMapEntity` and `NpcMapEntity` in `map.server.ts`. Verify `popup.db.test.ts` with new cases for Festive Cookie and a repair merchant.
- [ ] 8.2 Item popup: "Seasonal shop" list per season with price and merchants, "Opened from" list for packs, and season labels on dropped-by and quest-reward rows. Verify `/map?entity=festive_cookie&etype=item`, `spook_token` and `winter_festival_coin` in the browser, including focus.
- [ ] 8.3 Monster and NPC popups and tooltips: a seasonal callout before the spawn-window callout and one tooltip line. Repair-merchant popups: seasonal stock per season with item-currency prices. Verify Pumpkin Head, Santa Claus and Adventurer Argosh in the browser in light and dark mode.

## 9. Lists and search

- [ ] 9.1 Add a Season facet and labels to the monster, NPC, quest and item lists. For the item list, keep the first page fully populated at first paint and fetch only what it needs. Verify each list filtered to Halloween and to the Winter Festival in the browser.
- [ ] 9.2 Add per-season filtered lists to `website/src/lib/search/lists.ts`, season details on seasonal result rows, and judged cases for halloween, christmas, winter festival, santa, spook token, festival token and halloween items. Verify the search relevance tests and the held-out pass count.

## 10. Seasonal Events page

- [ ] 10.1 Rebuild `website/src/routes/mechanics/seasonal-events/+page.svelte` per design decision 8 and the seasonal-content requirement "The Seasonal Events page answers player questions", with copy following the new reader-facing-copy requirements. Update `mechanics-sections.ts` for the new sections. Verify at 1440×900 and 390×844 in light and dark mode that nothing scrolls horizontally except the hunt table, text is 14 px or more, and every number matches the database.

## 11. Integration

- [ ] 11.1 Sync citations with `uv run compendium citations sync --game-version 0.9.37.1`, then run `pnpm check`, `pnpm lint`, `pnpm format:check`, `pnpm test`, the pipeline tests, the sitemap manifest build and `pnpm build`. Verify all pass.
- [ ] 11.2 Run `openspec validate integrate-seasonal-content --strict` and review every changed route at 1440×900 and 390×844 in light and dark mode. Verify the validation passes and record the routes reviewed in the commit messages.
