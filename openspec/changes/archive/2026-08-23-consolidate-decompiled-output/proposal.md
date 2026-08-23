## Why

Every decompile writes the same output twice. `scripts/update-server-scripts.sh` produces a working copy at `server-scripts/` and a versioned backup at `server-scripts-<version>/`, and the two are identical: `diff -rq server-scripts server-scripts-0.9.29.0` reports nothing. Five directories hold 26 MB, and one of them is a duplicate that exists only because the working copy needs a stable name.

The stable name is real. 510 citations across the website and the build pipeline resolve against `server-scripts/File.cs:NN`, and they cannot carry a version in the path. What is not real is copying the whole tree to provide it.

The directory name also records less than the script already knows. `server-scripts-0.9.29.0` is named from a version string the operator types on the command line, while `SNAPSHOT.toml` inside it records the assembly hash and the Steam build identifier the script read for itself. The name depends on the one input nothing verifies.

## What Changes

- Write each decompile once, into a store entry named from facts the script reads rather than from an argument the operator types.
- Make `server-scripts/` a pointer to the current entry, so the 510 citations keep resolving against an unchanged path.
- Keep the version string as recorded metadata rather than as the identifier, since it comes from a changelog and cannot be derived from the assembly.
- Refuse to write output that is not ignored by Git, rather than trusting a `.gitignore` entry to be correct.
- Retain a bounded number of previous entries, because the update workflow diffs the new decompile against the previous one, and prune the rest deliberately.

## Capabilities

### New Capabilities

- `decompiled-source`: how decompiled game source is produced, named, retained, and referenced, so a citation resolves and a snapshot can be traced to the assembly it came from.

### Modified Capabilities

None. `game-toolchain` in `crossover-bottle-only-setup` covers the game installation. This change covers what is derived from it.

## Impact

- **Changed:** `scripts/update-server-scripts.sh` writes one entry and updates the pointer. `.gitignore` covers the store and the pointer.
- **Storage:** one copy per decompiled assembly instead of two, and a stated retention instead of accumulation. The current tree holds five directories of about 5.1 MB each.
- **Unchanged:** the path in all 510 citations, the `citations check` and `citations fix` commands, and the content of the decompiled output.
- **Workflow:** the version-update skill gains the pointer and the store in its diff step. The staleness guard that compares the assembly hash against the recorded snapshot keeps working, because that hash is what names the entry.
- **Depends on:** nothing. This is independent of `crossover-bottle-only-setup` and can land before or after it.
