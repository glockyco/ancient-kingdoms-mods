## Context

See `proposal.md` for motivation. The runtime mod writes a detailed observation beside each scratch database. `build-tool verify` validates that artifact and currently copies its `observation` value into a committed record without normalization. The website verifier reads those records directly.

Tier D uses the rotation window as its independent sample. The website currently reconstructs each player total from the window's hit list. It reads companion totals directly. It does not consume frame-level action attempts, completion timestamps, intervals, incoming damage, refill counts, or absolute server timestamps for the Tier D verdict.

The current traces contain resource snapshots at driven action attempts. They do not record the class effect that the fixture must maintain. That missing evidence cannot be reconstructed from the fixture declaration without violating the coverage contract.

## Goals / Non-Goals

**Goals:**

- Make the committed Tier D record contain only evidence required by its comparison and coverage contracts.
- Preserve a detailed runtime trace until the run-owned scratch directory is removed.
- Make the committed format deterministic and reviewable.
- Refuse incomplete compact evidence instead of inserting defaults.
- Preserve all existing fixture verdicts after migration.

**Non-Goals:**

- Do not add Git LFS or a compressed binary format.
- Do not compact Tier A, Tier B, or Tier C sample data beyond the schema-version migration.
- Do not retain diagnostic traces in the repository or another permanent artifact store.
- Do not change the statistical protocol, fixture inputs, seeds, or replicate counts.
- Do not rewrite Git history to remove the original observations.

## Decisions

### Use observation schema version 2 as a clean cutover

Every committed observation moves to schema version 2. Readers accept version 2 only. Tier A, Tier B, and Tier C retain their existing measurement payloads. Tier D uses the compact window shape. This avoids a permanent compatibility branch for a repository-owned corpus.

### Normalize at the trusted host boundary

The runtime mod continues to return its detailed trace artifact. `build-tool verify` converts the trusted `JsonElement` into the committed record after artifact path and hash validation. The normalizer validates every required source field and fails the fixture when compaction would lose required evidence.

This boundary keeps runtime diagnostics useful and prevents the website from understanding the diagnostic format. It also keeps one writer responsible for the committed schema.

### Store one compact object per Tier D window

Each committed Tier D sample contains:

- `durationSeconds` relative to the window, not absolute server timestamps;
- `playerDamage`, calculated from retained attributed hits;
- `companionDamage`, with `entityId`, `archetype`, and total damage;
- attempted, accepted, completed, and landed counts;
- attribution `fidelity` and its limiting reason;
- ordered resource states, with relative time, mana, and energy, after consecutive equal states are removed;
- class-effect evidence when the fixture covers a player class.

The outer measurement keeps its unit, sampling unit, declared window, and aggregate counts. Tier D committed samples omit hits, attempts, completions, intervals, incoming blows, refill counters, and absolute timestamps.

### Record evidence online instead of inferring it from fixture labels

The runtime window records resource state changes while the window runs. It also observes player effects and aggregates each effect's first and last observation time. Consecutive frames do not produce duplicate records.

For a class Tier D fixture, the host normalizer matches effect evidence to a declared action by stable skill identity. It refuses a class observation when no declared effect was observed. Companion fixtures do not require class-effect evidence.

The existing Tier D companion records can be migrated from their detailed traces. The six class fixtures must be recorded again after the effect probe exists because their current traces contain no effect observation.

### Keep diagnostics run-owned

The detailed trace remains beside the scratch database while the run is active. Existing cleanup removes both on success, failure, or cancellation. The committed file contains no path to that temporary artifact and does not depend on it after the run.

### Parse Tier D independently in the website verifier

Add a Tier D sample parser instead of weakening the existing detailed window parser used by Tier B and Tier C. The Tier D comparison reads `durationSeconds`, `playerDamage`, and companion totals directly. Coverage reads class-effect and companion-archetype evidence from the compact sample.

### Migrate generated evidence, not history

A one-time migration converts all committed records to schema version 2. It derives compact companion samples from the current traces and replaces the six class observations with new recordings. The migration helper is temporary and is removed after the corpus is written and verified.

## Risks / Trade-offs

- New class recordings can produce different stochastic sample values. The fixed fixture, seed, and comparison protocol still require the same pass verdict.
- Effect observation adds a per-frame read during verification windows. The probe aggregates online, so committed size and runtime allocation remain bounded by state changes.
- Removing hit traces from committed Tier D files reduces post hoc diagnosis. A failing run retains its detailed trace until cleanup reporting completes, and the fixture can be rerun for diagnosis.
- The original large blobs remain in Git history. This avoids a disruptive history rewrite; future recordings no longer add comparable blobs.
