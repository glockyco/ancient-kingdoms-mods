---
title: Profession Page Content Coverage
type: audit
status: active
created: 2026-07-31
parent: 2026-07-31-ancient-kingdoms-overview
superseded_by:
archived:
---

# Profession Page Content Coverage

What each of the 13 profession pages shows today versus what the game and the pipeline
already contain. Findings as of game version 0.9.26.0 (`citations.lock.json:snapshot`).

Design decisions derived from this audit live in `2026-07-31-profession-page-system`;
the ordered work lives in `2026-07-31-profession-page-migration`.

## Buckets

- **A — Shown**: rendered on that page today.
- **B — Available, unused**: already in `compendium.db`, not on the page.
- **C — Derivable**: provable from `server-scripts/` or raw exports with a citation.
- **D — Needs extraction/schema**: the game has it, the pipeline does not carry it.
- **E — Unknown**: not establishable. Never invent a value to close it.

## Verified inventory

Counts queried from `website/data/compendium.db`.

| Profession | Category | Track | Page lines | Core entities |
| --- | --- | --- | ---: | --- |
| radiant_seeker | gathering | float | 148 | 1 resource, 227 spawns / 6 zones |
| mining | gathering | float | 276 | 5 ores, 102 spawns / 10 zones |
| herbalism | gathering | float | 257 | 19 plants, 376 spawns / 10 zones |
| fishing | gathering | float | 1083 | 21 spots, 23 spawns, 31 fish, 7 trash, 9 rods |
| alchemy | crafting | float | 539 | 43 recipes, 7 tables, 10-quest chain |
| cooking | crafting | float | 431 | 40 recipes, 7 ovens |
| scroll_mastery | crafting | float | 465 | 10 recipes, 5 tables, 17 scroll items |
| hunter | combat | float | 184 | 6 hunt targets, 269 spawn rows |
| slayer | combat | float | 164 | 143 boss/elite, 9 fabled |
| adventuring | combat | float | 790 | 22 quests, 5 taskgivers, 5 vendors |
| exploring | exploration | count | 127 | 46 triggers / 25 parent zones |
| lore_keeping | exploration | count | 271 | 17 books |
| treasure_hunter | exploration | float | 406 | 9 dig sites / 5 zones, 28 chest rewards |

## The shared substrate

Every page needs these and none of them is a per-profession fact.

- **There is no profession XP curve.** All 11 float professions are a `0..1` mastery
  fraction incremented directly per action and clamped with `Mathf.Min(1f, …)`; the
  in-game panel renders `field * 100` against a literal `/ 100`
  (`UIProfessions.cs:Update`). Character XP is an entirely separate system. Pages must
  not imply an XP bar or a level-up threshold.
- **Gain is a two-stage roll**, not a flat rate: a proc chance that decays with mastery,
  then a random increment divided by the action's success chance. Proc chance is
  `0.9 − mastery/2` for alchemy, cooking, herbalism, mining and radiant seeker;
  `0.7 − mastery/2` for hunter; `0.6 − mastery/2` for fishing
  (`GatherItem.cs:OnInteractServer`, `GatherItem.cs:OnInteractFishServer`,
  `Player.cs:UserCode_CmdMakePotion__Int32`,
  `Player.cs:UserCode_CmdCraftItem__NetworkIdentity__Int32`, `Monster.cs:OnDeath`).
- **The "too simple" rule** suppresses gain entirely: above 25% mastery tier 0 stops
  paying, above 50% tiers 0–1 stop, above 75% tiers 0–2 stop. Comparison is strictly
  `>`. This is the single most useful progression fact for a player and no page states
  it plainly.
- **What mastery actually buys** differs per profession and is never a generic bonus.
  The complete evidenced list: gather/craft success chance (herbalism, mining, fishing,
  alchemy, cooking); quality-drop rate `+level/2` (hunter, `Monster.cs:OnDeath`); boss
  and elite damage taken `−ceil(dmg × level × 0.1)` above 10% mastery
  (`Combat.cs:DealDamageAt`); relic roll `+level × 0.1` in Buried Treasure Chests only
  (`ChestItem.cs:Use`); Radiant Aether chance `0.05 + level × 0.2`
  (`GatherItem.cs:OnInteractServer`); vendor item gating
  (`UINpcTrading.cs:Update`); scroll rank `clamp(round(level × 20), 1, maxRank)`
  (`ScrollItem.cs:Use`). Lore keeping and exploring buy nothing but the achievement.
