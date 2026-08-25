## 1. Establish the facts the rules rest on

- [x] 1.1 Enumerate every player-conditional decoration in the item tooltip pipeline by reading `ScriptableItem`, `UsableItem`, `EquipmentItem` and `WeaponItem` in `server-scripts/`, and record the complete set with file and line, so the removal is not inferred from the two decorations the comparison happened to expose
- [x] 1.2 Count how many exported entities take the composite branch and how many take the root-renderer branch, and how many would fail under a structural rule, so the empty-composite failure is a measured decision
- [x] 1.3 Confirm against the running game that `monster.startPosition` and `npc.startPosition` are non-zero for a sample of placed actors, and that they equal the live transform for an actor that has not moved

## 2. Publish the point the game placed a spawn at

- [x] 2.1 Read the spawn position for a monster from `startPosition` in `MonsterExporter.cs`, and derive the row's zone from that same point rather than from the live transform
- [x] 2.2 Read the spawn position for an NPC from `startPosition` in `NpcExporter.cs`, and derive its zone from that same point
- [x] 2.3 Read the transform when `startPosition` is the zero vector, because the capture has not run and an actor that has not started has not moved, and record why in a comment: `Npc` captures in `Start`, so 219 of 236 read zero
- [x] 2.4 Publish the follow origin the game settles on: `Npc.Start` fills an unset origin from the start position, so 219 of 236 NPCs export zero and 17 export the start point, and no NPC holds a distinct authored origin
- [x] 2.5 Leave the patrol waypoints as they are, because they are authored and no lifecycle method assigns them

## 3. Publish a tooltip that describes the item

- [x] 3.1 Put the removal of player-conditional decoration in its own type in `mods/DataExporter/`, taking a rendered tooltip and returning the item's description, so it can be tested without the game
- [x] 3.2 Remove the emphasis on a required level and on a required class, covering every decoration task 1.1 recorded
- [x] 3.3 Apply it at the single call site in `ItemExporter.cs` and confirm no other exporter reads a rendered tooltip: `QuestExporter.cs:62-63` and `SkillExporter.cs:99` read raw template fields and must stay untouched

## 4. Read the field no lifecycle method assigns

- [x] 4.1 Read the gather item name from `gatherItem.name` in `GatherItemExporter.cs`, and stop reading `nameGatherItem`, which `GatherItem.Start` overwrites
- [x] 4.2 Record in a comment that the identifier already reads this field, which is why identifiers were stable while names were not

## 5. Choose the visual asset source by structure

- [x] 5.1 Put the branch choice in one helper that decides on the presence of a `Front` child, and use it from `MonsterExporter.cs`, `NpcExporter.cs` and `BaseExporter.ExportEntitySprite`, which disagree about the order today
- [x] 5.2 Record the source name the structure selects, so a root-only entity is no longer recorded as `Front.SpriteRenderers` naming a child it does not have
- [x] 5.3 Remove the now-unreachable activation test and `front ?? root` fallback from `VisualAssetRendererSelector.cs`, since the selector only ever receives a `Front` subtree

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
