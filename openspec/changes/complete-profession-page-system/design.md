## Context

See `proposal.md` for motivation and `specs/profession-pages/spec.md` for behavior. The shipped header and curves are recorded in `specify-profession-pages`. Mining, Radiant Seeker, and Slayer currently use `ProfessionHeader` and `MasteryCurve` (`website/src/routes/professions/{mining,radiant_seeker,slayer}/+page.svelte`). Ten routes do not; Fishing is the validation route before the other nine.

Slayer sets `PAGE_SIZE = 20` at `website/src/routes/professions/slayer/+page.svelte:33` and `paginateStaticHtml={true}` at `:558`. The shared table slices static rows to the page size at `website/src/lib/components/ui/data-table/data-table.svelte:657-664`. Its database-backed test expects 143 targets (`website/src/routes/professions/slayer/slayer-page-data.db.test.ts:5-20`). The former plan's statement that pagination is hydration-only is false for this configuration.

## Goals / Non-Goals

**Goals:** Keep the mechanic and payoff near the top, retain exhaustive facts, and distinguish static completeness from hydrated density. Preserve source-backed claims and all existing entity routes.

**Non-Goals:** Player progress tracking, fabricated trainers or quests, a new visual brand, or a universal table component. Entity-to-profession links on item detail routes have their own change.

## Decisions

### Repair static completeness before declaring Slayer complete

Stop slicing Slayer's static rows; keep 20-row hydrated pagination if the browser remains readable. Check generated HTML with JavaScript disabled for a target after row 20 and the full mastery explanation. Check the interactive filtered table separately. The completion denominator is not the page size: Slayer's account-wide formula caps each target at 50 kills, and the 143 target inventory remains navigable (`website/src/routes/professions/slayer/+page.svelte:500-561`). Do not treat a database-only count assertion as proof of HTML completeness.

### Use form that matches each fact

Retain the ordinary unbordered header in `ProfessionHeader` (`website/src/lib/components/professions/ProfessionHeader.svelte:39-72`). A function uses a curve with a current-position marker; a threshold uses a marked region; a procedure uses ordered steps; a duration uses a timeline; a range or distribution uses a scaled bar; geography gets a map action. A genuine item comparison may stay a table. The demonstrated curve is `MasteryCurve.svelte:57-82,85-218`. Extract `RangeBar` or `Timeline` only after a second real consumer establishes the same meaning as `mechanics/mercenary-stats` or `mechanics/monster-spawns`. Do not create speculative `LocationTable`, `RecipeTable`, `ResourceTable`, `RelatedProfessions`, `HeroPanel`, or `MetricStrip` wrappers. `DataTable` remains appropriate for 100+ rows when cell widths and heights remain stable.

A measured baseline found bordered heroes and metric strips consuming 638–722px of an 844px mobile viewport; first facts sat 2.3–3.7 screens down. Fishing measured 7.6 desktop and 12.5 mobile screens; Slayer measured 8.9 mobile screens. These measurements do not establish current rendered heights. Measure the hydrated defaults at 1440×900 and 390×844. Aim below four and six screens respectively, with the first fact within one mobile viewport and no page-level horizontal overflow. Static pages can exceed those heights to preserve content. Do not shrink type to meet a budget. `PageSections` replaces counts-only metric strips when four or more sections exist (`ProfessionHeader.svelte:69-71`). Keep the useful cast/dig/queue steps, but remove generic “How It Works” framing and borders where they obscure content. Reserve a distinct border for an interactive calculator. Alternate dense tables and lighter explanation rather than nine same-weight cards. Combat's damage pipeline should be sequential, and Inventory should encode storage capacities; then remove the mechanics-index density apology.

### Keep mechanics cited in TypeScript; consolidate metadata separately

`website/src/lib/data/professions/mechanics.ts:1-47,49-173` stores typed payoff, formulas, thresholds, caps, and starting bonuses. The existing calculator modules consume it. Keep symbol-anchored `server-scripts` citations near hardcoded rules and behavior checks for formulas. A citation digest verifies bytes, not whether the formula matches the intended symbol: the herbalism misstatement passed the earlier citation check. Do not move mechanics into `static_data.json` or an unverified `profession_mechanics` database table. If a future table is needed, demand parity with the cited record. `game_config.json` alone is not a published data source until its loader validates it.

Create one `lib/queries/professions.ts` for typed SQL metadata projections currently redeclared in route loaders (for example, `website/src/routes/professions/+page.server.ts:7-18` and `website/src/routes/professions/exploring/+page.server.ts:20-30`). It owns database row shape, not game rules. Separate loaders only when their ownership or lifecycle warrants it. Fishing's `fishing-page-data.server.ts` and its test demonstrate a meaningful data boundary. Behavioral tests should defend query results, not the presence of a loader file. `FormulaTests` is already adding `lib/utils/mining.ts` and `treasureHunter` tests; do not duplicate those.