- **No evidence exists** for a profession-level effect on gather speed, respawn timers,
  generic yield, recipe learning, or zone unlocks. Do not infer any from `max_level = 100`.

## Per-profession findings

### radiant_seeker

The strongest confirmation that a bare page does not mean a bare profession. 148 lines
render one table row.

- **A** — description, max level, achievement, a skill slider, one resource row with a
  fixed 0.10–0.30% gain.
- **B** — 227 spawn positions across 6 zones, all with coordinates; the map already has
  a dedicated spark layer (`lib/map/layers.ts:98-105`). Radiant Aether's item row
  (quality 4, no-trade). No recipe, quest, vendor, altar, portal or chest consumes
  Aether — the absence is itself the finding.
- **C** — sparks bypass the success-roll model entirely: the gather always succeeds and
  only the reward is rolled, at `0.05 + level × 0.2` (5%→25%). Respawn is a random
  100–3600s, not the 60s the DB stores. **Aether is a combat resource**: a 15% proc on
  critical hits raises the crit multiplier from 1.5 to 3; a 15% proc on lethal damage
  restores full health; area damage and debuff skills can consume one to negate the
  effect (`Player.cs:TryConsumeRadiantAether`,
  `ScriptableSkill.cs:TryActivateRadiantAetherForArea`). Fire Goblins start at 5%.
- **D** — none. Every node fact already reaches the DB.
- **E** — no unlock quest, trainer or first encounter. Expected yield per hour is not
  derivable.
- **Conflict** — DB says `item_reward_amount = 0` with `actual_drop_chance = 1.0`, which
  reads as a guaranteed reward; the server overrides quantity with the 5–25% roll.
  Publish the server rule, not the raw column.

### mining

- **A** — 5 ores, tiered odds, a skill + pickaxe calculator whose formulas match
  `Utils.cs:GetSuccessProbMining` exactly.
- **B** — 102 spawn positions across 10 zones. Reward item and amount per node. Random
  gem drop pools with configured and actual chances. 60 recipe consumers. 9 gather
  quests with NPCs and rewards. Rurik Ironbeard sells Iron Ore at 60g. Respawn times
  (300s→1200s by tier). `tool_required_id` is selected by the loader and never rendered.
- **C** — a pickaxe is required and loses one durability *before* the success roll, so a
  failed attempt still costs durability. Attempts below 20% are refused. Dwarves start
  at 5%.
- **D** — none for node data. The "needs a Pickaxe-category weapon" requirement is not a
  serialized field; it is prose from `Player.cs:TryGetSelectedPickaxe`.
- **E** — no trainer or unlock quest. No defensible "best ore to farm" ranking.
- **Defect, elsewhere** — this page's formulas are correct and match
  `Utils.cs:GetSuccessProbMining` exactly. The duplicate calculator on
  `/gather-items/[id]` is the wrong one, on three of five tiers: tier 1 uses `0.1` where
  the server uses `0.3`, tier 3 uses `skill × 0.4` where the server uses `× 0.5`, and
  tier 4 uses `skill × 0.2` where the server uses `× 0.4`. It understates every mid and
  high tier.

### herbalism

- **A** — 19 plants, tier odds, a skill calculator.
- **B** — 376 spawn positions across 10 zones. Per-plant reward item and amount. 49
  recipe consumers. 11 quest records. Five vendors sell plant outputs. Respawn times
  (120s→1200s).
- **C** — no tool required, unlike mining. Attempts below 10% are refused. Yield is
  `Random(1..item_reward_amount)`, so the DB amount is a maximum and not a constant.
  Felarii start at 5%.
