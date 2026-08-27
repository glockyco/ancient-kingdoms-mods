---
name: export-game-data
description: Define authoritative export fields, absence semantics, visual scope, and artifact registration. Use when adding or changing Ancient Kingdoms DataExporter models, exporters, or runtime images.
---
# Export game data

Export authoritative runtime facts. A value is authoritative when it comes from a game field, runtime type, explicit reference, or a documented calculation over those values.

Do not infer identity or relationships from names, thresholds, proximity, or expected design. If no authoritative source exists, omit the field or use the field contract's absence value.

## Absence semantics

Follow the model and exporter contract for each field. Missing references commonly become `null`, missing text commonly becomes `""`, and value types keep their declared defaults. Use `"unknown"` only where the domain contract explicitly defines it, such as an unresolved zone. Do not apply one fallback convention to every exporter.

A derived value must name its source and algorithm. Spatial containment and bounds computed from runtime positions are permitted when no direct field exists. Do not describe a direct runtime type check as a heuristic.

## Runtime discovery

`Resources.FindObjectsOfTypeAll<T>()` includes prefabs and assets. For scene instances, require a non-null game object with a valid scene. Use `TryCast<T>()` for IL2CPP specializations. Use authoritative `idZone` values when the type exposes them.

`ClassExporter` is a deliberate exception to ordinary object discovery. It reads `NetworkManagerMMO.playerClasses` prefabs and writes `classes_combat.json` for the pipeline to merge with curated class metadata.

That curated half is `exported-data/classes.json`, and it is typed by hand because the game holds no runtime structure for it. Its race pairing restates a rule the character creator enforces, so `compendium classes check-races` compares the two. Do not extend `ClassExporter` to cover it: the pairing exists only as button state in the creator, which an exporter would have to drive one race at a time.

## Visual scope

The supported selected assets are:

- monster primary image from the direct sprite, or the documented runtime body composite;
- NPC primary image from the runtime body composite;
- item icon from `ScriptableItem.image`;
- skill icon from `ScriptableSkill.image`.

Do not expand this set to pets, treasure maps, bestiary portraits, animation frames, auxiliary child renderers, skill effects, or static UnityPy matches without a new accepted contract.

## Registration and output

Create the typed model and exporter under `mods/DataExporter/`, then register the exporter in `DataExporter.ExportAllData()`. The analyzer test owns registration completeness.

The orchestrated path is `dotnet run --project build-tool export`. It enters the world through the typed HotRepl command, runs every exporter, optionally captures screenshots, collects artifact hashes, and quits the game. Manual Shift+F9 export is for interactive diagnosis.

Files go under the configured `exported-data/` root. JSON stems become stable artifact keys `data.<stem>` with underscores converted to hyphens. `visual_assets.json` uses `visual-assets.manifest`. Screenshot metadata and tiles use `screenshots.*` keys. Each artifact includes an absolute file URI, source path, content type, byte size, and lowercase SHA-256 digest.

## Check

Run the DataExporter build and analyzer tests. For a contract change, run a real export, inspect the emitted JSON and artifact map, then run the consuming pipeline path. A successful compile does not prove runtime IL2CPP discovery.

See `docs/data-export-guide.md` for repository policy and `mods/DataExporter/Exporters/BaseExporter.cs` for the current implementation pattern.
