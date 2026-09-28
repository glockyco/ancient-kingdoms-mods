## Context

`DataExporter.ExportAllData()` writes through one mutable `ExportPath` and records exporter results (`mods/DataExporter/DataExporter.cs:51-244`). `ClassExporter` copies embedded curated metadata before runtime collection (`Exporters/ClassExporter.cs:15-18,138-145`). `load_classes` merges that file with `classes_combat.json`; `load_static_data` reads a hand-maintained file (`build-pipeline/src/compendium/loaders/core.py:164-267`). `session.py:26-48` currently checks only locale. `ArtifactCollector.cs:24-42` scans every JSON file, including stale files.

## Goals / Non-Goals

**Goals:** One immutable, verified runtime session; separate, required curated inputs; one build composition boundary.

**Non-Goals:** Changing entity-specific mapping, adding an ORM or cross-language master entity registry, or moving the class/race check into normal builds.

## Decisions

1. **Explicit exporter descriptors.** Keep a single ordered C# catalog of stable exporter ID, expected relative output paths, requiredness, and factory/action. Reject duplicate IDs, paths, omissions, and unowned files. Include the visual asset manifest and referenced images. Never infer registration from a directory or reflection. The present imperative list is easy to miss during additions; file discovery would mistake stale files for valid outputs. `ExportIntegrity` separately repairs individual write failures and deletes door and interactive-object exporters; those deleted exporters are not session obligations.
2. **Stage and promote whole sessions.** Give every invocation a unique staging directory; point exporters and `VisualAssetRegistry` at it. When all required exporters succeed, verify each JSON file, record top-level array length or one top-level object as its count, and hash every required file. Write a manifest with schema version, exporter ID/path/bytes/count/digest, game version, locale, and verified Steam build provenance. Promote the directory as an immutable run; atomically change the active-session pointer only after promotion. The direct Shift+F9 path must resolve provenance from the installed game manifest or fail promotion; do not claim an unverified build ID. A failed run may leave staging for diagnosis but cannot alter a promoted run. Atomic per-file writes alone cannot prevent cross-run mixing.
3. **Separate curated ownership.** Keep `mods/DataExporter/Curated/classes.json` as the sole tracked class-metadata source; remove `ClassExporter.WriteCuratedClasses()`. Move tracked `exported-data/static_data.json` to a tracked curated location outside runtime sessions (for example `build-pipeline/curated/static_data.json`). Remove tracked `exported-data/classes.json` as a generated copy. The build selects an immutable runtime session plus two explicit curated paths; validate their existence, class-to-combat identity coverage, locale, and class/race structure before publishing. `classes check-races` still reads the source snapshot only when explicitly invoked (`openspec/specs/curated-data-parity/spec.md:54-71`). Do not assume an absent curated file is empty.
4. **One artifact view.** Update HotRepl/build-tool artifact collection to return only promoted runtime artifacts from the session manifest; curated inputs are separate build inputs. Current `ArtifactCollector.cs:24-42` scans all JSON files and can report older files as finalized. The manifest drives expected files, not the filesystem listing.

## Risks / Trade-offs

- [Session paths break commands that expect flat `exported-data/`] → Migrate every configured reader, HotRepl artifact key, test fixture, and guide in one cutover. Keep no implicit flat-directory fallback.
- [A crash between directory promotion and pointer swap leaves an orphan] → Make the pointer swap atomic and treat orphan directories as unselected, not as valid current data.
- [Curated data changes without re-export] → Hash it as a separate build input, validate composition, and avoid editing an immutable runtime session.

## Migration Plan

1. Establish descriptor and manifest tests, including a failure after one successful exporter.
2. Move curated paths and migrate all export/pipeline callers; update export configuration and guidance.
3. Export a real game session and inspect its file counts, digests, images, and locale. Build a scratch database from that session before switching normal readers.
4. Switch active-session selection after the scratch build succeeds; preserve the prior session and database for rollback.
