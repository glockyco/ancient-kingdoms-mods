## 1. Consume canonical data and finish profession metadata

- [x] 1.1 Profession completion denominators are repaired in `mods/DataExporter/Exporters/ProfessionExporter.cs`, with citations to the game completion calculations. Preserve that producer rather than repeating the export repair.
- [x] 1.2 The Exploring-only index override is removed. `website/src/routes/professions/+page.server.ts` reads the stored tracking denominator directly.
- [ ] 1.3 Review the existing canonical gathering/chest consumption against acquisition's acceptance record during profession migration. Preserve applicable gold, primary/secondary quantities, conditions and probability events. Do not add a second field-preservation or source path.
- [ ] 1.4 Review the existing recipe/provider consumption against acquisition's acceptance record during profession migration. Preserve all complete variants, native type classification and exact world/home memberships. Do not repair `CraftingRecipeExporter` independently or invent coordinates for home capabilities.
- [ ] 1.5 Add a focused profession-count denormalizer under `build-pipeline/src/compendium/denormalizers/professions/` for counts needed by the route inventories; verify each stored total matches the corresponding source rows and does not override game completion rules.
- [ ] 1.6 Introduce typed profession metadata queries in `website/src/lib/queries/professions.ts` and replace local metadata row interfaces in all thirteen route loaders and the index; verify database-backed query behavior and identical exported names, categories, and achievement links. Keep cited mechanics in `lib/data/professions/mechanics.ts`.

## 2. Close the four-page validation gate

- [ ] 2.1 Remove Slayer's static row truncation at `website/src/routes/professions/slayer/+page.svelte:544,558` without losing its hydrated 20-row page size; verify generated no-JavaScript HTML contains a target after row 20, all 143 targets, and its full mastery rule. Verify hydrated search and filters reach later targets.
- [ ] 2.2 Reduce Fishing's bordered hero and metric strip at `website/src/routes/professions/fishing/+page.svelte:297-336` to the shared header and payoff; verify the first fishing fact fits within a 390×844 viewport and existing achievement navigation remains.
- [ ] 2.3 Preserve Fishing's cast/bite/catch sequence, required rod, drop rates, and numeric calculator while replacing uniform panels with a curve and readable sections; verify one source-backed default numeric outcome against the page and its focused page-data test.
- [ ] 2.4 Combine Fishing's food and potion uses, disclose secondary lower-tier fallback and trash pools, and link Cooking; verify every former row remains in static HTML and the disclosure is usable without JavaScript.
- [ ] 2.5 Review Mining, Radiant Seeker, Slayer, and Fishing together at 1440×900 and 390×844, with and without JavaScript; verify first-fact placement, no page overflow, complete static inventories, hydrated default density, and all four payoff statements before starting the nine routes.

## 3. Migrate nine profession routes

- [ ] 3.1 Migrate `professions/herbalism` to the shared header and curve, with variable yield, Felarii start, plants, recipe consumers, quests, vendors, and locatable spawns; verify current export counts and a sample yield against cited game rules and rendered page data. `add-map-links-to-list-pages` owns compact row actions.
- [ ] 3.2 Migrate `professions/hunter` to show discovery, quality-drop payoff, target sources, and a slider covering the actual target level range; verify boundary slider behavior and target data. `add-map-links-to-list-pages` owns compact row actions.
- [ ] 3.3 Migrate `professions/cooking` to show fish and plant ingredient provenance, tooltip-backed food effects, Dragonbait Stew's Valaark use, and a Fishing link; verify a representative recipe's inputs and effects in the rendered HTML.
- [ ] 3.4 Migrate `professions/alchemy` to show potion effects, token-learning provenance, cross-profession materials, quest starts, and canonical exact providers. Verify a token-gated recipe and a surviving world location in the database and page. Keep home capabilities nonspatial.
- [ ] 3.5 Migrate `professions/scroll_mastery` to retain its database description and show craftable versus non-craftable scrolls, repair kits, skill effects, and canonical exact providers. Verify each group with actual item data and preserve nonspatial home capabilities.
- [ ] 3.6 Migrate `professions/adventuring` to show canonical quest gold/experience, vendor costs and faction requirements, distinct daily-offer and completion clocks, and the Hunter/Slayer distinction. Verify one reward and both timing rules from game code and displayed data.
- [ ] 3.7 Migrate `professions/treasure_hunter` to show canonical Random Map sources and chest outcomes with their events and conditions, a relic filter, clue images, and the Red Scabbard route. Verify non-relic outcomes remain reachable and map use destinations resolve without becoming false sources.
- [ ] 3.8 Migrate `professions/exploring` to show per-trigger map actions, coordinates/bounds, city/regular/dungeon experience, and completion filters; add a registry-backed `zone_trigger` map entity only if each action resolves to its trigger, and verify 46/46 completion without the index override.
- [ ] 3.9 Migrate `professions/lore_keeping` to show the complete game-defined book inventory, full canonical source alternatives and event-labeled chances, and direct map actions for books and components. Verify completion against the authoritative denominator and each displayed source against the canonical projection.

## 4. Complete related presentation and integration

- [ ] 4.1 Add route-local, evidenced related-profession links and verify Fishing/Cooking and Herbalism/Alchemy navigation works in both directions; do not duplicate the item-detail badges owned by `link-entities-to-profession-pages`.
- [ ] 4.2 Show truthful payoff lines on `/professions` cards (`website/src/routes/professions/+page.svelte:213-249`), including no gameplay bonus for count-only professions; verify all thirteen cards link to their routes and reflect their page headers.
- [ ] 4.3 Update each profession's SEO description using its actual payoff and page content; verify generated HTML contains correct metadata. Preserve any structured data wired by `add-entity-structured-data` and keep its claims aligned with visible content; do not duplicate graph wiring.
- [ ] 4.4 Re-encode `mechanics/combat` as a damage sequence and grouped formulas and `mechanics/inventory` as storage capacities; remove the obsolete `/mechanics` density warning after both are readable. Verify both pages at 1440×900 and 390×844.
- [ ] 4.5 Verify all thirteen profession pages and `/professions` at 1440×900 and 390×844 in the actual browser. Confirm first fact within one mobile screen, no horizontal overflow, hydrated default within four desktop/six mobile screens, full inventories and calculator defaults without JavaScript, and readable text.
- [ ] 4.6 Run relevant page-data and mechanics tests, citation checks, `pnpm check`, `pnpm lint`, and `pnpm build`; inspect generated HTML and source-backed claims. Do not duplicate the `lib/utils/mining.ts` and `treasureHunter` formula tests owned by `FormulaTests`.
