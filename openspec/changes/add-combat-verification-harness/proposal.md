## Why

Reading the decompiled source establishes what the code says, not that a model of it agrees with the
running game. The damage path branches on class, skill type, damage school, and entity kind, several
published values are derived rather than stored, and at least one stored value is a snapshot valid only
at a single level. A planner that publishes damage figures therefore needs a repeatable way to check
them against the game, and a player who reports a mismatch needs that report reproduced rather than
argued about.

## What Changes

- Add a build fixture descriptor: a declarative statement of a character, its companions, its
  consumables, and the target it is measured against. One schema serves both an authored validation
  fixture and a build exported from a player's game.
- Add materialization of a fixture inside the running game through the engine's own paths. Character
  creation, experience award, skill point spending, item grant, and equip all use the methods the game
  uses, so a fixture cannot occupy a state the game could not produce.
- Add a probe that reads the live stat sheet, the observed action interval, and a per-hit damage trace
  that records the skill the game chose.
- Add a comparison that comes back as a parity report: predicted against observed, per quantity, with
  the fixture and model version recorded.
- Add a golden baseline and a drift gate, in the same posture as the existing citation ledger. A game
  update that changes a measured quantity fails loudly.
- Add a diagnostic ladder so a failure localises. Stat sheet, single hit, action cadence, and full
  rotation are separate fixture tiers, and a rotation failure with the lower tiers passing points at
  the rotation.
- Add isolation. A verification run redirects the game's database path to a scratch save, so fixture
  characters never touch a player's save.

Non-goals:

- Automating gameplay for a player's benefit. This harness exists to measure, and it runs only when
  invoked for verification.
- Replacing the export mod. Character capture is owned by `character-state-export` in the planner
  change. This change consumes that payload.
- Proving bit-exact reproduction. The engine draws from a shared random generator, so the harness
  asserts on means and bounds rather than on an exact sequence.

## Capabilities

### New Capabilities

- `combat-fixture`: What a fixture descriptor is and what materializing one guarantees. Covers the
  descriptor contents, the legality rules that keep a fixture reachable in normal play, the engine
  paths used to build it, isolation from player data, and reuse across runs.
- `combat-verification`: What the harness measures and what a parity report guarantees. Covers probe
  fidelity, the quantities compared, tolerance and determinism, the diagnostic tiers, the golden
  baseline and its drift gate, and intake of a player-reported build.

### Modified Capabilities

- `game-toolchain`: A verification run launches the game, redirects its database path, and drives it
  through registered commands. The capability currently defines one game installation and how tooling
  reaches it, so the added run mode changes its requirements.
- `runtime-control`: The run needs a command that points the game's database at a location the run owns,
  and needs a reported path to be resolvable on the host before it is acted on. The capability defines
  the command surface, so those guarantees belong to it.

## Impact

- `mods/`: a new mod registering typed HotRepl commands for materialize and probe, plus a Harmony
  postfix on the damage entry point to record a per-hit trace with skill attribution. The existing
  `HotReplCommands` and `FieldDefaultValueHookFix` mods establish both patterns.
- `build-tool/`: a new command that orchestrates launch, materialize, probe, compare, and report. It
  shares the launch session and the protocol session with the export command rather than repeating
  either.
- Fixture descriptors and the golden baseline are committed. Scratch save files are not.
- `openspec/specs/game-toolchain`: a delta for the verification run mode.
- The planner change `add-gear-and-rotation-planner` depends on this harness to satisfy its
  requirement that predicted values are validated against the running game.
