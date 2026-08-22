## Why

A build takes 145 seconds and does not produce the same output twice. A profile of one run shows where the time goes.

```
build                                   144.9 s
├── load_visual_assets                  126.3 s   87%
│   └── publish_image × 3211 @ 39 ms    125.1 s
├── denormalizers                        12.8 s
│   └── chest probability simulation     11.8 s
├── verify.check                          2.5 s
└── 8451 database inserts                 1.4 s
```

The database work is 1 percent of the build. The cost is image encoding.

`ENCODE_METHOD = 6` is the slowest lossless WebP setting. Measured over a random sample of 400 icons, method 4 encodes 27 times faster and produces output about 1.3 percent larger. The setting buys almost nothing and costs two minutes per build.

`compendium redactions check` pays the same cost for nothing. It recomputes the redaction decisions, and it needs the rows of `visual_assets` rather than the encoded files. `load_visual_assets` performs both jobs, so a read-only check encodes 3211 images into a temporary directory and deletes them. The check takes 132 seconds against 0.5 seconds for its sibling `citations check`. It runs on every commit that touches a redaction source file.

Fusing those two jobs already caused a defect. A first version of the check received the real static directory and republished six icons that redaction had deleted. A scratch directory hides that, and separating the jobs removes it.

`_calculate_exact_chest_probabilities` runs a 100,000 trial Monte Carlo with no seed anywhere in the codebase. Consecutive runs of one chest differ by up to 0.0032. Every build therefore publishes different drop chances for 14 chests with no data change, the name claims an exactness the method cannot provide, and the docstring states that it "matches actual game behavior exactly".

## What Changes

- Lower the lossless sprite encode to `method = 4`. Leave the lossy path at 6, where it covers about 70 images at roughly 1 ms each.
- Separate recording a visual asset in the database from publishing its file, so a caller that needs the manifest does not encode anything.
- Give the redaction recomputation the recording path, and delete the scratch directory that compensates for the fused one.
- Seed the chest simulation with a fresh generator per chest, and rename it to state that it estimates.
- Match the invariant scan against every identifier in one pass per value rather than one pass per identifier.

## Non-goals

- **No content-hash cache for encoded images.** It would save about 4 seconds beyond the method change and add a manifest, invalidation rules, and a staleness failure mode.
- **No parallel encoding.** A process pool adds complexity once encoding costs about 5 seconds.
- **No change to redaction behaviour.** Which entities are removed is decided by `separate-zone-redaction-mechanisms`.

## Capabilities

### New Capabilities

- `compendium-build`: What the build guarantees about its published output, covering reproducibility for unchanged input and the separation between recording an asset and publishing it.

## Impact

- **Pipeline:** `compendium/visual_assets.py`, `compendium/loaders/core.py`, `compendium/commands/redactions.py`, `compendium/denormalizers/items/special_types.py`, `compendium/redactions/verify.py`.
- **Published output:** about a quarter of the icons are rewritten once with slightly different bytes, totalling about 62 KiB across a 4.74 MiB set. The files are gitignored build output, so no diff results. Chest drop chances stop moving between builds.
- **Expected cost after the change:** build about 24 seconds, `redactions check` about 3 seconds.