- **D** — none.
- **E** — all 19 `description` fields are blank; no botany lore exists to publish.
- **Defect** — the page understates endgame odds. It computes tier 3 as `skill × 95`
  and tier 4 as `skill × 85`; the current server uses `playerForagingLevel` and
  `playerForagingLevel × 0.95` (`Utils.cs:GetSuccessProbHerbalism`, currently at
  `Utils.cs:497`). At 100% mastery the page shows 95% and 85% where the game gives 100%
  and 95%. Both the profession page and `/gather-items/[id]` carry the identical wrong
  transcription and the identical stale citation `Utils.cs:491-501` — a range that now
  contains the *tail of `GetSuccessProbAlchemy`* (`0.2 + alchemyLevel`,
  `alchemyLevel × 0.95`, `alchemyLevel × 0.9`) plus only the signature and tier 0 of the
  herbalism function. The page's `× 95` is alchemy's tier-3 coefficient; its `× 85`
  matches the stale `static_data.json` block rather than any current code.

### fishing

The high-water mark of the current approach, and the clearest evidence that page length
is not coverage. 1083 lines, 12.5 mobile screens.

- **A** — hero, 5 metric cards, a 6-step "How It Works", a genuinely good calculator
  (skill, spot, rod, costume → bite chance, XP, mastery proc, click window, cast delay,
  full outcome distribution), rods with acquisition sources, 23 spots, fallback pools,
  trash, 13 fish foods, 13 fish potions.
- **B** — `tool_required_id` is loaded per spot and never rendered. `actual_drop_chance`
  is loaded and never rendered. Rod `level_required` and `slot` are loaded and never
  rendered. Spot respawn, description and coordinates are not selected. The fish-food
  section never links to `/professions/cooking`.
- **C** — the full success table, the 2 percentage-point costume bonus per equipped skin,
  the 0.20 refusal floor, the tier-dependent fallback split, the 3–7s cast delay and the
  2.0/1.5/1.0/0.75s click window are all already implemented correctly in
  `lib/utils/fishing.ts`. The game has a fish journal (`fishGathered.Count / fish.Count`).
- **D** — none for static content. Per-player journal state is runtime and out of scope.
- **E** — no unlock NPC, quest or tutorial.
- **Version sensitivity** — the fallback pool mechanic did not exist in 0.9.18.3, which
  used only trash-or-escape. Any fallback prose is version-bound.

### cooking

- **A** — 40 recipes with search and tier filters, 7 ovens with map links, a tier
  calculator, expandable ingredient obtainability trees.
- **B** — 14 fish inputs feed 13 recipes and the page never says so. 7 plant inputs
  likewise. Food buff id, name, level, food type, dungeon allowance and cooldown all
  exist in `items` and surface only inside hover tooltips. `result_amount` and
  per-recipe `crafting_exp` are dropped by the loader.
- **C** — success is keyed to *result quality*, not a recipe field. The oven refuses
  below 10%. Only `FoodItem` results roll for success; non-food results are guaranteed.
  **Dragonbait Stew is not a food** — it is a quality-4 general item that, used on an
  invincible Valaark in range, grants a random 60–300s vulnerability window
  (`GameManager.cs:TryUseValaarkDragonbaitStew`). It is presented as an ordinary recipe.
- **D** — per-oven recipe membership. `CraftingStation.itemsCrafting` is runtime scene
  data; the static export carries only locations and the `is_cooking_oven` flag.
- **E** — no trainer, starter recipe or unlock quest.

### alchemy

- **A** — 43 recipes across 5 tiers with search and tier filter, 7 table locations with
  map links, the 10-step Alchemist Apprentice chain, a calculator, obtainability trees.
- **B** — potion effects are stored per item (`usage_health`, `usage_mana`,
  `potion_buff_id`, `potion_buff_level`) and reach the reader only via tooltip. Recipe
  unlock provenance exists for all 43 as `item_source_entries` rows. Quest start NPC,
  predecessors and requirement arrays are dropped. Table coordinates are dropped. The 47
  distinct materials break down as 17 gathered, 13 fish, 16 drops, 8 vendor — the
  cross-profession dependency is never stated.
