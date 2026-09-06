## Why

Source-derived formulas and legal fixture descriptors do not prove that a planner agrees with the
running game. The planner needs reproducible comparisons that distinguish setup differences, failed
measurements, model disagreements, random variation, and deliberate game-defect normalization.

## What Changes

- Share versioned build data between authored fixtures and character captures. Keep fixture execution
  settings separate from capture completeness and container metadata. Reject missing data required by
  a measurement rather than substituting defaults.
- Materialize each fixture through the game's creation, progression, allocation, and equipment paths.
  Confirm the achieved character, companions, consumables, target, and initial state before measuring.
  Keep the bounded companion-roll assignment exception and verify its effects after any reload.
- Execute declared player actions and observe autonomous companion actions. Record stat values,
  damage intent and outcomes, action timing, target effects, and sustained output with their units and
  measurement windows.
- Generate predictions through the planner's evaluation path from matching, versioned inputs. Compare
  requested and achieved setup separately from predicted and measured quantities. Do not replace
  predicted caster stats with measured totals to conceal a stat-model disagreement.
- Require complete execution, comparison, and retained evidence before a verification run succeeds.
  Descriptor validation alone is not model verification. Report missing coverage and failed stages.
- Commit fixture definitions and a reviewed baseline. Use deterministic checks for invariants and a
  declared statistical protocol for randomized quantities. A failed or incomplete comparison cannot
  become a verified baseline. Separate raw game parity from identified defect-normalized predictions.
- Retain fixture-content, game-build, data, model, and measurement provenance. Establish any accuracy
  claim from an adequate comparison corpus and independent validation, limited to its verified domain.
- Establish exclusive session ownership and verify a player-save backup before scratch mutation or
  launch. Confirm the owned database path, restore transient state on reuse, and check isolation after
  shutdown, including failure and cancellation.

Non-goals:

- Gameplay automation for a player's benefit. This harness runs only for verification.
- Character capture implementation. The planner change owns the capture producer; this change consumes
  its build data and reports missing capture sections.
- Bit-exact reproduction of random sequences or a universal accuracy percentage.
- A second combat model used only to make verification pass.

## Capabilities

### New Capabilities

- `combat-fixture`: Shared build data, fixture execution settings, legality, materialization readback,
  target and consumable state, and safe reuse.
- `combat-verification`: Measurements, fidelity, diagnostic coverage, per-quantity comparisons,
  provenance, statistical acceptance, reviewed baselines, and reported-build parity.

### Modified Capabilities

- `game-toolchain`: The complete verification lifecycle, exclusive ownership, backups, build identity,
  retained reports, and release acceptance.
- `runtime-control`: Scratch redirection, confirmation of the database in use, and safe translation of
  game-reported paths.

## Impact

- `mods/`: Typed materialization and probe commands, including skill-attributed damage observation.
- `build-tool/`: Orchestration through the existing launch and protocol sessions, with fixture execution,
  comparison, report persistence, and baseline gating.
- `verification/`: Committed descriptors and reviewed baselines. Scratch databases remain uncommitted.
- `add-gear-and-rotation-planner`: Supplies build adapters and the evaluation path. Its verification and
  accuracy tasks depend on complete harness evidence, not on callable components alone.
