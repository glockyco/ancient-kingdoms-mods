## 1. Establish the facts the rules rest on

- [ ] 1.1 Enumerate every player-conditional decoration in the item tooltip pipeline by reading `ScriptableItem`, `UsableItem`, `EquipmentItem` and `WeaponItem` in `server-scripts/`, and record the complete set with file and line, so the removal is not inferred from the two decorations the comparison happened to expose
- [ ] 1.2 Count how many exported entities take the composite branch and how many take the root-renderer branch, and how many would fail under a structural rule, so the empty-composite failure is a measured decision
- [ ] 1.3 Confirm against the running game that `monster.startPosition` and `npc.startPosition` are non-zero for a sample of placed actors, and that they equal the live transform for an actor that has not moved

## 2. Publish the point the game placed a spawn at

- [ ] 2.1 Read the spawn position for a monster from `startPosition` in `MonsterExporter.cs`, and derive the row's zone from that same point rather than from the live transform
- [ ] 2.2 Read the spawn position for an NPC from `startPosition` in `NpcExporter.cs`, and derive its zone from that same point
- [ ] 2.3 Fail the export, naming the entity, when a placed actor's `startPosition` is the zero vector, rather than publishing it
- [ ] 2.4 Leave patrol waypoints and `origin_follow_position` as they are, and record why in a comment: they are authored fields and were identical across both exports

## 3. Publish a tooltip that describes the item

- [ ] 3.1 Put the removal of player-conditional decoration in its own type in `mods/DataExporter/`, taking a rendered tooltip and returning the item's description, so it can be tested without the game
- [ ] 3.2 Remove the emphasis on a required level and on a required class, covering every decoration task 1.1 recorded
- [ ] 3.3 Apply it at the single call site in `ItemExporter.cs` and confirm no other exporter reads a rendered tooltip: `QuestExporter.cs:62-63` and `SkillExporter.cs:99` read raw template fields and must stay untouched

## 4. Read the field no lifecycle method assigns

- [ ] 4.1 Read the gather item name from `gatherItem.name` in `GatherItemExporter.cs`, and stop reading `nameGatherItem`, which `GatherItem.Start` overwrites
- [ ] 4.2 Record in a comment that the identifier already reads this field, which is why identifiers were stable while names were not

## 5. Choose the visual asset source by structure

- [ ] 5.1 Decide the composite or root-renderer branch on the presence of a `Front` child rather than on whether `ExportComposite` returned null, in `NpcExporter.cs` and `MonsterExporter.cs`
- [ ] 5.2 Fail the export, naming the entity, when the structure selects the composite and no renderer under it has a sprite
- [ ] 5.3 Apply the outcome of task 1.2: if entities legitimately carry a spriteless `Front` rig, narrow the structural test and record the measurement that forced it

## 6. Declare the session state

- [ ] 6.1 Record the selected locale in the export manifest that `game_config.json` carries
- [ ] 6.2 Fail the pipeline build when the recorded locale is not the one the published data assumes, naming both
- [ ] 6.3 Fail the pipeline build when an export carries no recorded locale, rather than assuming the expected one

## 7. Test

- [ ] 7.1 Add a `DataExporter.Tests` test that a tooltip whose required level is emphasised and the same tooltip without the emphasis both export to the same value
- [ ] 7.2 Add a `DataExporter.Tests` test for the required-class emphasis, and one per decoration task 1.1 found beyond the two
- [ ] 7.3 Add a `DataExporter.Tests` test that the removal leaves every other tag in the tooltip untouched, including a colour that is not player-conditional
- [ ] 7.4 Add a pipeline test that a build fails on an unexpected recorded locale and on a missing one, and passes on the expected one
- [ ] 7.5 Run `dotnet test tests/DataExporter.Tests`, then the pipeline tests, `uv run mypy .` and `uv run ruff check .`

## 8. Verify against the game

- [ ] 8.1 Build and deploy the mods, then export
- [ ] 8.2 Export a second time from the same game build and confirm every file is byte-identical, including the published image set
- [ ] 8.3 Confirm the corrected values are the expected ones: 240 tooltips lose their colour markup, 14 gather item names take the object name, 12 positions move, and one image is replaced
- [ ] 8.4 Rebuild the database, run `uv run compendium redactions check`, and confirm the ledger is unchanged because no corrected position is in an excluded zone
- [ ] 8.5 Rebuild the website and confirm in a browser that an item tooltip renders without red requirement text, that a corrected spawn appears on the map, and that the replaced NPC image renders
- [ ] 8.6 Record the two-export comparison in the release procedure, since it needs the game twice and cannot run in CI
