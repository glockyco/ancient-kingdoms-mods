---
name: update-game-version
description: Update decompiled evidence, exporters, generated data, citations, redactions, mechanics, and the published version. Use when a new Ancient Kingdoms patch is released.
---
# Update the game version

The server-script diff is the planning source. A changelog omits implementation details and combines unrelated changes. Obtain the target version, changelog, and whether the world map changed.

## 1. Acquire and diff evidence

See `scripts/update-server-scripts.sh` for the evidence-acquisition commands and snapshot behavior.

The Steam application manifest proves which build is installed. If it stays on the old build after `build-tool update`, inspect `content_log.txt`. No new activity means the request reached a stale client. Do not repeat the request.

Stop the complete CrossOver bottle. Preserve and remove `Steam/appcache/appinfo.vdf`. Start Steam normally, then wait for a new `[Logged On]` entry in `connection_log.txt`. Rerun `build-tool update`. The manifest must name the new build before decompilation starts.

Read focused diffs for every game field used by DataExporter and every mechanic named by the changelog. When a diff touches a cited region, confirm that the anchor still names the code its claim describes. Verification compares content, so a passing check proves that the region did not change, not that the claim describes it.

Decompiled scripts are evidence, not export input.

## 2. Reconcile citations first

See `build-pipeline/src/compendium/commands/citations.py` for citation-check statuses and reconciliation commands.

The check cannot detect when a patch falsifies a claim but reports only `changed`. Record that claim in this phase's commit body, and fix it with its code in phase 4.

Prefer a symbol citation for one named member.

A curated value that restates a game rule needs the same reconciliation, and the ledger cannot detect a
rule that changed without moving:

```bash
uv run compendium classes check-races
```

The pairing is typed by hand, and the game holds it in the character creator. This command compares
the two and names each disagreement. A failure means the patch added a class or changed which classes
a race allows. Correct `build-pipeline/curated/classes.json`. The build reads that file directly, so
the correction needs no new export.

Commit this phase before you change an exporter. A mechanic whose claim the tool refuses to anchor belongs in this commit, because the reconciliation cannot finish without it.

## 3. Update exporter compatibility

See `build-tool/Commands/CommandCatalog.cs` for the update, launch, build, deploy, and export workflow.

When an exporter reads a changed field, update its model, exporter, pipeline schema, and validation before generating new data. MelonLoader must regenerate IL2CPP assemblies after a Unity or metadata change.

If exporter code is unchanged, use `dotnet run --project build-tool export --update`. Add `--screenshots` only when the world map changed. The export keeps the session it replaced, so compare the digests of the world map image, `zone_info.json`, and `zone_triggers.json` in the two sessions' manifests. Deployment copies Release DLLs but does not prune stale DLLs.

## 4. Regenerate consumers

See `build-pipeline/src/compendium/cli.py` for `tiles`, `build`, and `redactions check`.

Tile validation must pass before replacement. Investigate redaction drift. Run `uv run compendium redactions sync --game-version <version>` only after every new decision is explained. The ledger stamps that version, so it states which export the decisions were taken against.

Apply current-tense website changes. Fix each claim that phase 2 recorded, together with the code that carries it. New data also invalidates tests that assert on it, so treat each one as its own concern.

The website build regenerates `website/src/lib/generated/`, including the stat vocabulary from the export's `stats.json`. Read that module's diff: a renamed stat or a changed format reaches every page that names the stat, so check those pages before you commit it with the generated data.

Re-read each report in `docs/game-bugs/` against the server-script diff. Delete fixed reports with their index rows, re-anchor moved references, and re-count derived figures.

**When the patch adds a class:** review silent omissions in `website/src/lib/utils/classes.ts`, `website/src/lib/data/classes/guide.ts`, the class count in `website/src/routes/classes/+page.svelte`, the growth table in `website/src/routes/mechanics/experience/+page.svelte`, and any hard-coded class pickers. `classes check-races` and exporter skill classification fail loudly; passing them does not cover these consumers.

A patch can edit the in-game Adventurer's Guide. `website/src/lib/data/game-guide/coverage.db.test.ts` names every guide article that is new, removed, or edited since its compendium section was reviewed. For each named article, update the section and its digest in `coverage.ts` together.

Follow the [contributor checks](../../../CONTRIBUTING.md#checks) for mechanics verification.

## 5. Publish and verify the release

Set `COMPENDIUM_VERSION` in `website/src/lib/constants/version.ts` last. The live-version banner depends on it. Publication is the final gate, so confirm that no claim recorded in phase 2 is still false.

The ledger version and `COMPENDIUM_VERSION` describe different things. The ledger names the snapshot the anchors describe, and `COMPENDIUM_VERSION` names the published data. The two differ from phase 2 until this step.

Run focused tests as each concern lands. Before the release gate, reconcile citations:

```bash
uv run compendium citations check
```

Then run the repository release gate and use the actual site in a browser. Confirm the game export, pipeline database, map if changed, mechanics pages, downloads, and live version banner.

Commit coherent concerns as they pass, in this order:

1. citation reconciliation, with any mechanic it had to carry
2. exporter contract
3. each mechanic with its prose and snapshots
4. the tests the new data invalidated
5. generated data
6. redaction ledger
7. map artifacts
8. version publication

The pre-commit hooks read the working tree, not the staged change. A staged source file runs `citations check`, and a staged schema, loader, or redaction file runs `redactions check`. Sync the citation ledger in the commit that adds its citations, with later concerns' edits set aside while you sync. When the exporter contract changes the schema or a loader, commit the redaction ledger before it.

Use `skill://commit-policy`. Do not hold a completed concern for a later big-bang split.

## Known runtime failures

If MelonLoader reports a missing Unity dependency, install the matching `Managed.zip` as `UnityDependencies_<unity-version>.zip` in its IL2CPP generator dependency directory and rerun. If world entry crashes in `Class_GetFieldDefaultValue_Hook`, verify the existing `FieldDefaultValueHookFix` against the new build. Do not add another fallback while it works.

An engine update can move the game to a Unity version the installed MelonLoader cannot load. Cpp2IL then reports an unsupported metadata version, or the log says `No Support Module Loaded!`. Set `debug_mode = true` in the game's `UserData/Loader.cfg` to log the support module's exception, and restore it afterwards. No export can run until the loader works, so check the MelonLoader, Cpp2IL and Il2CppInterop releases first. A locally patched loader is acceptable only after its class layout matches the il2cpp API at runtime, because a wrong offset corrupts data without crashing.

Cpp2IL does not clear `MelonLoader/Dependencies/Il2CppAssemblyGenerator/Cpp2IL/cpp2il_out`. After an engine update, remove the files older than the last generation run, or interop generation resolves types from assemblies of the previous build.