### Repair source data, then migrate pages

`mods/DataExporter/Exporters/ProfessionExporter.cs:92-114` publishes Lore Keeping as 13 and Exploring as 45. The game uses 17 books (`server-scripts/Player.cs:12113-12116`) and 46 discoveries (`server-scripts/ZoneTrigger.cs:175-176`). Repair export metadata, remove the Exploring-only `zone_triggers` override (`website/src/routes/professions/+page.server.ts:54-65`), then validate rebuilt counts. Add derived per-profession counts under `build-pipeline/src/compendium/denormalizers/professions/` when page consumers need them. `build-pipeline/schema.sql:1433-1463` drops gathering reward fields already exported at `mods/DataExporter/Exporters/GatherItemExporter.cs:97-102,157-160`; preserve appropriate gold, random drops, and chest reward chance at the database boundary. Chest-specific values already have columns at `build-pipeline/schema.sql:1489-1510`; do not duplicate them onto irrelevant resources. `mods/DataExporter/Exporters/CraftingRecipeExporter.cs:87-95` classifies only cooking and returns `unknown` for every other station; derive a truthful station classification rather than guessing from the output item. Verify rebuilt data against the export before the pages rely on it. If game-backed profession artwork is still absent, retain current semantic glyphs until a readable export proves otherwise.

### Gate the nine routes on Fishing

First finish Slayer's static-content gate. Reduce Fishing's bordered hero and section-card stack while preserving the bite timing, roll order, required rod, fallback fish, trash, and fish-food/potion data (`website/src/routes/professions/fishing/+page.svelte:297-336,470-745,825-1030`). Use disclosures for secondary fallback and trash outcomes and connect Fishing and Cooking in both directions. Review Fishing with Mining, Radiant Seeker, and Slayer at both viewports with and without JavaScript. Only then migrate Adventuring, Alchemy, Cooking, Exploring, Herbalism, Hunter, Lore Keeping, Scroll Mastery, and Treasure Hunter. The four validation routes span sparse/dense, gathering/combat, calculator/no-calculator, and enrichment/reduction. Do not infer page parity from that set: omit modules that do not apply.

Keep route-specific provenance. Herbalism needs plant yield, consumers, quests, vendors, and its Felarii starting rule. Hunter needs discovery, quality drops, and a level control that covers the observed target range. Cooking needs fish and plant ingredients, tooltip-backed food effects, and Dragonbait Stew's Valaark use. Alchemy needs token learning, ingredient professions, quests, and table coordinates. Scroll Mastery needs source descriptions, non-craftable scrolls, repair kits, effects, and scribing-table coordinates. Adventuring needs quest rewards, vendor requirements, and distinct offer/completion clocks. Treasure Hunter needs Random Map sources, every chest reward, clue images, and the Red Scabbard route. Exploring needs individual trigger actions, bounds, reward-type distinctions, and completion filters. Lore Keeping needs full book sources, drop rates, and component map links. Verify the inventory counts against the new export: the legacy counts 376, 19, 49, 11, 269, 47, 122, and 28 came from an older snapshot and are not contracts until reproduced.

### Finish cross-page behavior with existing navigation

Use typed links only where a relationship is evidenced, and keep the rendering route-local until multiple consumers establish a common contract. `website/src/routes/professions/+page.svelte:213-249` currently shows descriptions and completion/level counts, not payoff lines. Populate payoffs from the cited mechanics where available and review count-only professions separately. Build SEO descriptions from real payoff content. `add-entity-structured-data` owns profession page/entity graph wiring; retain truthful fields for that graph as content changes. Add a real `zone_trigger` map action only with a registry-backed entity resolution contract; do not overload zone links. `add-map-links-to-list-pages` owns compact Hunter and Herbalism row actions. Preserve existing map and entity deep links.

## Risks / Trade-offs

- [Full static tables increase HTML size] → Keep pagination as a hydrated enhancement. Measure prerendered size and verify a no-JavaScript reader can still inspect every row.
- [Derived counts can drift from game rules] → Assert the 46 and 17 game denominators and compare rebuilt table totals before showing completion progress.
- [Version-bound coverage numbers may be stale] → Recalculate from the 0.9.34.0 export and record discrepancies instead of copying historical counts.
- [Dense pages may pass a height budget by hiding facts] → Inspect complete HTML and the hydrated default separately. Count visible information, not only page height.
- [Artwork may be exported but not readable] → Keep the current Lucide glyph until an actual game-backed asset is validated.

## Migration Plan

1. Repair and verify export and database prerequisites independently of layout work.
2. Fix Slayer static HTML, then complete the Fishing reduction and four-page review.
3. Migrate the nine routes, preserve existing detail and map links, and add needed metadata and related links.
4. Check generated HTML, route data, game citations, and actual 1440×900 and 390×844 browser views before rollout. Revert the offending page change if a review fails; do not conceal missing rows with pagination.
