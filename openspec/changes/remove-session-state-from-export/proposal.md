## Why

Two exports of one game build disagree. Comparing two runs against Steam build 24925347 found the same 4572 spawn identifiers, the same 1723 items and the same row order everywhere, and four sets of differing values:

| Surface | Rows | What differs |
|---|---|---|
| `items.json` | 240 | `Requires Level <color=red>50</color>` against `Requires Level 50` |
| `gather_items.json` | 14 | `Chest RF Interiors` against `Chest RF Interiors (10)` |
| `monster_spawns.json` | 11 | positions up to 2.4 units apart |
| `npc_spawns.json` | 1 | one position 2.58 units apart |
| `visual_assets.json` | 1 | a different sprite source, and a different published image file |

One cause runs through all of them: the exporter reads the state of a running session rather than the data the game ships. An item tooltip is rendered against the exporting character, so `UsableItem` reddens a required level the character has not reached and `EquipmentItem` reddens a required class it cannot use. A gather item's name is read from a field that the object's own `Start` overwrites, so the value depends on whether that method has run. A spawn position and a sprite are read from the live actor, so a monster that has walked exports where it stands and an NPC exports the sheet it happened to be facing.

This matters twice over. The compendium cannot tell a game change from an export artefact: the redaction ledger, the citation lockfile and every recorded baseline compare against values that move on their own. And the published data is wrong on its own terms, because a tooltip that colours a level red is answering a question about one player rather than describing the item.

The 0.9.31.0 patch added a fifth dependency of the same kind. `ScriptableItem` now resolves its tooltip template through `LocalizationSettings.SelectedLocale`, and the selected locale also chooses the culture that formats its numbers, so a published tooltip now depends on the language the exporting client had selected.

A verification export after the first corrections exposed two more reads of the same session. `TravelItem.ToolTip` substitutes the exporting character's bind-point zone into the Gate Scroll description, so two runs wrote `[Twilight Forest]` and `[Everfrost]`. The monster exporter also preferred a live scene instance over the canonical template, so two animated root renderers wrote different frames for Injured Werebear and Orc Oracle.

The next comparison exposed the same mechanisms in two more places. `FragmentItem.ToolTip` writes the local player's inventory progress, so Krom Razz Fatecharm Fragment changed from a red `0 / 5` to a green `5 / 5`. A layered Taelora Nightbloom scene instance also wrote two animation frames with different heights. A scene instance is still required for its initialized appearance; its animator must be sampled at time zero before either visual branch is read.

## What Changes

- Publish the position the game gives a spawn rather than the position its actor currently occupies, and derive a row's zone from the same point as its position.
- Publish an item tooltip that describes the item: render it, then remove requirement decoration, bind-point substitution and fragment inventory progress that answer questions about the exporting character.
- Require the export to state the locale it was taken under, and fail the build when that is not the locale the published data assumes.
- Read a value from a field that no lifecycle method overwrites, so the value does not depend on when the exporter runs.
- Choose a visual asset branch by structure. A layered composite keeps its initialized scene instance; a root renderer uses the canonical template when one exists. Sample an active source's controller at time zero before either branch is captured.
- **BREAKING** for published values: 240 item tooltips lose colour markup, the Gate Scroll names the generic bind point, one fragment states its required total instead of the exporting character's inventory progress, 14 gather item names change, 12 spawn positions move by up to 2.4 units, one NPC image takes its structural source, and animated sources take their initial frame.

## Capabilities

### New Capabilities

- `game-data-export`: what the export guarantees about the values it writes, which reads are permitted, and how a dependency on the exporting session is prevented from reaching the published data.

### Modified Capabilities

<!-- None. `compendium-build` already requires that a build is reproducible from a
     fixed export; this change is about the export that build reads. -->

## Impact

- **Changed:** `mods/DataExporter/Exporters/ItemExporter.cs`, `MonsterExporter.cs`, `NpcExporter.cs`, `GatherItemExporter.cs`, the visual asset capture, and the export manifest that records the session state.
- **Published data:** the values listed above. Each is a correction, and each is a one-time diff in the generated database, the search index, the map, or the published image set.
- **Consumers:** the redaction ledger keys a removed placement by its position, so the 12 corrected positions are a one-time rekey. No recorded key moves, because no excluded zone holds a wandering actor.
- **Verification:** a second export of one build becomes the check, which requires launching the game twice.
- **Unchanged:** every identifier, the row order of every file, and the pipeline that reads the export.
