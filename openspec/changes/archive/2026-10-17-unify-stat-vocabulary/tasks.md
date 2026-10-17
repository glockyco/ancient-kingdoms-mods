## 1. Read the names and settle the wording

- [x] 1.1 With HotRepl in the English locale, record what `ScriptableItem.LocalizedStatLabel` returns for each of its inputs, and find how each character window title gets its text: from a localization table or from the window itself. Verify the result names a source for every title in the wording table, including Mana Regeneration. Every label returns its input unchanged. Every window title except HP is bound to a `Localization_String_Table` key or set by code from one. HP is fixed text.
- [x] 1.2 Get approval of "Wording" in `design.md`, including the pool names. Record the decision in `design.md`. No page changes before this task is done.

## 2. Export the catalogue

- [x] 2.1 Add `StatCatalog` to `mods/DataExporter` with the ids, field mappings, modifier kinds, value types, display formats and cited clamps from `design.md`. Make it reference the item and skill export model properties with `nameof`. Verify with a `DataExporter.Tests` check that every numeric stat property of those models maps to exactly one entry, and that a missing or duplicate mapping fails and names the field. The check covers all four export models, and synthetic catalogues with a missing mapping, a duplicate, an unknown property and an unknown per-point stat each fail and name the field.
- [x] 2.2 Add `StatExporter`, registered through the export session descriptors, which writes `stats.json` with the names read at runtime. Verify in a real `build-tool export` that `stats.json` holds every catalogue entry with the names task 1.1 recorded, and that `items.json` and `skills.json` are unchanged. All 32 entries carry the approved names, and every other file of the session has the same digest as in the previous session.

## 3. Load and generate

- [x] 3.1 Load `stats.json` into `stats` and `stat_fields` through the pipeline's dataset catalog. Fail the build when an exported item or skill stat key has no `stat_fields` row. Verify with a focused loader test and a full `compendium build`. The check also covers class and pet fields, and reads the raw export.
- [x] 3.2 Make `build-pipeline/src/compendium/denormalizers/items/tooltips.py` read attribute names from `stats`, and delete its `STAT_DISPLAY_NAMES`. Verify that the set bonus lines of every armor set tooltip are unchanged. All 495 set bonus lines in 120 tooltips are unchanged.
- [x] 3.3 Add a `prebuild` generator for `website/src/lib/generated/stat-vocabulary.ts`, and commit its output. Verify that `pnpm --filter website check` and knip pass in a checkout without the database.

## 4. Migrate the website

Each task deletes the copies it replaces. Each is checked in Chromium at 1440×900 and 390×844 against the approved wording.

- [x] 4.1 Add `formatStat`, and make `formatPercent` and `formatNumber` single shared functions. Delete the local formatters in `routes/npcs/[id]`, `routes/monsters`, `routes/quests/[id]`, `routes/professions/adventuring`, `routes/professions/fishing`, `routes/professions/treasure_hunter`, `lib/utils/formatSkillEffect.ts` and `lib/skills/skill-format.ts`. Pages that show chances pass their current precision. Verify that those pages show the same numbers as before. The prerender comparison shows the same text on every page except 17 skill pages, whose negative values now use the true minus sign.
- [x] 4.2 Items: migrate `lib/terminology.ts` stat names, `lib/constants/stats.ts`, `lib/constants/items.ts` and the duplicated SQL literal in `lib/queries/item-stats.ts`, the item page's `percentageStats`, the data table stat panel and `lib/server/meta-description.ts`. Make the item list show fractions as percentages. Verify a Critical Chance item on the item list shows 5%, not 0.05. `terminology.ts` is deleted, and Azuremantle Robe shows 5% in the item list at both sizes.
- [x] 4.3 Skills: migrate `lib/skills/skill-scaling.ts`, `lib/skills/effect-calculations.ts`, the stat phrases of `lib/utils/formatSkillEffect.ts`, `lib/skills/skill-facts.ts`, the hand-written stat labels of `routes/skills/[id]/+page.svelte` and the stat fields of `routes/professions/scroll_mastery/+page.server.ts`. Verify a buff page, a debuff page and the scroll mastery page. Fortitude, Venom of the Grave and Scroll Mastery passed at both sizes.
- [x] 4.4 Monsters, NPCs, pets and mercenaries: migrate `lib/queries/pets.server.ts` and `lib/types/pets.ts`, `routes/monsters/+page.svelte`, `routes/npcs/[id]/+page.svelte`, `lib/components/EntityCombatSummary.svelte`, `lib/components/MercenaryDetail.svelte` and `routes/mechanics/mercenary-stats/+page.svelte`. Make `lib/utils/monster-stats.ts` and `lib/calculation/combat.ts` read the block cap and the block gain per Armor Class point from the catalogue. Verify a monster, an NPC, a pet and a mercenary page. Valaark, Astral Projection, Bear, the Necromancer mercenary and the mercenary stat ranges passed at both sizes.
- [x] 4.5 Calculators: make `lib/calculation/inputs.ts` map each input to a stat id for its label. Verify the remembered inputs keep their stored values. A value saved under `maxHealth` before the change fills the Blood Pact calculator, now labelled Hit Points.

## 5. Prove

- [x] 5.1 Search `website/src` and `build-pipeline/src` for stat names, percent decisions and number formatters outside the catalogue and the shared formatters. Verify none remain outside prose. The remaining `toFixed` calls round numbers, serialize coordinates or draw charts.
- [x] 5.2 Prerender the site from the same export before and after the change and compare the pages. Verify that only the approved wordings and stat formats differ. 1,672 pages changed. Their 619 distinct text changes are approved wordings or the wordings recorded under "Wording", and every changed number shows the same quantity in a new format, sign or precision.
- [x] 5.3 Update the export data contract in the `export-game-data` skill and the game update procedure with the new export file and the generated module. Verify the documentation checks pass.
