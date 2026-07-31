---
title: Profession Page Migration
type: plan
status: draft
created: 2026-07-31
parent: 2026-07-31-ancient-kingdoms-overview
superseded_by:
archived:
---

# Profession Page Migration

Ordered work to bring all 13 profession pages onto the system defined in
`2026-07-31-profession-page-system`. Evidence:
`2026-07-31-profession-content-coverage`.

Stages run in order. Stage 2 owns the mechanics record because the progression module and
payoff line both read it; see the spec for why it is a TypeScript module rather than a
database table. Within Stage 3 the four validation professions gate the remaining nine.

## Tasks

### Stage 0 — Correctness

Independent of the redesign. Ship first; each is a factual error on a live page. Exact
sites, all under `website/src/routes/`.

- [x] Fix herbalism tiers 3 and 4 to `skill` and `skill × 0.95` in `professions/herbalism/+page.svelte:36-40` and the duplicate `getHerbalismSuccessChance` in `gather-items/[id]/+page.svelte:192-196`
- [x] Fix the mining calculator in `gather-items/[id]/+page.svelte:203-211` — tier 1 `0.1`→`0.3`, tier 3 `skill × 0.4`→`× 0.5`, tier 4 `skill × 0.2`→`× 0.4`; `professions/mining/+page.svelte:33-48` is already correct and is the reference
- [x] Re-anchor every drifted profession success citation to symbol form: `Utils.cs:491-501` and `Utils.cs:515-530` had both slid onto neighbouring functions, and the effortless-tier rule carried no citation at all
- [x] Add `m.is_fabled` to the monster projection in `professions/slayer/+page.server.ts:64-86`, which already declares it at line 15 and consumes it at `+page.svelte:115`
- [x] Change the effortless boundary from `>=` to `>` in `professions/herbalism/+page.svelte:71-77` and `professions/mining/+page.svelte:76-84`
- [x] Run `pnpm check:citations` from the repo root, then `pnpm check && pnpm lint && pnpm build`

Risk is low and contained: no profession page has a test, and the 691 committed mechanics
snapshots cover skill pages only, so none of these edits can move a snapshot.

The herbalism defect is the argument for the Stage 2 mechanics record. It survived a
green citation check because the checker validates region bytes, not claim correctness,
and the cited line range had drifted onto the alchemy function. Consolidating
hand-transcribed literals into one cited module is a correctness measure, not a refactor.

### Stage 1 — Data

Pipeline work only. Does not gate Stage 2.

- [ ] Correct `professions.tracking_denominator` to 46 for exploring and 17 for lore keeping, in `ProfessionExporter.cs` so it survives re-export
- [ ] Remove the `zone_triggers` count override in `routes/professions/+page.server.ts` once the metadata is correct
- [ ] Add per-profession derived counts as a denormalizer under `build-pipeline/src/compendium/denormalizers/professions/`
- [ ] Add DB columns for the dropped `gather_items` fields: `gold_min`, `gold_max`, `random_drops`, `chest_reward_probability`
- [ ] Fix `CraftingRecipeExporter.DetermineStationType` so non-cooking stations are not collapsed to `unknown`
- [ ] Run `uv run compendium build` and confirm the new columns populate

### Stage 2 — Shared layer

- [ ] Build `lib/data/professions/mechanics.ts`, re-verifying every formula against current `server-scripts/` and citing each in symbol form
- [ ] Fold the existing `lib/utils/{alchemy,cooking,fishing,treasureHunter}` formulas into that record, keeping their public helper signatures
- [ ] Add a unit test asserting the record's tier tables against the payoff list in the spec
- [ ] Create `lib/queries/professions.ts` owning the profession row, replacing the 13 local interfaces
- [ ] Build `ProfessionHeader` — icon, title, category, purpose, payoff line, optional jump list
- [ ] Wire `PageSections` into the profession header for pages with 4+ sections
- [ ] Build `ProfessionProgression`, generated from the mechanics record
- [ ] Build `ProfessionCalculator` as a formula-agnostic input and result shell
- [ ] Build `LocationTable`, `ResourceTable`, `RecipeTable`
- [ ] Build `RelatedProfessions` with typed, reasoned links
- [ ] Delete the bordered hero, metric strip and generic "How It Works" wrappers from the four newest pages, preserving their step content
- [ ] Replace inline `grid-template-columns` tier matrices with a responsive equivalent
- [ ] Add a loader test for the shared query module, following `fishing-page-data.test.ts`

