---
name: update-game-version
description: Update decompiled evidence, exporters, generated data, citations, redactions, mechanics, and the published version. Use when a new Ancient Kingdoms patch is released.
---
# Update the game version

The server-script diff is the planning source. A changelog omits implementation details and combines unrelated changes. Obtain the target version, changelog, and whether the world map changed.

## 1. Acquire and diff evidence

See `scripts/update-server-scripts.sh` for the evidence-acquisition commands and snapshot behavior.

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

The pairing is typed by hand, and the game holds it in the character creator. This command compares the
two and names each disagreement. A failure means the patch changed which classes a race allows. Correct `exported-data/classes.json` and regenerate, because the published value is wrong and
the check is not.

Commit this phase before you change an exporter. A mechanic whose claim the tool refuses to anchor belongs in this commit, because the reconciliation cannot finish without it.

## 3. Update exporter compatibility

See `build-tool/Commands/CommandCatalog.cs` for the update, launch, build, deploy, and export workflow.

When an exporter reads a changed field, update its model, exporter, pipeline schema, and validation before generating new data. MelonLoader must regenerate IL2CPP assemblies after a Unity or metadata change.

If exporter code is unchanged, use `dotnet run --project build-tool export --update`. Add `--screenshots` only when the world map changed. Deployment copies Release DLLs but does not prune stale DLLs.

## 4. Regenerate consumers

See `build-pipeline/src/compendium/cli.py` for `tiles`, `build`, and `redactions check`.

Tile validation must pass before replacement. Investigate redaction drift. Run `uv run compendium redactions sync --game-version <version>` only after every new decision is explained. The ledger stamps that version, so it states which export the decisions were taken against.

Apply current-tense website changes. Fix each claim that phase 2 recorded, together with the code that carries it. New data also invalidates tests that assert on it and changes generated fixtures, so treat each one as its own concern.

See `website/scripts/snapshot-mechanics.mjs` for mechanics snapshot generation and its `--update` option.

## 5. Publish and verify the release

Set `COMPENDIUM_VERSION` in `website/src/lib/constants/version.ts` last. The live-version banner depends on it. Publication is the final gate, so confirm that no claim recorded in phase 2 is still false.

The ledger version and `COMPENDIUM_VERSION` describe different things. The ledger names the snapshot the anchors describe, and `COMPENDIUM_VERSION` names the published data. The two differ from phase 2 until this step.

Run focused tests as each concern lands. Then run the repository release gate and use the actual site in a browser. Confirm the game export, pipeline database, map if changed, mechanics pages, downloads, and live version banner.

Commit coherent concerns as they pass, in this order:

1. citation reconciliation, with any mechanic it had to carry
2. exporter contract
3. each mechanic with its prose and snapshots
4. the tests and generated fixtures the new data invalidated
5. generated data
6. redaction ledger
7. map artifacts
8. version publication

Use `skill://commit-policy`. Do not hold a completed concern for a later big-bang split.

## Known runtime failure

If MelonLoader reports a missing Unity dependency, install the matching `Managed.zip` as `UnityDependencies_<unity-version>.zip` in its IL2CPP generator dependency directory and rerun. If world entry crashes in `Class_GetFieldDefaultValue_Hook`, verify the existing `FieldDefaultValueHookFix` against the new build. Do not add another fallback while it works.