- **C** — the real gate is a consumable recipe token (`RecipeItem.Use` adds the name to
  `learnedRecipes`), **not** a mastery threshold. Ingredients are consumed before the
  success roll, so failure destroys them. No critical success, no refund, no yield bonus.
- **D** — none for this brief's scope.
- **E** — no canonical "first table" or intended route. Do not claim mastery unlocks
  recipes.

### scroll_mastery

- **A** — hero, 4 metric cards, "How It Works", calculator, 10 craftable scrolls with
  linked skills and scaling labels, 5 table locations.
- **B** — the DB description is overridden by hardcoded hero copy. 7 other scroll items
  exist (4 pack-granted skill scrolls, 3 repair kits) and are filtered out. Exact skill
  effect values live behind a link. `scribing_recipes.level_required` is dropped.
  Coordinates are dropped.
- **C** — all 10 recipes are level 0 and therefore always succeed. Scribing tables
  **bypass** the `learnedRecipes` filter that alchemy uses, so every recipe is visible
  immediately (`TableUI.cs:121-144`). Mastery proc is
  `Lerp(0.9, 0.02, mastery²)`; crafting grants `Random(5,10)/10000` and *using* a scroll
  grants `Random(10,20)/10000`. Crafting XP is `playerLevel × 100`.
- **D** — `MonsterScrollItem` payloads, if any item uses that class. No current DB row
  proves one does.
- **E** — do not call `summon_triggers` "summon scrolls"; they are kill-placeholder world
  events, a different system.

### hunter

- **A** — 6 targets with level ranges, a two-slider calculator.
- **B** — 269 spawn rows across 8 zones with coordinates. `item_sources_monster` rows for
  all 6 targets with drop rates. Monster lore, skills and faction effects.
- **C** — **the discriminator**: only `isHunt` kills advance Hunter
  (`Monster.cs:2527-2539`). Mastery raises the drop probability of quality-positive items
  on hunt kills by `level/2` — the actual reward, and it is absent. Credit goes to the
  highest-aggro player. The game has a hunting journal with per-target kill counts that
  reveals a target only after its first kill (`UIJournal.cs:305-341`).
- **D** — per-player kill counts are runtime save data, out of scope for a static site.
- **E** — no trainer, unlock, tool or station. Do not invent a skinning mechanic.
- **Conflict** — the calculator's monster-level slider goes to 60 while the highest hunt
  target is 51.

### slayer

- **A** — 143 boss/elite rows with level, respawn fields, special-spawn provenance and
  one zone each. The database has map coordinates for 130 targets; 13 Temple of Valaark
  targets have only a zone.
- **B** — 2,555 `item_sources_monster` rows across 142 targets, 143 structured spawn
  rows, monster skills and 34 quests targeting 35 Slayer monsters. The item-source rates
  are configured rolls, not final boss-loot probabilities: bosses guarantee equipment and
  a dungeon luck token can raise that guarantee from one item to two
  (`Monster.cs:OnDeath`).
- **C** — **the discriminator**: only `isBoss || isElite` advances Slayer, with zero
  overlap against the 6 hunt targets. Mastery is **account-wide**, recomputed as
  `Σ 0.0002 × min(50, kills)` per distinct target
  (`Database.cs:CalculateSlayerLevelForAccount`). Its payoff is no reduction below 10%
  mastery, then `ceil(incoming damage × mastery × 0.1)` damage removed at 10% mastery or
  higher, up to a nominal 10% reduction at full mastery (`Combat.cs:DealDamageAt`). It
  applies to the player and their pet when a boss or elite deals the damage.
- **D** — current-character Bestiary kills and account-wide progress are runtime save
  data. Encountering a target discovers it with zero kills. A kill credits every nearby
  party member, but only the first 50 account kills per distinct target increase Slayer
  (`Player.cs:UserCode_TargetRpcUpdateKillsBestiary__String`, `Monster.cs:OnDeath`).
- **E** — no trainer, unlock, tool, station, race or class exception. At 100%, Slayer
  unlocks `SLAYER_MASTER`. Nine named targets and one five-world-boss set unlock further
  achievements, but those target relationships are not structured in the current schema.
