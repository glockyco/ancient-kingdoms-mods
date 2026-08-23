## Context

See proposal.md - Why.

The current layout and its measurement:

```
server-scripts/            5.1M  502 files   ← 510 citations resolve here
server-scripts-0.9.29.0/   5.1M  502 files   ← diff -rq against the above: no output
server-scripts-0.9.28.1/   5.2M
server-scripts-0.9.28.0/   5.2M
server-scripts-0.9.27.2/   5.2M
```

`SNAPSHOT.toml` inside each tree already records everything a name would need:

```toml
game_version    = "0.9.29.0"      ← typed by the operator
assembly_sha256 = "5bcb73bc…"     ← computed by the script
steam_build_id  = "24771490"      ← read from the application manifest
```

The sibling Ardenfall project solves the same problem and is the model. It stores `.decompiled/steam-<build>-<digest>/` with a `meta/manifest.json`, refuses to write outside its store without an explicit flag, and asserts the destination is ignored before writing. It has no equivalent of the citation path, so it needs no pointer.

## Goals / Non-Goals

**Goals**

- One tree per decompiled assembly.
- A name that cannot disagree with the tree it names.
- The citation path unchanged, so no recorded reference moves.

**Non-Goals**

- Changing decompiler options, the pinned tool version, or the produced C#. A byte-identical output is a success condition, not a nice-to-have.
- Touching the citation format or the `citations` commands.
- The staleness guard, which is correct and keeps working.
- Deduplicating content across trees. Successive decompiles share most of their bytes, and a content-addressed store per file would be a filesystem, not a fix.

## Decisions

**The pointer is a symlink, not a copy.** Alternatives: keep the copy and accept the duplication, which is the current state and the thing being removed. Teach the 510 citations to carry a version, which makes every citation churn on every patch and breaks the `citations check` premise that a citation names a stable location. Write a resolver that maps the stable path to the current tree, which is a layer of indirection for something the filesystem already provides.

**The name carries the build identifier and the assembly digest, in that order.** The build identifier sorts and reads chronologically. The digest disambiguates and is the value the staleness guard already compares. Together they make the directory name a claim that can be checked against the tree it names, which the typed version string cannot be.

**The supplied version stays, as metadata.** It comes from a changelog and cannot be derived from the assembly, and the update workflow and the website both speak in those terms. It is recorded, not trusted as an identifier.

**The gitignore assertion is copied from the sibling project.** The current script relies on two `.gitignore` lines being correct. The material is not ours to redistribute, so the check is worth its few lines, and the sibling already demonstrates the pattern.

**Retention is a stated number, not unbounded.** The workflow needs the previous tree to diff against. Nothing needs the fourth. A number in the script, reported when it prunes, makes the decision visible instead of leaving the directory to grow.

## Risks / Trade-offs

**A symlinked path behaves differently for tools that do not follow links.** → `citations check`, `grep`, and the diff step all read through symlinks by default. Task 4.2 exercises each of them against the pointer before the old layout is removed.

**Pruning deletes output that is expensive to regenerate.** → Regeneration needs only the assembly for that build, which is no longer available once the installation moves on. So the retention number is the real decision, and the tasks require it to be stated with its reason rather than picked.

**A migration that moves 26 MB can lose the current tree.** → The migration writes the new store from the existing trees, verifies the pointer resolves and the citations pass, and only then removes the old directories.

## Migration Plan

1. Store the current decompile as the first entry, named from its recorded build identifier and assembly digest.
2. Point the stable path at it and confirm all 510 citations resolve.
3. Move the retained previous trees into the store, then remove the old directories.
4. Update the script to write one tree, move the pointer, assert the destination is ignored, and prune to the retention limit.
5. Run a decompile end to end and confirm the output is byte-identical to the tree it replaces.

Rollback is restoring the previous directories from the store, since step 3 moves rather than regenerates them.
