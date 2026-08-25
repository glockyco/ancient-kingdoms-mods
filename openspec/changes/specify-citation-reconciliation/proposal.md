## Why

The pre-commit hook checks every citation in the working tree, not the staged files. A new decompiled snapshot therefore turns that check red, and no commit lands until the operator reconciles the citations.

`skill://update-game-version` places citation reconciliation in step 4, after exporter compatibility and consumer regeneration. The same skill instructs the operator to commit each coherent concern as it passes. Under the repository gate those two instructions cannot both hold, because step 4 is what unblocks steps 2 and 3.

The citation ledger has no spec. The skill was therefore the only description of the lifecycle, and that description contradicted the gate. Version 0.9.31.0 exposed the contradiction: 546 targets, 10 of them blocking, 58 merely relocated, and a first commit attempt rejected by the hook.

Two further gaps appeared during the same update:

- `citations sync` writes every anchor and stamps one game version. A sync of a part-edited tree records anchors for stale locators. The recorded hash then matches the wrong region forever, and every later check reports `ok`. Two citations in the tree already name unrelated code for this reason.
- The blocking statuses are undocumented. The operator cannot tell which findings must be resolved before a commit and which are advisory, so a mechanical relocation of 58 references looks like a prerequisite when it is not.

## What Changes

- Introduce a spec for the citation ledger lifecycle: the statuses that block a commit, the single snapshot each lockfile describes, the required order of `fix` and `sync`, and the limit of what a hash match proves.
- Make `citations sync` refuse to run while any target reports `moved`, so the required order stops depending on prose.
- Reorder `skill://update-game-version` so citation reconciliation clears the gate before exporter and mechanic work, and record the blocking statuses and the sync hazard there.
- State in the skill that a claim which the new snapshot falsified is a code defect. The commit that defers the fix records what remains, and the version publication step confirms that nothing remains.
- State in the skill that the evidence version in `citations.lock.json` and the published `COMPENDIUM_VERSION` differ between reconciliation and publication.
- Verify citation anchors during the diff reading the skill already requires. Add no scheduled audit.

## Capabilities

### New Capabilities

- `source-citations`: how recorded references to decompiled source are verified, relocated, and re-anchored, so an operator knows which findings block a commit and a recorded anchor cannot silently name the wrong code.

### Modified Capabilities

None. `decompiled-source` owns the snapshot store, the stable citation path, and retention. It states that a recorded reference resolves against the current source. This change owns the separate question of whether the resolved region still carries the claim, which has its own artifact, its own commands, and its own gate.

## Impact

- **Changed:** `build-pipeline/src/compendium/commands/citations.py` gains the sync guard. `build-pipeline/tests/test_citations_cli.py` covers it.
- **Changed:** `.agent/skills/update-game-version/SKILL.md` reorders its phases and records the gate contract.
- **Unchanged:** `citations.lock.json` format, the `lefthook.yml` hook definition, and the `check`, `fix`, and `suggest` results for a tree with no pending relocation.
- **Operators:** a sync that used to succeed on a part-edited tree now fails with a named cause. Running `citations fix` first satisfies it.