- **Resolved defect** — the loader now selects `is_fabled`; all 9 fabled bosses retain
  their distinct presentation.
- **Respawn caveat** — the first post-kill spawn check occurs after `death_time +
  respawn_time`. A failed probabilistic check retries after another `respawn_time`, and
  time-window targets can wait longer. The existing page displays only `respawn_time`.
- **Version sensitivity** — Slayer changed from a per-character `+0.0002` per kill in
  0.9.21 to the current account-wide capped formula.

### adventuring

- **A** — hero, 4 metric cards, "How It Works", a 22-quest table with a deterministic
  daily-queue simulation reimplementing the game's seeded shuffle, class reward selector,
  date controls, UTC reset countdown, vendor unlock cards, taskgiver and vendor NPC cards.
  The only page that explains its loop end to end.
- **B** — quest `rewards` JSON carries gold and exp; the loader uses exp only to derive
  the mastery increment and returns neither. Vendor `items_sold` payloads carry price and
  faction fields; only currency name is extracted. `level_required` versus
  `level_recommended` is not distinguished.
- **C** — the daily queue is a Fisher–Yates shuffle seeded by `DateTime.UtcNow.DayOfYear`.
  **The discriminator**: mastery comes only from completing a quest flagged
  `adventurerQuest`, as `rewardExperience × 5e-08` — a kill objective does not grant
  Hunter or Slayer credit. Adventurer completion explicitly bypasses the generic faction
  reward branch. The payoff is vendor access.
- **D** — per-character 24-hour cooldown state is runtime.
- **E** — no trainer beyond the guild; no non-quest mastery path.
- **Ambiguity** — the daily queue seed (UTC day boundary) and the completion cooldown
  (rolling 24h from completion) are two different clocks; the prose can read as one.

### exploring

- **A** — all 46 trigger rows with parent zone, dungeon flag, derived monster level range
  and discovery XP. The checklist is already complete; only its presentation is thin.
- **B** — trigger coordinates and bounds, `is_outdoor`, environment hazard skill. Parent
  zone description, required level and weather. No map action exists per row.
- **C** — discovery grants 25 XP, 150 for a dungeon, 10 for the five named cities. The
  achievement threshold is `>= 0.9999`.
- **D** — none for content. A per-trigger map deep link needs a `zone_trigger` entity type
  in `MapLink`, which is website work, not extraction.
- **E** — Old Valorath is a zone with no trigger; its intended status is unknown. Do not
  count it.
- **Conflict, resolved** — the denominator is **46**. `professions.tracking_denominator`
  says 45, `static_data.json` says 38 (last verified 2025-11-25, stale), and the index
  loader overrides with `COUNT(*) FROM zone_triggers` = 46, which matches the live
  `zonesDiscovered.Count / 46` in `UIProfessions.cs:209-216`. The metadata is stale; the
  override is accidentally correct.

### lore_keeping

- **A** — 17 books with stat gains, a source summary, expandable obtainability trees and
  the full lore text. Substantively the best of the middle generation.
- **B** — drop rates, level gates and complete source lists are compressed to the first
  match. No map action for any book, component, source monster or quest.
- **C** — reading a book applies its six stat gains permanently and consumes it; progress
  is `books.Count / 17`.
- **D** — none. All lore text is already exported.
- **E** — there is no defensible 13-book subset. Do not drop four books to make the stale
  metadata true.
- **Conflict, resolved** — the denominator is **17**. The DB and `static_data.json` say
  13; the live UI, the learn handler and the actual item count all say 17. Historical
  snapshots show 16 in 0.9.14 and 17 by 0.9.16, so 13 predates both.
- **Game bug worth noting** — the learn handler wraps its progress message and achievement
  call in `if (books.Count < 17)`, so the 17th book never triggers that branch; only
  opening the profession panel awards the achievement.

### treasure_hunter

- **A** — hero, 4 metric cards, "How It Works", a simulated relic calculator, 9 dig sites
  each with an exact map link.
