---
name: export-game-data
description: Apply the runtime discovery traps, the curated class exception, and exporter registration. Use when adding or changing Ancient Kingdoms DataExporter models, exporters, or runtime images.
---
# Export game data

`docs/data-export-guide.md` owns field authority, absence values, and visual scope. Read it before
adding a field. It separates a value the game states from one that only looks true. An exporter that
infers from a name, a threshold or proximity publishes a confident wrong answer.

This file carries what that guide does not: the ways runtime discovery misleads, and the one exporter
that is deliberately unlike the others.

## Runtime discovery

`Resources.FindObjectsOfTypeAll<T>()` returns prefabs and assets alongside scene instances, so a count
taken from it is not a count of what exists in the world. Require a non-null game object with a valid
scene. Use `TryCast<T>()` for an IL2CPP specialization, and prefer an authoritative `idZone` where the
type exposes one.

## The curated class exception

`ClassExporter` reads `NetworkManagerMMO.playerClasses` prefabs and writes `classes_combat.json` for the
pipeline to merge with curated metadata. The curated half, `exported-data/classes.json`, is typed by
hand because the game holds no runtime structure for it.

Its race pairing restates a rule the character creator enforces, so `compendium classes check-races`
compares the two. The check exists because a curated value that restates a game rule drifts silently.

Do not extend `ClassExporter` to cover the pairing. It exists only as button state in the creator, so an
exporter would have to drive the interface one race at a time.

## Registration and output

Create the typed model and exporter under `mods/DataExporter/`, then register it in
`DataExporter.ExportAllData()`. An unregistered exporter fails no build and produces no file.
`tests/DataExporter.Tests/ExporterRegistrationTests.cs` is what catches it.

`build-tool/Commands/CommandCatalog.cs` and `mods/HotReplCommands/Artifacts/ArtifactCollector.cs` own
the orchestrated path and the artifact keys.

## Check

A successful compile proves nothing about runtime discovery, because a query that matches no scene
object returns empty rather than failing. Run a real export and read what it produced.
`mods/DataExporter/Exporters/BaseExporter.cs` is the current implementation pattern.
