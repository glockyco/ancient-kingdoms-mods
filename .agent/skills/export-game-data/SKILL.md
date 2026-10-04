---
name: export-game-data
description: Apply the runtime discovery traps, the curated class exception, and exporter registration. Use when adding or changing Ancient Kingdoms DataExporter models, exporters, or runtime images.
---
# Export game data

The exporter rules, which data counts as authoritative and what an absent value looks like, are in
the README under "Export game data". This skill adds the ways runtime discovery misleads, the one
exporter that is deliberately unlike the others, and where each visual asset comes from.

## Runtime discovery

`Resources.FindObjectsOfTypeAll<T>()` returns prefabs and assets alongside scene instances, so a count
taken from it is not a count of what exists in the world. Require a non-null game object with a valid
scene. Use `TryCast<T>()` for an IL2CPP specialization, and prefer an authoritative `idZone` where the
type exposes one.

## The curated class exception

`ClassExporter` reads `NetworkManagerMMO.playerClasses` prefabs and writes `classes_combat.json` for the
pipeline to merge with curated metadata. Edit `mods/DataExporter/Curated/classes.json` by hand.
The exporter embeds that source and overwrites `exported-data/classes.json` with a copy.

Its race pairing restates a rule the character creator enforces, so `compendium classes check-races`
compares the two. The check exists because a curated value that restates a game rule drifts silently.

Do not extend `ClassExporter` to cover the pairing. It exists only as button state in the creator, so an
exporter would have to drive the interface one race at a time.

## Visual assets

| Domain/kind | Source |
|---|---|
| `achievement/icon` | Steam achievement icon downloaded during export |
| `chest/primary` | `GatherItem.readySprite` |
| `class/icon` | `Player.classIcon` |
| `gathering_resource/icon` | `GatherItem.journalIcon` |
| `item/icon` | `ScriptableItem.image`, or the runtime `FantasyHeroes` icon collection for a missing item sprite |
| `item/pet` | The creature prefab of a friendly pet follower item |
| `item/treasure_map` | `TreasureMapItem.imageLocation` |
| `monster/primary` | Root `SpriteRenderer`, or a body composite under `Monster.gameObject/Front` |
| `npc/primary` | Root `SpriteRenderer`, or a body composite under `Npc.gameObject/Front` |
| `pet/icon` | `Pet.portraitIcon` |
| `pet/primary` | The pet's root renderer or `Front` body composite |
| `skill/icon` | `ScriptableSkill.image` |
| `zone/thumbnail` | A crop of the stitched world screenshot based on zone bounds |

DataExporter writes source PNGs and their relative paths to `visual_assets.json`. `compendium build`
records them in SQLite and publishes WebP images.

Do not map entities by static Unity sprite names or use UnityPy images as fallback art. The runtime item
icon collection is the one exception, because it resolves an explicit item path to a loaded sprite.
Humanoid monsters and NPCs expose body sprites under `Front` instead of a root renderer. The composite
excludes UI renderers such as health bars, labels, speech bubbles, and shadows. Boss portraits and
bestiary images are not used. When an entity has several rows for the same `(domain, entity_id, kind)`,
review the ambiguity instead of picking one.

## Registration and output

Create the typed model and exporter under `mods/DataExporter/`, then register it in
`DataExporter.ExportAllData()`. An unregistered exporter fails no build and produces no file.
After the runtime export, verify that the result lists it and the file contains its data.

`build-tool/Commands/CommandCatalog.cs` and `mods/HotReplCommands/Artifacts/ArtifactCollector.cs` own
the orchestrated path and the artifact keys.

## Check

A successful compile proves nothing about runtime discovery, because a query that matches no scene
object returns empty rather than failing. Run a real export and read what it produced.
`mods/DataExporter/Exporters/BaseExporter.cs` is the current implementation pattern.
