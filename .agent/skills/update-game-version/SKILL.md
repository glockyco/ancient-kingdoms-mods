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

Read focused diffs for every game field used by DataExporter and every mechanic named by the changelog. When a diff touches a cited region, confirm that the anchor still names the code its claim describes. Verification compares content, so a passing check proves that the region did not change, not that the claim describes it.

Decompiled scripts are evidence, not export input. Never commit `.decompiled/`, `server-scripts`, `exported-data/`, or `website/data/`.

## 2. Reconcile citations first

The pre-commit hook checks every citation in the tree, not the staged files. A new snapshot therefore blocks every later commit until this phase ends.

```bash
cd build-pipeline
uv run compendium citations check
```

Four statuses block a commit: `changed`, `unresolved`, `ambiguous`, and `unsupported`. A `moved` or `suspect` status is advisory and blocks nothing, so bulk relocation is not a prerequisite for the work in later phases.

Triage each blocking status:

- The code moved and the claim still holds. Relocate the citation.
- The anchor names unrelated code. Correct the anchor. Run `citations suggest` for a proposal.
- The patch made the claim false. The code that carries the claim is now wrong. Record the claim in this phase's commit body, and fix it with its code in phase 4.

Prefer a symbol citation for one named member.

Run `citations fix` before `citations sync`. A sync writes every anchor and stamps one game version. It refuses an anchor it knows is wrong, which means a relocated reference or a claim that names code the region lacks. A reference whose code merely changed is accepted, so review it before you sync.

```bash
uv run compendium citations fix
uv run compendium citations sync --game-version <version>
uv run compendium citations check
```

Commit this phase before you change an exporter or a mechanic.

## 3. Update exporter compatibility

When an exporter reads a changed field, update its model, exporter, pipeline schema, and validation before generating new data. MelonLoader must regenerate IL2CPP assemblies after a Unity or metadata change:

```bash
dotnet run --project build-tool update
dotnet run --project build-tool launch
dotnet run --project build-tool build
dotnet run --project build-tool deploy
dotnet run --project build-tool export
```

If exporter code is unchanged, use `dotnet run --project build-tool export --update`. Add `--screenshots` only when the world map changed. Deployment copies Release DLLs but does not prune stale DLLs.

## 4. Regenerate consumers

```bash
cd build-pipeline
uv run compendium tiles       # only after a map-changing screenshot export
uv run compendium build
uv run compendium redactions check
```

Tile validation must pass before replacement. Investigate redaction drift. Run `uv run compendium redactions sync` only after every new decision is explained.

Apply current-tense website changes. Fix each claim that phase 2 recorded, together with the code that carries it. New data also invalidates tests that assert on it and changes generated fixtures, so treat each one as its own concern.

Rebuild and inspect mechanics snapshots:

```bash
cd website
pnpm build
node scripts/snapshot-mechanics.mjs
node scripts/snapshot-mechanics.mjs --update  # only after every diff is explained
```

## 5. Publish and verify the release

Set `COMPENDIUM_VERSION` in `website/src/lib/constants/version.ts` last. The live-version banner depends on it. Publication is the final gate, so confirm that no claim recorded in phase 2 is still false.

The ledger version and `COMPENDIUM_VERSION` describe different things. The ledger names the snapshot the anchors describe, and `COMPENDIUM_VERSION` names the published data. The two differ from phase 2 until this step.

Run focused tests as each concern lands. Then run the repository release gate and use the actual site in a browser. Confirm the game export, pipeline database, map if changed, mechanics pages, downloads, and live version banner.

Commit coherent concerns as they pass, in this order: citation reconciliation, exporter contract, each mechanic with its prose and snapshots, the tests and generated fixtures the new data invalidated, generated data, redaction ledger, map artifacts, and version publication. Use `skill://commit-policy`. Do not hold a completed concern for a later big-bang split.

## Known runtime failure

If MelonLoader reports a missing Unity dependency, install the matching `Managed.zip` as `UnityDependencies_<unity-version>.zip` in its IL2CPP generator dependency directory and rerun. If world entry crashes in `Class_GetFieldDefaultValue_Hook`, verify the existing `FieldDefaultValueHookFix` against the new build; do not add another fallback while it works.
