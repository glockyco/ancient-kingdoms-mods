---
name: export-game-data
description: Apply the exporter data contract, the runtime discovery traps, the curated class exception, and exporter registration. Use when adding or changing Ancient Kingdoms DataExporter models, exporters, or runtime images.
---
# Export game data

This skill holds the exporter data contract, the ways runtime discovery misleads, the one exporter
that is deliberately unlike the others, and where each visual asset comes from.

## Data contract

Read authoritative runtime data: direct fields and explicit references, with `TryCast<T>()` where the
subtype matters. Never infer a value from a name, a threshold, or proximity.

Absence follows each field's contract: `null` for a missing reference, `""` for missing text, and a
declared default only where the contract defines one. Any other missing value fails the export. The
JSON writer omits a `null` property unless the model sets `NullValueHandling.Include`.

Document a derived value, such as zone containment, at its exporter. JSON property names are
snake_case, and a path inside an output, such as an image path, is relative to the session directory.

## Runtime discovery

`Resources.FindObjectsOfTypeAll<T>()` returns prefabs and assets alongside scene instances, so a count
taken from it is not a count of what exists in the world. Require a non-null game object with a valid
scene. Use `TryCast<T>()` for an IL2CPP specialization, and prefer an authoritative `idZone` where the
type exposes one.

Placement IDs are `prefix_{x}_{y}`: round the authored world position to whole units with
`Math.Round(..., MidpointRounding.AwayFromZero)` and write negative zero as `0`. Retain existing
descriptive prefixes, except `altar_{name}_{zone}` and `treasure_{mapId}_{zone}`. Do not use
runtime object numbers or create aliases or redirects for old IDs. Monster and NPC IDs use
the same `startPosition` as their exported position and zone.

## The curated class exception

`ClassExporter` reads `NetworkManagerMMO.playerClasses` prefabs and writes `classes_combat.json`. The
pipeline merges it with the class metadata in `build-pipeline/curated/classes.json`, which is edited by
hand. The exporter neither reads nor copies that file.

Its race pairing restates a rule the character creator enforces, so `compendium classes check-races`
compares the two. The check exists because a curated value that restates a game rule drifts silently.

Do not extend `ClassExporter` to cover the pairing. It exists only as button state in the creator, so an
exporter would have to drive the interface one race at a time.

## Visual assets

| Domain/kind | Source |
|---|---|
| `achievement/icon` | Steam achievement icon downloaded during export; recorded by `compendium build`, not the visual-assets manifest |
| `chest/primary` | `GatherItem.readySprite` |
| `class/icon` | `Player.classIcon` |
| `gathering_resource/icon` | `GatherItem.journalIcon` |
| `item/icon` | `ScriptableItem.image`, or the runtime `FantasyHeroes` icon collection for a missing item sprite |
| `item/pet` | The creature prefab of a friendly pet follower item |
| `item/treasure_map` | `TreasureMapItem.imageLocation` |
| `monster/bestiary` | `Monster.imageBossBestiary`, full-body bestiary poses distinct from the portrait crops and some world sprites |
| `monster/portrait` | `Monster.portraitBoss` |
| `monster/primary` | Root `SpriteRenderer`, or a body composite under `Monster.gameObject/Front` |
| `npc/primary` | Root `SpriteRenderer`, or a body composite under `Npc.gameObject/Front` |
| `pet/icon` | `Pet.portraitIcon` |
| `pet/primary` | The pet's root renderer or `Front` body composite |
| `profession/icon` | Live `UIProfessions` slot's authored `0/icon.Image.sprite`; the other images are decorative frames/labels |
| `skill/icon` | `ScriptableSkill.image` |
| `world/map` | Live scene `UIMap.worldMap.sprite`, exported as `world/eratiath/map` |
| `zone/shot` | Typed HotRepl `capture.zoneShots` job; native zone screenshots in `screenshots/zones/` with `manifest.json`; recorded by `compendium build`, not the visual-assets manifest |
| `zone/thumbnail` | A crop of the stitched world screenshot based on zone bounds; recorded by `compendium build`, not the visual-assets manifest |

For the other kinds, DataExporter writes source PNGs and their relative paths to `visual_assets.json`. `compendium build`
records them in SQLite and publishes WebP images.

Do not map entities by static Unity sprite names or use UnityPy images as fallback art. The runtime item
icon collection is the one exception, because it resolves an explicit item path to a loaded sprite.
Humanoid monsters and NPCs expose body sprites under `Front` instead of a root renderer. The composite
excludes UI renderers such as health bars, labels, speech bubbles, and shadows.
When an entity has several rows for the same `(domain, entity_id, kind)`,
review the ambiguity instead of picking one.

Profession export requires exactly one valid-scene `UIProfessions` instance discovered through
`Resources.FindObjectsOfTypeAll` and `TryCast`, not its singleton. All 13 explicit slot references must
resolve to `0/icon.Image.sprite`; a missing registry, slot, or icon fails the export.
`source_field` records that Image's exact hierarchy with sibling indices. Do not select a root Image
or guess among decorative siblings: the live slots include backgrounds, borders and level labels.

## Registration and output

Create the typed model and exporter under `mods/DataExporter/`, then add a descriptor to
`CreateCatalog` in `DataExporter.cs` with its id and every output path it writes. When an output
references images, give the descriptor a reader for those paths, as `achievements` and
`visualAssets.manifest` do. A run refuses promotion when a declared output is missing or does not
parse, a referenced image is missing, or the staging directory holds a file that no descriptor declares
or references, so an undeclared output fails the export instead of going unnoticed. After the runtime
export, read the new session's `manifest.json` for the file and its record count.

`build-tool/Commands/CommandCatalog.cs` registers CLI verbs,
`build-tool/HotRepl/HotReplExportRunner.cs` validates required export artifacts, and
`mods/HotReplCommands/Artifacts/ArtifactCollector.cs` builds the artifact keys from the verified session
manifest. Visual-only exporters share `visual-assets.manifest` and need no entity JSON artifact.

## Check

A successful compile proves nothing about runtime discovery, because a query that matches no scene
object returns empty rather than failing. Run a real export and read what it produced.
`mods/DataExporter/Exporters/BaseExporter.cs` is the current implementation pattern.
