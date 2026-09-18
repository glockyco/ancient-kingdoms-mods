# Combat model verification

The verification corpus compares the TypeScript combat engine with observations from the current
Ancient Kingdoms assembly. A fixture declares an independent build and scenario. The game records the
result. The website test suite performs the comparison.

## Record observations

Close Ancient Kingdoms and other HotRepl clients. The verifier requires exclusive access to the game
installation, native process, and HotRepl endpoint.

Record the complete corpus:

```bash
dotnet run --project build-tool verify
```

Record selected fixtures by repeating `--fixture`:

```bash
dotnet run --project build-tool verify \
  --fixture B-target-damage \
  --fixture D-class-warrior
```

The verifier validates every fixture before it launches the game. It then runs each selected fixture
in a separate game session and writes `verification/observations/<fixture>.json`. A failed fixture does
not write an observation, and the command continues with the remaining fixtures. Review every changed
observation before committing it.

Run the comparison from `website/`:

```bash
pnpm test --run src/lib/planner/verification/verification.test.ts
```

This test reads every fixture and committed observation, runs the production event engine with the
fixture's seed and replicate count, and prints one verdict per fixture. It also derives handler,
damage-school, class, and companion-archetype coverage from passing execution traces.

## Isolation guarantee

Each fixture gets a newly prepared database under `verification-scratch` in the game data directory.
The verifier refuses traversal, symbolic links, a pre-existing HotRepl host, and a runtime session that
does not match the process it launched. The game must report the exact canonical scratch database path
before the verifier creates or enters a character.

Before the first session, the verifier hashes the player database and its sidecars and creates a
backup when they exist. It checks the hashes after every session. The run fails if any player-save file
changes. Scratch state is removed only after the owned HotRepl endpoint and native game process have
stopped. A shutdown that cannot be confirmed leaves the scratch state for inspection instead of
risking deletion outside the owned directory.

The game writes each measurement artifact beside the scratch database. The build tool accepts it only
when its reported path is inside that directory, its byte count matches, and its SHA-256 hash matches.
The game side never calls the TypeScript engine.

## Observation format

An observation has schema version 1 and these top-level sections:

- `fixture`: fixture name, tier, coverage label, repository path, and content SHA-256;
- `game`: assembly SHA-256, game version, and Steam build ID;
- `recordedAt`: UTC capture time;
- `achieved`: the materialized character, equipment, skills, consumables, and companions read back from
  the game;
- `observation`: the seed, achieved character identity, active effects, target state, and measurement
  samples.

Each measurement names its quantity, unit, sampling unit, window length, samples, and action counts.
Timed samples can include player hits, action attempts, completions, intervals, companion damage, and
settled target state. Consumers must use the recorded sampling unit; a hit and a timed window are not
interchangeable samples.

## Comparison protocol

The tiers test different contracts:

- Tier A compares deterministic stat-sheet and legality quantities exactly.
- Tier B compares each listed skill's per-hit output with the engine's integer support band. One hit
  outside the band fails the quantity. Target debuffs also compare the active effect and settled target
  stat.
- Tier C compares deterministic action counts and intervals. An observed interval may differ from the
  exact engine interval by up to three average game frames because both window endpoints and action
  completion occur on frame boundaries.
- Tier D compares observed and engine damage samples with a two-sample Welch test at significance
  level 0.01. One complete timed window is one sample. Player and companion damage remain separate
  quantities. Player damage excludes a late projectile from the warm-up action because that action
  began before the rotation window.

Each stochastic fixture declares a minimum sample count. The protocol does not correct across the
fixture corpus because every fixture is reviewed independently. Never widen a tolerance after a
failure to make the fixture pass.

## Read the verdicts

- `pass`: every compared quantity satisfies its declared criterion.
- `fail`: at least one quantity rejects. The report names the quantity and criterion, not a guessed
  cause. Inspect the fixture, observation, game implementation, and engine before changing either.
- `inconclusive`: no quantity rejects, but at least one stochastic quantity has fewer samples than its
  declared minimum. Record more complete windows or fix the measurement loss. Do not treat this as a
  pass.
- `stale`: the observation assembly SHA-256 differs from `server-scripts/SNAPSHOT.toml`. It is neither
  current evidence nor a model failure. Re-record the fixture on the matching current game build.
- `missing`: the fixture has no committed observation. Record it before making a corpus-wide claim.

A game-version update is incomplete while any fixture is stale or missing. The current corpus must
contain no failed or inconclusive fixture and must credit every declared handler, school, supported
class, and companion archetype before a full-domain claim is valid.
