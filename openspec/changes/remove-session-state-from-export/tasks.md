## 1. Establish the facts the rules rest on

- [x] 1.1 Enumerate every player-conditional decoration in the item tooltip pipeline by reading `ScriptableItem`, `UsableItem`, `EquipmentItem` and `WeaponItem` in `server-scripts/`, and record the complete set with file and line, so the removal is not inferred from the two decorations the comparison happened to expose
- [x] 1.2 Count how many exported entities take the composite branch and how many take the root-renderer branch, and how many would fail under a structural rule, so the empty-composite failure is a measured decision
- [x] 1.3 Confirm against the running game that `monster.startPosition` and `npc.startPosition` are non-zero for a sample of placed actors, and that they equal the live transform for an actor that has not moved

## 2. Publish the point the game placed a spawn at

- [x] 2.1 Read the spawn position for a monster from `startPosition` in `MonsterExporter.cs`, and derive the row's zone from that same point rather than from the live transform
- [x] 2.2 Read the spawn position for an NPC from `startPosition` in `NpcExporter.cs`, and derive its zone from that same point
- [x] 2.3 Read the transform when `startPosition` is the zero vector, because the capture has not run and an actor that has not started has not moved, and record why in a comment: `Npc` captures in `Start`, which does not run while its zone is inactive
- [x] 2.4 Publish the follow origin the game settles on: `Npc.Start` fills an unset origin from the start position, so publish the placed point while the field is zero and preserve the field after the game fills it; no NPC holds a distinct authored origin
- [x] 2.5 Leave the patrol waypoints as they are, because they are authored and no lifecycle method assigns them

## 3. Publish a tooltip that describes the item

- [x] 3.1 Put the removal of player-conditional decoration in its own type in `mods/DataExporter/`, taking a rendered tooltip and returning the item's description, so it can be tested without the game
- [x] 3.2 Remove the emphasis on a required level and on a required class, covering every decoration task 1.1 recorded
- [x] 3.3 Apply it at the single call site in `ItemExporter.cs` and confirm no other exporter reads a rendered tooltip: `QuestExporter.cs:62-63` and `SkillExporter.cs:99` read raw template fields and must stay untouched
- [x] 3.4 Replace a Gate Scroll's rendered bind-point zone with the generic localized bind-point label, and leave fixed travel destinations unchanged
- [ ] 3.5 Replace a fragment's rendered owned-count progress with plain `0 / amountNeeded`, and leave non-fragment count markup unchanged

## 4. Read the field no lifecycle method assigns

- [x] 4.1 Read the gather item name from `gatherItem.name` in `GatherItemExporter.cs`, and stop reading `nameGatherItem`, which `GatherItem.Start` overwrites
- [x] 4.2 Record in a comment that the identifier already reads this field, which is why identifiers were stable while names were not

## 5. Choose the visual asset source by structure

- [x] 5.1 Put the branch choice in one helper that decides on the presence of a `Front` child, and use it from `MonsterExporter.cs`, `NpcExporter.cs` and `BaseExporter.ExportEntitySprite`, which disagree about the order today
- [x] 5.2 Record the source name the structure selects, so a root-only entity is no longer recorded as `Front.SpriteRenderers` naming a child it does not have
- [x] 5.3 Remove the now-unreachable activation test and `front ?? root` fallback from `VisualAssetRendererSelector.cs`, since the selector only ever receives a `Front` subtree
- [x] 5.4 Keep an initialized scene instance for a `Front` composite; for a root renderer, prefer the canonical template and sample time zero when a live animator can advance
- [x] 5.5 Sample time zero on an active initialized scene source before reading a `Front` composite, so its appearance stays and its current frame does not

## 6. Declare the session state

- [x] 6.1 Record the selected locale in the export manifest that `game_config.json` carries
- [x] 6.2 Fail the pipeline build when the recorded locale is not the one the published data assumes, naming both
- [x] 6.3 Fail the pipeline build when an export carries no recorded locale, rather than assuming the expected one

## 7. Test

- [x] 7.1 Add a `DataExporter.Tests` test that a tooltip whose required level is emphasised and the same tooltip without the emphasis both export to the same value
- [x] 7.2 Add a `DataExporter.Tests` test for the required-class emphasis, and one per decoration task 1.1 found beyond the two
- [x] 7.3 Add a `DataExporter.Tests` test that the removal leaves every other tag in the tooltip untouched, including a colour that is not player-conditional
- [x] 7.4 Add a pipeline test that a build fails on an unexpected recorded locale and on a missing one, and passes on the expected one
- [x] 7.5 Run `dotnet test tests/DataExporter.Tests`, then the pipeline tests, `uv run mypy .` and `uv run ruff check .`
- [x] 7.6 Add a `DataExporter.Tests` test that two rendered Gate Scroll tooltips with different bind-point zones normalize to the same generic tooltip
- [ ] 7.7 Add a `DataExporter.Tests` test that incomplete and complete fragment progress normalize to the same plain `0 / amountNeeded` baseline

## 8. Verify against the game

- [ ] 8.1 Build and deploy the mods, then export
- [ ] 8.2 Export a second time from the same game build and confirm every file is byte-identical, including the published image set
- [ ] 8.3 Confirm the corrected values are the expected ones: 240 tooltips lose their colour markup, the Gate Scroll names the generic bind point, one fragment states plain `0 / 5`, 14 gather item names take the object name, 12 positions move, one NPC image takes its structural source, and animated sources take their initial frame
- [ ] 8.4 Rebuild the database, run `uv run compendium redactions check`, and confirm the ledger is unchanged because no corrected position is in an excluded zone
- [ ] 8.5 Rebuild the website and confirm in a browser that the fragment states `0 / 5`, an item tooltip renders without red requirement text, a corrected spawn appears on the map, and the replaced NPC image renders
- [x] 8.6 Record the two-export comparison in the release procedure, since it needs the game twice and cannot run in CI
