## Context

See proposal.md - Why for the profile and the measurements.

Three facts shape the approach.

**The published image set is not tracked.** `website/.gitignore:18` ignores `/static/images/`, and `git ls-files` returns nothing there. Rewriting every icon costs a deploy upload and produces no diff and no review.

**The encoder is already deterministic.** The same source encoded twice produces the same bytes, measured 60 times at each setting. Every icon on disk matches a fresh encode of its source. Output is fixed by the source bytes, the pre-encode steps, the encoder settings, and the versions of Pillow and libwebp.

**Recording and publishing are one function today.** `load_visual_assets` inserts the manifest rows and encodes the files in one pass, so a caller cannot have one without the other.

## Goals / Non-Goals

**Goals**

- A build that a developer can run repeatedly while working.
- A redaction check cheap enough to stay in the pre-commit hook next to `citations check`.
- Published values that do not move without a cause.

**Non-Goals**

- Faster loaders or a faster database. Inserts cost 1.4 seconds of 145.
- Preserving file modification times across builds. Nothing depends on them.
- Changing which entities redaction removes.

## Decisions

### The lossless sprite encode uses method 4

Measured over 400 random icons: method 6 takes 16.91 seconds, method 4 takes 0.64 seconds, and 109 of the 400 outputs differ by a total of 7.5 KB. That is 27 times faster for about 62 KiB more across the 4.74 MiB published set, which is 1.3 percent. Note that `du -sh` reports 15M for that directory, which is block padding across 3195 small files rather than content.

The lossy path stays at method 6. It covers about 70 images at roughly 1 ms each, so the setting costs nothing there.

Alternatives considered:

- **Cache encoded output by source hash.** Rejected for now. Hashing the corpus costs 50 ms and would make a warm build about 4 seconds faster than the method change alone. It buys that with a manifest file, invalidation rules, and a new way for the published set to go stale.
- **Encode in parallel.** Rejected. Fifteen cores could hide the cost, but a process pool is complexity added to a step that will take about 5 seconds.
- **Method 2 or method 0.** Method 2 matches method 4 in the sample. Method 0 produces larger files. Method 4 is the documented middle setting and leaves room to move in either direction.

### Recording an asset returns a manifest, and publishing writes the file

The loader gains a form that records rows without encoding. The build calls both. The redaction recomputation calls only the first.

This is the fix for a defect rather than only an optimisation. The first version of `redactions check` received the real static directory and restored six icons that redaction had deleted. The current scratch directory prevents the damage without removing the cause, and it still pays 126 seconds to encode files that are immediately discarded.

Alternatives considered:

- **Keep the scratch directory.** Rejected. It leaves a read-only command holding a publishing path, and the next caller has to remember the same workaround.
- **A boolean parameter on the existing function.** Rejected. A flag that removes most of what a function does is a second function wearing the first one's name.

### The chest simulation uses a fresh generator seeded with zero

A module-level `random.seed(0)` would make each chest depend on how many draws every preceding chest consumed, so adding a reward to one chest would change the numbers of every chest after it. A `random.Random(0)` constructed per call makes the estimate a pure function of the reward list and the item count. It also leaves the global generator alone.

Entity identifiers were considered as the seed and rejected, because chest identifiers are not guaranteed to be stable across exports.

The function is renamed to say that it estimates. Its current name claims an exactness that a 100,000 trial simulation does not provide, and its docstring says it matches the game exactly.

### The invariant scan matches all identifiers in one pass

The scan calls a boundary test 11.5 million times, once per identifier per value. One matcher built from all identifiers, applied once per value, replaces the inner loop. This is the smallest of the three wins at about 2.5 seconds, and it removes a loop rather than adding a mechanism.

## Risks / Trade-offs

**A toolchain upgrade changes the published bytes** → `uv.lock` pins Pillow, so an upgrade is a deliberate act with a visible diff. A fixture test that records hashes for a handful of images would turn a silent change into a failure. Deferred as a judgement call, see Open Questions.

**Splitting record from publish lets a caller record without publishing** → the build must do both, and a spec scenario requires every recorded asset to have a published file. The existing `visual_assets.reconcile` step already fails when the two disagree.

**Seeding the simulation moves 14 published values once** → the values move by less than 0.004 and stop moving afterwards. Recording the before and after values in the task list makes the one-time shift reviewable.

**Method 4 rewrites about a quarter of the icons once** → the files are gitignored build output. The deploy uploads them once.

## Migration Plan

No data migration. The build rewrites the published image set on the next run. Rollback is reverting the constant, which restores the previous bytes because the encoder is deterministic.

## Open Questions

- Should a fixture test record image hashes to catch a Pillow or libwebp upgrade changing the output? It costs a few small images and one test. The protection matters most for the lossy path, where a silent settings change would degrade quality invisibly. This does not affect the specs, the approach, or the task breakdown.
