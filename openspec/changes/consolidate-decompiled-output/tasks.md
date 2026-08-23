## 1. Baseline

- [ ] 1.1 Record the current directory sizes and file counts, the total on disk, and the output of `diff -rq server-scripts server-scripts-<newest>` so the duplication is measured rather than asserted.
- [ ] 1.2 Record the number of `Source: server-scripts/` citations and the current result of `uv run compendium citations check`.
- [ ] 1.3 Record the `SNAPSHOT.toml` contents of every existing tree, because those values become the store names.

## 2. Decide retention

- [ ] 2.1 State the retention limit and the reason for it. The workflow needs the previous tree for its diff step, so the floor is one.
- [ ] 2.2 Record what the limit means for the trees that exist today, naming which are kept and which are pruned.

## 3. Build the store

- [ ] 3.1 Add a naming function that derives a store entry name from the recorded build identifier and the assembly digest, both of which the script already computes.
- [ ] 3.2 Move the current decompile into the store under that name, keeping `SNAPSHOT.toml` inside it.
- [ ] 3.3 Move the retained previous trees into the store, deriving each name from its own `SNAPSHOT.toml`.
- [ ] 3.4 Replace `server-scripts/` with a pointer to the current entry.
- [ ] 3.5 Update `.gitignore` to cover the store and the pointer, and remove the entries that no longer describe anything.

## 4. Prove the pointer

- [ ] 4.1 Confirm `uv run compendium citations check` reports the same result as task 1.2.
- [ ] 4.2 Confirm the tools that read the path work through the pointer: the citations commands, a recursive grep, and the `diff -b -rq` step the update workflow uses.
- [ ] 4.3 Confirm the total on disk fell by the size of one tree, compared against task 1.1.

## 5. Rewrite the script

- [ ] 5.1 Write one tree per run instead of a working copy and a backup.
- [ ] 5.2 Move the pointer to the new entry after the tree is complete, never before.
- [ ] 5.3 Refuse to write when the destination is not ignored by version control, and name the destination in the failure.
- [ ] 5.4 Prune beyond the retention limit and report which trees were removed.
- [ ] 5.5 Keep the supplied version in `SNAPSHOT.toml` and stop using it in any path.
- [ ] 5.6 Confirm the staleness guard still compares the assembly digest against the recorded snapshot and still refuses an unpatched install.

## 6. Verification

- [ ] 6.1 Run the script end to end against the current installation and confirm the produced tree is byte-identical to the entry it replaces, ignoring `SNAPSHOT.toml` timestamps.
- [ ] 6.2 Confirm exactly one tree exists per decompiled assembly and that no tree is a duplicate of another.
- [ ] 6.3 Confirm the destination check fires by pointing the script at a tracked path and observing the refusal.
- [ ] 6.4 Confirm pruning fires and reports, by lowering the limit temporarily and restoring it.
- [ ] 6.5 Run `openspec validate consolidate-decompiled-output --strict`.

## 7. Documentation

- [ ] 7.1 Update the version-update skill so its diff step names the store and the pointer.
- [ ] 7.2 Update any document that names a versioned directory path.
- [ ] 7.3 Describe the layout in present tense, as the only layout.