### Stage 3 — Validation professions

Each is complete when it satisfies every acceptance criterion in the spec.

- [ ] **radiant_seeker** — add the Aether combat payoff, 227 spawns with map links, the real 100–3600s respawn, the 5–25% yield rule, the Fire Goblin start, and the explicit "no crafting use" finding
- [ ] **mining** — add 102 spawns with map links, node rewards and random gem pools, the 60 recipe consumers, the 9 gather quests, the vendor alternative, the pickaxe durability rule, and the Dwarf start
- [ ] **slayer** — add the damage-reduction payoff, the account-wide formula, loot from `item_sources_monster`, spawn map links, and migrate 143 rows to `DataTable`
- [ ] **fishing** — reduce to the new model: strip hero and metric strip, promote the loop content, surface required tool and drop chances, merge fallback and trash into disclosures, unify foods and potions as fish uses, and link to cooking
- [ ] Review all four at 1440×900 and 390×844 against the density and overflow criteria
- [ ] Confirm no-JS rendering for all four

### Stage 4 — Remaining professions

- [ ] **herbalism** — 376 spawns, 19 outputs, 49 recipe consumers, 11 quests, five vendors, variable yield, Felarii start
- [ ] **hunter** — the quality-drop payoff, 269 spawn rows, hunt loot, the journal discovery model, and the fix for the 1–60 level slider
- [ ] **cooking** — the 14 fish and 7 plant inputs, food buff effects surfaced from tooltips, Dragonbait Stew's Valaark use, and the fishing link
- [ ] **alchemy** — potion effects, recipe-token unlock provenance, the 47-material cross-profession breakdown, quest start NPCs, table coordinates
- [ ] **scroll_mastery** — restore the DB description, add the 7 non-craftable scrolls and repair kits, surface skill effect values, add coordinates
- [ ] **adventuring** — quest gold and XP, vendor prices and faction fields, the two-clock distinction, and the Hunter/Slayer non-overlap note
- [ ] **treasure_hunter** — Random Map acquisition from 122 monster sources, all 28 chest rewards with a relic filter, clue images, the Red Scabbard route
- [ ] **exploring** — per-trigger map actions, trigger coordinates and bounds, the city/regular/dungeon XP split, completion filters
- [ ] **lore_keeping** — full source lists with drop rates, map actions per book and component, the 17-book completion model
- [ ] Add a `zone_trigger` entity type to `MapLink` for exploring

### Stage 5 — Cross-page polish

- [ ] Update `/professions` index cards to carry the payoff line
- [ ] Verify bidirectional profession links resolve in both directions
- [ ] Regenerate per-profession SEO descriptions from the payoff line
- [ ] Add profession structured data, following `2026-07-31-entity-structured-data`
- [ ] Measure all 14 routes at both viewports and confirm the density and overflow criteria
- [ ] Run `pnpm check && pnpm lint && pnpm build`
- [ ] Run `pnpm check:citations`
- [ ] Update the profession small items in `2026-07-31-ancient-kingdoms-overview`

## Notes

Stage 0 ships first and independently; each item is currently wrong on a live page.

Stage 1 is pipeline work and no longer blocks the design work, because the mechanics
record moved into Stage 2 as a TypeScript module. It can run in parallel with Stage 2 or
after it.

The four Stage 3 professions were chosen to span sparse and dense, gathering and combat,
calculator and none, and both directions of change. A flaw in the model surfaces there or
not at all.
