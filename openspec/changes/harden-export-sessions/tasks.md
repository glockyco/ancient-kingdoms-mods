## 1. Register runtime outputs

- [ ] 1.1 Add one exporter descriptor list to `mods/DataExporter/DataExporter.cs` for each remaining required exporter and its output paths. Verify duplicate IDs, duplicate paths, and unregistered exporters fail focused `DataExporter.Tests` registration checks.
- [ ] 1.2 Make exporters and `VisualAssetRegistry` write to a per-run staging path. Verify a simulated failure after an earlier exporter leaves the previous promoted session and active pointer unchanged.
- [ ] 1.3 Build a manifest after all exporters finish. Check top-level counts, sizes, SHA-256 digests, referenced images, game version, locale, and verified installed-build provenance. Verify corruption or an omitted file prevents promotion.
- [ ] 1.4 Make `ArtifactCollector.cs:24-42` consume only the promoted run manifest, not `exported-data/*.json`. Verify stale `doors.json` and `interactive_objects.json` and tracked curated `static_data.json` are not presented as current-run artifacts.

## 2. Separate curated composition

- [ ] 2.1 Remove the curated class copy from `ClassExporter.cs`, use `mods/DataExporter/Curated/classes.json` directly for the build, and relocate tracked `exported-data/static_data.json` to a curated input path. Verify neither file appears in a promoted runtime manifest.
- [ ] 2.2 Migrate `build.py`, `loaders/core.py`, `session.py`, configuration, read-only redaction loading, and HotRepl/build-tool artifact collection to one verified session plus two required curated paths. Verify a copied file from another run, missing curated input, or incompatible class IDs fails without replacing the built database.
- [ ] 2.3 Preserve `compendium classes check-races` as an explicit snapshot-backed check outside normal builds. Verify valid curated metadata builds without a snapshot and invalid class/race pairing is rejected by the explicit check.

## 3. Prove and document

- [ ] 3.1 Run a real `build-tool export` in the game and inspect the manifest, image hashes, class-combat rows, and locale. Build the resulting session with `compendium build`; verify a second failed export cannot change that session or the last successful database.
- [ ] 3.2 Update `docs/data-export-guide.md`, configuration examples, and the game-version update procedure with separate session and curated paths. Verify examples match actual command output; remove obsolete tracked flat export copies without adding compatibility fallbacks.
