## Context

`commands/build.py:147,157,171-177` removes and regenerates planner payloads during normal database builds. `_build_envelope` reads `SNAPSHOT.toml`, compares its game version with `game_config.json`, and writes assembly provenance (`planner_payload.py:505-530`). The payload's live consumer is the combat verification corpus, which reads `website/data/planner-data.json` (`website/src/lib/planner/verification/corpus.ts:212-232`). The shipped curated-build contract expressly permits no local decompiled snapshot (`openspec/specs/curated-data-parity/spec.md:54-71`). A separate unused planner asset module is being deleted by WebsiteRuntimeFixes.

## Goals / Non-Goals

**Goals:** Keep ordinary builds snapshot-independent, retain honest assembly provenance for explicit combat verification, and prevent stale payloads from masquerading as current.

**Non-Goals:** Publishing a planner web feature or weakening verification's build-identity checks.

## Decisions

1. **Move payload production into a dedicated `compendium planner-payload` command.** It requires a successfully built database, compatible export files, current redaction policy, and `server-scripts/SNAPSHOT.toml`. Keep `_build_envelope`'s version comparison and assembly SHA. `compendium build` no longer imports, deletes, validates, or writes the verification payload. The verification command creates both payload files together and removes partial output on failure (`planner_payload.py:220-271`). Update the verification workflow to run it explicitly before corpus checks.
2. **Reject recording source identity in runtime export.** The desired `assemblySha256` is the SHA-256 of the *dedicated server's* Mono `Assembly-CSharp.dll`, not the running IL2CPP client's interop stub (`scripts/update-server-scripts.sh:148-163`). Stamping that hash and Steam manifest ID on the export would couple every game export to a local server installation and still need a trustworthy assembly match. The only payload consumers are source-bound tests, so making the payload an explicit verification artifact is narrower and preserves the decompiled-source-as-evidence boundary (`skill://update-game-version`).
3. **Keep verification outputs out of website publication.** Put both payload files under a dedicated ignored verification output directory rather than `website/data/`; point `verification/corpus.ts`, its tests, and relevant commands there. Existing website assets must not acquire a verification payload through asset imports. Before switching paths, check every import and all `?url` references; the currently unused asset module is owned by WebsiteRuntimeFixes.

## Risks / Trade-offs

- [A previously generated payload remains available under the old website path] → Remove old owned outputs during migration and reject the old location in publication checks. Do not remove unrelated files.
- [Verification runs against a DB for a different export] → Check database/export provenance and game version before writing output; retain redaction scanning and assembly comparison.
- [The snapshot is absent] → Only the explicit verification command fails; the normal build and curated publication proceed.

## Migration Plan

Implement the dedicated command and output path; migrate corpus readers and tests. Remove normal-build payload calls and old registration assertions. Rebuild a scratch database without a snapshot, then run the explicit command with a matching snapshot and inspect both payload forms. Update version-update verification steps. Keep generated verification artifacts ignored.
