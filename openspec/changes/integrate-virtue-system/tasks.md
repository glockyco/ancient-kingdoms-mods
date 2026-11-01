# Tasks

## 1. Runtime facts

- [x] 1.1 List every `VirtueShrine` in the World scene with its virtue and position, and check that `VirtueText`'s table, `VirtueRules.Thresholds`, `TitleEnglish`, `HumilityMultiplier` and the `VirtueEncounters` point fields are readable from the interop assembly. Verify that `observations.md` in this change records the shrines and which reads work.
- [ ] 1.2 In the same kind of session, activate each blessing on a scratch character and record what the character window shows before and after (Armor Class and resists for Humility, maximum Health for Sacrifice, Accuracy for Honor), the remaining time, a renewal, the Sacrifice refusal below rank 5 and the Honesty refusal with pending returns. Check each rule the pages state against the game, including a stranded adventurer's level and Health in one dungeon and an Honor fight's points. Verify that `observations.md` records each value next to the code that produces it.

## 2. Export

- [x] 2.1 Add the virtue models and `VirtueExporter`, register `virtues.json` in `CreateCatalog`, and cover the model contract in `tests/DataExporter.Tests`. Verify with a real export that the session manifest lists `virtues.json` with six virtues, six ranks each, and English titles and effect texts.
- [x] 2.2 Capture shrines in `ConfiguredWorldSnapshot`, add `VirtueShrineExporter` for `virtue_shrines.json`, register it, and test the placement identifier. Verify that the export lists every shrine from task 1.1 with its virtue and zone.
- [x] 2.3 Declare the two outputs in their `CreateCatalog` descriptors, which is where the export's outputs are listed. Verify that a run refuses promotion without them.

## 3. Pipeline

- [x] 3.1 Add `virtues`, `virtue_ranks` and `virtue_shrines` to the schema, models, loaders and loader catalog, with tests. Verify that `uv run compendium build` loads every exported virtue, rank and shrine and that `uv run pytest` passes.
- [x] 3.2 Name `compassion_escort` under `[entities.exclude]` with its reason, and declare the virtue references for the redaction graph. Verify that `compendium redactions check` reports the escort and nothing unexplained, and that the database has no `compassion_escort` row.
- [x] 3.3 Write each shrine's 240 by 135 yd map crop with the zone thumbnails' crop function, beside the zone artwork. Verify that each crop matches the live map at the shrine.

## 4. Rules module

- [ ] 4.1 Add `website/src/lib/calculation/virtues.ts` with each virtue's per-rank effect, the combat points, Honor's points from `VirtueRules.HonorPoints` and the 0.10.2.1 fight settlement (Health against the level curve, ×2 for elites, ×3 for bosses, less for additional normal foes), Valor eligibility, the Sacrifice item value and offering formula, and the escort's level and Health from `VirtueEscortStats.TryForDungeon`, each with a `Source:` citation, and unit tests for rank 0, rank 5, the level window, an Honor fight with an add, the rounding of an offering and an escort median. Verify that the tests pass and `citations check` passes.
- [ ] 4.2 Add a database test that compares the module's per-rank percentages and the exported Humility multipliers with the numbers in every exported effect text. Verify that it passes, and fails when one literal is changed.

## 5. Virtues page

- [x] 5.1 Compare the page's structure and wording in Plannotator under `skill://compare-options`, with drafts on real data. Verify that the answer is recorded in the project note and in this change.
- [ ] 5.2 Build `/mechanics/virtues` as design decision 5 describes: the intro, the four facts, the virtue tiles as tabs opened by the hash, each virtue's shrine cards, ways to earn, rules and rank cards, the Valor quarries for a level entered on the page, Compassion's stranded adventurers and the Sacrifice calculator, and register it in the mechanics index. Verify the page in a browser at phone and desktop widths, including the quarries at levels 1, 40 and 50 and a calculator result.
- [ ] 5.3 Map the eight Virtues guide articles in `coverage.ts` with their reviewed digests. Verify that `coverage.db.test.ts` passes and that site search opens each article's section.

## 6. Shrines on the map

- [ ] 6.1 Add the `virtue_shrine` entity family, the `shrines` marker group with the pink temple glyph shown by default, its popup with the blessing's strongest effect, and the map and site search documents. Verify in a browser that each shrine shows, its popup opens its virtue's section, and searching "Shrine of Valor" opens it.

## 7. Blessing skill pages

- [ ] 7.1 Load the virtue for a Blessing skill page and render the "Granted by" card and the rank table, hiding the skill rank and the rank-learning link. Verify in a browser on all six Blessing pages.
- [ ] 7.2 Add the six Blessing summaries to `formatSkillEffect` and to the Pocket Compendium port, and regenerate the skill-effect parity corpus. Verify that `dotnet test tests/PocketCompendium.Tests` and the website tests pass.

## 8. Virtues on other pages

- [ ] 8.1 Add the shared helper that names a virtue and links its section. Verify with a unit test.
- [ ] 8.2 Show Honor points among a monster's combat stats, the Sacrifice value on equipment pages that an offering takes, and the Stranded Adventurer section on dungeon pages, each linking to its virtue. Verify in a browser on Troll King Grimlok, a Common and an Uncommon item, and Trolls Cave.
- [ ] 8.3 Name Valor in the combat damage order and for damage shields, parry and damage over time, and Compassion for heal on hit, lifetap and other healing a player receives, after checking each statement against the code. Verify the combat page and the affected skill pages in a browser and that `citations check` passes.
- [ ] 8.4 Name Sacrifice for maximum Health, Humility for Armor Class and resistances, and Honor for Accuracy and Critical Resist on the character page and the stat components. Verify in a browser.
- [ ] 8.5 Correct the reputation page's statement that a gain is added unchanged, name Honesty on the reputation page, the monster, NPC and quest gains and petting, and offer Honesty and its rank under each reputation calculation's "Use your numbers". Verify with calculation tests at Honesty rank 0 and 5, including the game's rounding, and in a browser.
- [ ] 8.6 State on the inventory page that lost belongings cannot go into the bank or a house chest and that Auto Stack skips them. Verify in a browser.
- [ ] 8.7 Compare the wording of the notes from tasks 8.3 to 8.6 in Plannotator. Verify that the answer is applied and recorded.

## 9. Publication

- [ ] 9.1 Regenerate the home counts, commit the redaction ledger, and set `COMPENDIUM_VERSION` to 0.10.2.1. Verify that `citations check`, `redactions check` and the guide coverage test pass.
- [ ] 9.2 Run the release checks in `CONTRIBUTING.md` and look at the built site in a browser: the Virtues page, the map shrines, a Blessing page, the home banner and the changed mechanics pages. Verify that every check passes and no claim recorded in the citation reconciliation is still false.

## Workflow follow-up

- Deploy the site after an explicit request.
- Archive the change after the deploy.