- **B** — 122 monster sources for Random Map with drop rates. The 8 random outcomes at
  0.125 each. 21 non-relic chest rewards, filtered out entirely. Clue images
  (`items.treasure_map_image_location`) exist and are unused. The quest-only Red Scabbard
  route is not distinguished.
- **C** — digging needs a matching map, a Shovel-category weapon and a free slot; success
  consumes the map and adds exactly 0.005, so 200 digs cap the profession. Mastery raises
  relic rolls by `level × 0.1` in Buried Treasure Chests **only**.
- **D** — none.
- **E** — map quality does not affect reward quality. Luck tokens are a boss-loot
  mechanic with no treasure interaction; do not connect them.

## Cross-cutting data findings

- **The citation checker cannot catch a wrong claim.** `uv run compendium citations
  check` reports all 436 targets verified while the herbalism formula is wrong and its
  citation range points at the alchemy function. The checker hashes the *cited region's
  bytes* and detects that the region changed; it cannot detect that the region no longer
  contains the function the claim describes, nor that the transcription was wrong to
  begin with. Any mechanic held as a hand-transcribed literal is exposed to this class of
  error, and green citations are not evidence of correctness.
- **`pnpm check:citations` is a root script**, not a website script, though
  `website/AGENTS.md` documents the repository-root ledger boundary. The `lefthook.yml`
  `citations-check` job invokes it correctly and skips when `server-scripts/` is absent.
- **`static_data.json` must not be loaded as-is.** It is manually maintained, last
  verified 2025-11-25, and its profession block contradicts current code in at least four
  places: alchemy tier 1 (`0.5 + 5×` vs current `0.4 + 2×`), herbalism tier 1
  (`0.5 + 2.5×` vs current `0.3 + 2×`), radiant seeker (`level × 0.05` vs current
  `0.05 + level × 0.2`) and exploring (38 vs 46). Re-verify each value against
  `server-scripts/` before any loader work.
- **`game_config.json` is exported and dropped entirely.** `GameConfigExporter.cs` emits
  `bestiary_monsters`, `mounts`, `seasonal_items` and `special_items`; no loader reads it.
- **`gather_items.json` drops fields**: `gold_min`, `gold_max`, `random_drops`,
  `chest_reward_probability`, `chest_interaction_messages` have no DB columns.
- **`crafting_recipes.station_type` collapses every non-cooking station to `unknown`**
  (`CraftingRecipeExporter.cs:93-103`), losing profession association for forge recipes.
- **No profession, resource or recipe imagery exists.** `visual_assets` covers only items,
  skills, NPCs and monsters. `professions.icon_path` holds sprite names like
  `profession_alchemy` with no corresponding files, and the index uses an unrelated
  inline Lucide map. Any icon design must assume Lucide, not game art.
- **`ProfessionExporter.cs` hardcodes all 13 rows** and reads only the rendered UI sprite.
  There is no authoritative profession config object being read.

## Live measurements

Measured in-browser at 1440×900 and 390×844 against the dev server.

| Page | Desktop height | Mobile height | Mobile px to first data row |
| --- | ---: | ---: | ---: |
| mining | 1034 | 1162 | 455 |
| hunter | 900 | 908 | 527 |
| radiant_seeker | 900 | 844 | 543 |
| alchemy | 4048 | 4200 | 317 |
| scroll_mastery | 2328 | 3190 | 1968 |
| adventuring | 3238 | 5434 | 2094 |
| treasure_hunter | 2090 | 3132 | 2113 |
| fishing | 6808 | 10560 | 3095 |

The newest generation moves the first real fact from roughly 0.5 mobile screens to
2.3–3.7. The hero panel alone occupies 638–722px of an 844px mobile viewport.

Horizontal overflow at 390px, counted as elements extending past the viewport: slayer
1638, alchemy 863, fishing 842, cooking 528. `lore_keeping` produces 54 independent
scroll containers on mobile.

No profession page uses `PageSections`, the shared jump-list already used by the
mechanics and skill pages — including fishing at 12.5 mobile screens and 8 sections.
