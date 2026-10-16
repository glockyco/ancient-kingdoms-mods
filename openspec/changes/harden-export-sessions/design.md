## Context

`DataExporter.ExportAllData()` writes through one mutable `ExportPath` and records exporter results (`mods/DataExporter/DataExporter.cs:51-244`). `ClassExporter` copies embedded curated metadata before runtime collection (`Exporters/ClassExporter.cs:15-18,138-145`). `load_classes` merges that file with `classes_combat.json`; `load_static_data` reads a hand-maintained file (`build-pipeline/src/compendium/loaders/core.py:164-267`). `session.py:26-48` currently checks only locale. `ArtifactCollector.cs:24-42` scans every JSON file, including stale files.

## Goals / Non-Goals

**Goals:** One immutable, verified runtime session; separate, required curated inputs; one build composition boundary.

**Non-Goals:** Changing entity-specific mapping, adding an ORM or cross-language master entity registry, or moving the class/race check into normal builds.

## Decisions

1. **Explicit exporter descriptors.** Keep a single ordered C# catalog of stable exporter ID, expected relative output paths, requiredness, and factory/action. Reject duplicate IDs, paths, omissions, and unowned files. Include the visual asset manifest and referenced images. Never infer registration from a directory or reflection. The present imperative list is easy to miss during additions; file discovery would mistake stale files for valid outputs. `ExportIntegrity` separately repairs individual write failures and deletes door and interactive-object exporters; those deleted exporters are not session obligations.
2. **Stage and promote whole sessions.** Give every invocation a unique staging directory; point exporters and `VisualAssetRegistry` at it. When all required exporters succeed, verify each JSON file, record top-level array length or one top-level object as its count, and hash every required file. Write a manifest with schema version, exporter ID/path/bytes/count/digest, game version, locale, and verified Steam build provenance. Promote the directory as an immutable run; atomically change the active-session pointer only after promotion. The direct Shift+F9 path must resolve provenance from the installed game manifest or fail promotion; do not claim an unverified build ID. A failed run may leave staging for diagnosis but cannot alter a promoted run. Atomic per-file writes alone cannot prevent cross-run mixing.
3. **Separate curated ownership.** Remove `ClassExporter.WriteCuratedClasses()` and the embedded resource it copies. With the exporter no longer reading `classes.json`, the pipeline is its only reader, so both curated inputs move to `build-pipeline/curated/`: `classes.json` from `mods/DataExporter/Curated/` and `static_data.json` from `exported-data/`. Each stays the sole tracked copy. The build selects an immutable runtime session plus that curated directory, and validates their existence, class-to-combat identity coverage, locale, and class/race structure before publishing. `classes check-races` still reads the source snapshot only when explicitly invoked (`openspec/specs/curated-data-parity/spec.md:54-71`). Do not assume an absent curated file is empty.
4. **One artifact view.** Update HotRepl/build-tool artifact collection to return only promoted runtime artifacts from the session manifest; curated inputs are separate build inputs. Current `ArtifactCollector.cs:24-42` scans all JSON files and can report older files as finalized. The manifest drives expected files, not the filesystem listing.
5. **Screenshots stay outside sessions.** Map screenshots and zone shots come from separate jobs at other times and carry their own manifests (`screenshots/metadata.json`, `screenshots/zones/manifest.json`). They stay in `screenshots/` under the export root. A session holds only DataExporter's runtime outputs.

## Session contract

The export root is `DATA_EXPORT_PATH`, `exported-data/` in this repository:

```text
exported-data/
  sessions/<session-id>/   promoted sessions, never modified after promotion
    manifest.json
    *.json, images/...     runtime outputs, at the same relative paths as before
  staging/<session-id>/    runs in progress, or failed runs kept for diagnosis
  active-session.json      the promoted session that readers select
  screenshots/             map screenshots and zone shots
  README.md
```

- A session id is the run's UTC start time and 8 random hex digits, such as `20261016T231500Z-1a2b3c4d`, so ids sort by time.
- `active-session.json` holds `{"session_id": "<id>", "path": "sessions/<id>"}`. The exporter writes it to a temporary file in the same directory and renames it over the old one, after the session directory itself has been renamed from `staging/` to `sessions/`.
- After a successful promotion, the exporter deletes every staging directory and every session except the new one and the one it replaced, which stays for rollback. A failed run leaves its staging directory until the next successful run, and changes nothing else.
- `manifest.json` has `schema_version` 1, `session_id`, `started_at`, `completed_at`, `game_version` and `locale` (both from the run's `game_config.json`), `steam_build_id`, and `files`. Each file entry has `path` (relative, forward slashes), `exporter` (the id of the exporter that declares the file, or for an image, of the exporter whose output references it), `bytes`, `count` (the top-level array length, 1 for a top-level object, `null` for an image) and `sha256` (lowercase hex). The manifest does not list itself.
- An image is owned when an output of a registered exporter references it. Two outputs reference images: the entries of `visual_assets.json` (exporter `visualAssets`) and the icon paths in `achievements.json` (exporter `achievements`), whose Steam icons `compendium build` records itself rather than through the visual asset manifest.
- `steam_build_id` comes from `appmanifest_2241380.acf` in the Steam library that holds the running install, and only when Steam reports the install as fully installed. Otherwise promotion fails. The exporter links `build-tool/Game/SteamAppManifest.cs` rather than copying its parser.
- Promotion fails when a registered output is missing, a JSON output does not parse, a referenced image is missing, or the staging directory holds any file that no registered exporter declares or references.
- Every reader resolves `active-session.json`, then verifies the session against its manifest before reading anything: every listed file exists with the listed size and digest, no unlisted file exists except `manifest.json`, `schema_version` is 1, and `locale` is the published locale. Any failure stops the reader and names the file or value. The HotRepl artifact collector is a reader too. It never reads files outside the session, such as leftovers of the flat layout in the export root.

## Risks / Trade-offs

- [Session paths break commands that expect flat `exported-data/`] → Migrate every configured reader, HotRepl artifact key, test fixture, and guide in one cutover. Keep no implicit flat-directory fallback.
- [A crash between directory promotion and pointer swap leaves an orphan] → Make the pointer swap atomic and treat orphan directories as unselected, not as valid current data.
- [Curated data changes without re-export] → Hash it as a separate build input, validate composition, and avoid editing an immutable runtime session.

## Migration Plan

1. Establish descriptor and manifest tests, including a failure after one successful exporter.
2. Move curated paths and migrate all export/pipeline callers; update export configuration and guidance.
3. Export a real game session and inspect its file counts, digests, images, and locale. Build a scratch database from that session before switching normal readers.
4. Switch active-session selection after the scratch build succeeds; preserve the prior session and database for rollback.
