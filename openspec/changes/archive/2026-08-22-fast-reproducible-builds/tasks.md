## 1. Establish the baseline

- [x] 1.1 Record the current build time, the `redactions check` time, and the profile of one build, so every later claim compares against a measurement.
- [x] 1.2 Record the size of `website/static/images` and the count of published files.
- [x] 1.3 Record the published chest drop chances for the 14 chests that carry them, so the one-time shift from seeding is reviewable.

## 2. Reproducible estimates

- [x] 2.1 Give the chest simulation a `random.Random(0)` constructed inside the call, so the estimate does not depend on how many draws earlier chests consumed.
- [x] 2.2 Rename the function to say that it estimates, and correct the docstring that claims it matches the game exactly.
- [x] 2.3 Add a test that the same reward list and item count produce the same numbers twice, and that changing one chest leaves another chest unchanged.
- [x] 2.4 Compare the published chances against the task 1.3 record, and confirm every movement is simulation noise rather than a change of behaviour. Measured: the largest movement is 0.00488 across 283 rewards, and the mean is 0.00066. Twelve independent runs of the affected chest give the estimator a standard deviation of 0.00177, so two runs differ with a standard deviation of 0.0025 and the largest of 283 comparisons is expected near 0.0075. The threshold of 0.004 first written here came from one chest and was too tight for 283 comparisons.

## 3. Encode settings

- [x] 3.1 Lower the lossless sprite encode to method 4, leaving the lossy path at 6.
- [x] 3.2 Record the measured encode time and the total published size against the task 1.1 and 1.2 baseline. Measured: build 146.2s to 27.7s, encoding 126.4s to 6.9s, published set 4,969,726 to 5,027,472 bytes, which is +1.16 percent over the same 3195 files.
- [x] 3.3 Add a test that encoding one source twice produces the same bytes, so a toolchain change that breaks determinism fails rather than passes quietly.

## 4. Recording separated from publishing

- [x] 4.1 Split the visual asset loader so that recording the manifest rows and publishing the encoded files are separate steps, without a flag that switches off most of one function.
- [x] 4.2 Point the redaction recomputation at the recording step, and delete the scratch static directory that compensates for the fused one.
- [x] 4.3 Prove the recomputation publishes nothing: count the files in `website/static/images` before and after `redactions check`, and confirm the directories for removed entities stay absent. Measured: 3195 files before and after, and the four directories for removed entities stay absent. The check fell from 131.6s to 2.06s.
- [x] 4.4 Prove the build still publishes every recorded asset, by confirming `visual_assets.reconcile` reports no orphan and the file count matches the row count. Measured: 3195 rows and 3195 files, with no row lacking a file and no file lacking a row. Reconcile removed the 16 assets of excluded entities as before.

## 5. Invariant scan

- [x] 5.1 Match every identifier in one pass per value rather than one pass per identifier, keeping the whole-identifier rule that lets `key_to_old_valorath` pass. Measured: the scan over the published database fell from 2.3s to 0.28s. The rule now has one implementation, shared by the database scan, the file path scan, and the prerendered content scan.
- [x] 5.2 Confirm the existing scan tests still pass unchanged, including the underscore wildcard case and the allowance cases. Measured: 23 tests pass with no edit to any test file.

## 6. Close out

- [x] 6.1 Run `cd build-pipeline && uv run pytest`, `uv run mypy .`, and `uv run ruff check`. Measured: 149 tests and 13 subtests pass, mypy clean over 96 files, ruff clean and formatted.
- [x] 6.2 Rebuild end to end and record the new build time against the task 1.1 baseline, explaining any step that did not move as expected. Measured: 13.79s and 14.14s against 135s before the change, which is 9.7 times. The baseline of 146.2s recorded in task 1.1 was taken under cProfile, so the fair comparison uses the six unprofiled runs of 133.8 to 137.7 seconds observed before the change.
- [x] 6.3 Run `compendium redactions check` and record its time. Confirm it is fast enough to keep in the pre-commit hook. Measured: 2.06s directly and 2.35s through `pnpm check:redactions`, against 131.6s before. Its sibling `citations check` takes 0.52s, so it stays in pre-commit.
- [x] 6.4 Rebuild a second time and confirm the published values are identical to the first, which is the reproducibility requirement measured rather than asserted. Measured: two consecutive builds give the same sha256 for `compendium.db` and the same combined sha256 over all 3195 published images.
- [x] 6.5 Decide the open question on a fixture hash test, and either add it or record why not. Added, for a fixture drawn in code rather than an exported image. A synthetic source never changes, so a failure means the encoder changed and not the game data. Lowering the sprite effort to 0 makes it fail, which is how I checked that it catches drift.
