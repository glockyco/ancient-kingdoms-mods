# Tasks

## 1. Runtime facts

- [x] 1.1 List every `VirtueShrine` in the World scene with its virtue and position, and check that `VirtueText`'s table, `VirtueRules.Thresholds`, `TitleEnglish`, `HumilityMultiplier` and the `VirtueEncounters` point fields are readable from the interop assembly. Verify that `observations.md` in this change records the shrines and which reads work.
- [ ] 1.2 In the same kind of session, activate each blessing on a scratch character and record what the character window shows before and after (Armor Class and resists for Humility, maximum Health for Sacrifice, Accuracy for Honor), the remaining time, a renewal, the Sacrifice refusal below rank 5 and the Honesty refusal with pending returns. Verify that `observations.md` records each value next to the code that produces it.

## 2. Export

- [x] 2.1 Add the virtue models and `VirtueExporter`, register `virtues.json` in `CreateCatalog`, and cover the model contract in `tests/DataExporter.Tests`. Verify with a real export that the session manifest lists `virtues.json` with six virtues, six ranks each, and English titles and effect texts.
- [x] 2.2 Capture shrines in `ConfiguredWorldSnapshot`, add `VirtueShrineExporter` for `virtue_shrines.json`, register it, and test the placement identifier. Verify that the export lists every shrine from task 1.1 with its virtue and zone.
- [x] 2.3 Declare the two outputs in their `CreateCatalog` descriptors, which is where the export's outputs are listed. Verify that a run refuses promotion without them.

## 3. Pipeline

- [ ] 3.1 Add `virtues`, `virtue_ranks` and `virtue_shrines` to the schema, models, loaders and loader catalog, with tests. Verify that `uv run compendium build` loads every exported virtue, rank and shrine and that `uv run pytest` passes.
- [ ] 3.2 Name `compassion_escort` under `[entities.exclude]` with its reason, and add the shrine family to the search keywords and redaction references where map-only families are listed. Verify that `compendium redactions check` reports the escort and nothing unexplained, and that the database has no `compassion_escort` row.

## 4. Rules module

- [ ] 4.1 Add `website/src/lib/calculation/virtues.ts` with each virtue's per-rank effect, the combat points, Honor's points from `VirtueRules.HonorPoints` and the 0.10.2.1 fight settlement (Health against the level curve, ×2 for elites, ×3 for bosses, less for additional normal foes), Valor eligibility and the Sacrifice formula, each with a `Source:` citation, and unit tests for rank 0, rank 5, the level window, an Honor fight with an add and the rounding of an offering. Verify that the tests pass and `citations check` passes.
- [ ] 4.2 Add a database test that compares the module's per-rank percentages and the exported Humility multipliers with the numbers in every exported effect text. Verify that it passes, and fails when one literal is changed.

## 5. Virtues page

- [ ] 5.1 Compare the page's structure and wording in Plannotator under `skill://compare-options`, with drafts on real data. Verify that the answer is recorded in the project note and in this change.
- [ ] 5.2 Build `/mechanics/virtues` with its eight sections, the Valor quarry list on the remembered `level` input and the Sacrifice calculator, and register it in the mechanics index. Verify the page in a browser at phone and desktop widths, including the list at levels 1, 40 and 50 and a calculator result.
- [ ] 5.3 Map the eight Virtues guide articles in `coverage.ts` with their reviewed digests. Verify that `coverage.db.test.ts` passes and that site search opens each article's section.

## 6. Shrines on the map

- [ ] 6.1 Add the `virtue_shrine` entity family, the `shrines` marker group, its popup and the map and site search documents, with the marker presentation chosen in a Plannotator comparison. Verify in a browser that each shrine shows, its popup links to its virtue's section, and searching "Shrine of Valor" opens it.

## 7. Blessing skill pages

- [ ] 7.1 Load the virtue for a Blessing skill page and render the "Granted by" card and the rank table, hiding the skill rank and the rank-learning link. Verify in a browser on all six Blessing pages.
- [ ] 7.2 Add the six Blessing summaries to `formatSkillEffect` and to the Pocket Compendium port, and regenerate the skill-effect parity corpus. Verify that `dotnet test tests/PocketCompendium.Tests` and the website tests pass.

## 8. Blessings on other pages

- [ ] 8.1 Add the shared helper that names a virtue and links its section, and the remembered active-blessing and rank inputs. Verify with unit tests that the inputs default to none and apply the module's effects.
- [ ] 8.2 Name Valor in the combat damage order and for damage shields, parry and damage over time, and Compassion for heal on hit, lifetap and other healing a player receives, after checking each statement against the code. Apply the inputs to the received-healing calculations. Verify the combat page and the affected skill pages in a browser and that `citations check` passes.
- [ ] 8.3 Name Sacrifice for maximum Health, Humility for Armor Class and resistances, and Honor for Accuracy and Critical Resist on the character page and the stat components. Verify in a browser.
- [ ] 8.4 Correct the reputation page's statement that a gain is added unchanged, name Honesty on the reputation page, the monster, NPC and quest gains and petting, and apply the inputs to the reputation calculations. Verify with calculation tests at Honesty rank 0 and 5, including the game's rounding, and in a browser.
- [ ] 8.5 State on the inventory page that lost belongings cannot go into the bank or a house chest and that Auto Stack skips them. Verify in a browser.
- [ ] 8.6 Compare the wording of the blessing notes from tasks 8.2 to 8.5 in Plannotator. Verify that the answer is applied and recorded.

## 9. Publication

- [ ] 9.1 Regenerate the home counts, commit the redaction ledger, and set `COMPENDIUM_VERSION` to 0.10.2.1. Verify that `citations check`, `redactions check` and the guide coverage test pass.
- [ ] 9.2 Run the release checks in `CONTRIBUTING.md` and look at the built site in a browser: the Virtues page, the map shrines, a Blessing page, the home banner and the changed mechanics pages. Verify that every check passes and no claim recorded in the citation reconciliation is still false.

## Workflow follow-up

- Deploy the site after an explicit request.
- Archive the change after the deploy.
