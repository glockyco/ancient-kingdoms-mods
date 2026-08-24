---
name: update-game-version
description: Update decompiled evidence, exporters, generated data, citations, redactions, mechanics, and the published version. Use when a new Ancient Kingdoms patch is released.
---
# Update the game version

The server-script diff is the planning source. A changelog omits implementation details and combines unrelated changes. Obtain the target version, changelog, and whether the world map changed.

## 1. Acquire and diff evidence

```bash
./scripts/update-server-scripts.sh <version>
readlink server-scripts
/usr/bin/diff -b -rq .decompiled/<previous-entry> server-scripts
```

The update script reads the installed assembly, installs the pinned ILSpy tool when needed, writes one content-addressed entry under `.decompiled/`, updates the `server-scripts` symlink, and keeps one previous entry. If the install still contains the old build, run `dotnet run --project build-tool update` and repeat.

Read focused diffs for every game field used by DataExporter and every mechanic named by the changelog. Decompiled scripts are evidence, not export input. Never commit `.decompiled/`, `server-scripts`, `exported-data/`, or `website/data/`.

## 2. Update exporter compatibility first

When an exporter reads a changed field, update its model, exporter, pipeline schema, and validation before generating new data. MelonLoader must regenerate IL2CPP assemblies after a Unity or metadata change:

```bash
dotnet run --project build-tool update
dotnet run --project build-tool launch
dotnet run --project build-tool build
dotnet run --project build-tool deploy
dotnet run --project build-tool export
```

If exporter code is unchanged, use `dotnet run --project build-tool export --update`. Add `--screenshots` only when the world map changed. Deployment copies Release DLLs but does not prune stale DLLs.

## 3. Regenerate consumers

```bash
cd build-pipeline
uv run compendium tiles       # only after a map-changing screenshot export
uv run compendium build
uv run compendium redactions check
```

Tile validation must pass before replacement. Investigate redaction drift. Run `uv run compendium redactions sync` only after every new decision is explained.

Apply current-tense website changes. Rebuild and inspect mechanics snapshots:

```bash
cd website
pnpm build
node scripts/snapshot-mechanics.mjs
node scripts/snapshot-mechanics.mjs --update  # only after every diff is explained
```

Set `COMPENDIUM_VERSION` in `website/src/lib/constants/version.ts` last. The live-version banner depends on it.

## 4. Reconcile citations

Run citation check, fix, and suggest from the pipeline. A moved reference can be fixed mechanically. A changed reference requires review of the claim before sync. Prefer symbol citations for one named member. Sync with the target game version only after the reviewed sources and claims agree.

## 5. Verify the release

Run focused tests as each concern lands. Then run the repository release gate and use the actual site in a browser. Confirm the game export, pipeline database, map if changed, mechanics pages, downloads, and live version banner.

Commit coherent concerns as they pass: exporter contract, citation relocation, each mechanic change with its snapshots, generated data, redaction ledger, map artifacts, and final version publication. Use `skill://commit-policy`; do not hold a completed concern for a later big-bang split.

## Known runtime failure

If MelonLoader reports a missing Unity dependency, install the matching `Managed.zip` as `UnityDependencies_<unity-version>.zip` in its IL2CPP generator dependency directory and rerun. If world entry crashes in `Class_GetFieldDefaultValue_Hook`, verify the existing `FieldDefaultValueHookFix` against the new build; do not add another fallback while it works.
