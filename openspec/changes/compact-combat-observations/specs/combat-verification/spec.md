## MODIFIED Requirements

### Requirement: Four diagnostic tiers define required coverage

Tier A SHALL cover stat totals across progression, equipment, augments, set thresholds, caps,
consumables, and learned books for every supported class. Tier B SHALL cover one landed hit for every
damaging skill handler and every damage school, with the target's settled state read from the target.
Tier C SHALL cover the basic-attack interval across weapon delay and haste, including the floor. Tier D
SHALL cover a repeated rotation window per supported class with resource transitions and one
maintained effect, and a bare and an equipped window for every mercenary archetype. Every Tier D
window SHALL record the resource values only when they change. Each class Tier D window SHALL
identify the maintained effect it observed. Coverage SHALL be established by executed evidence for
each handler, school, class, and archetype, not by a fixture label.

#### Scenario: A tier B fixture is mislabelled

- **WHEN** a fixture labelled for one handler reaches a different handler in its trace
- **THEN** the coverage check does not credit the labelled handler

#### Scenario: A class has no tier D observation

- **WHEN** a supported class has no current tier D observation
- **THEN** the coverage report names the class as uncovered

#### Scenario: A tier D window holds one resource value across many frames

- **WHEN** the runtime reads the same resource values repeatedly before the next transition
- **THEN** the committed sample records one resource state for that interval
- **AND** it records the next state when either resource changes

#### Scenario: A tier D fixture declares a maintained effect

- **WHEN** the rotation window completes
- **THEN** the committed sample identifies the effect observed during that window
- **AND** the sample does not infer maintenance from the fixture label

### Requirement: An observation records its evidence

Every observation file SHALL use the current observation schema version. It SHALL record the assembly
hash with version and Steam build labels, the fixture name and content hash, the achieved state, the
seed, and each quantity's unit, window, sampling unit, raw samples, and attempted, accepted, completed,
and landed counts. A damage window SHALL record its attribution fidelity. An observation whose run did
not complete every stage SHALL record the failed stage and SHALL NOT count as evidence.

A Tier B raw sample SHALL remain one landed hit. A Tier D raw sample SHALL be one rotation window and
SHALL record its duration, player damage total, companion damage totals with entity and archetype,
action counts, fidelity, and resource transitions. A class Tier D sample SHALL also record
maintained-effect evidence. A Tier D sample SHALL NOT include frame-level action attempts or
individual hit records. The full runtime trace MAY remain in run-owned
scratch storage for diagnosis, but it SHALL NOT be a committed observation.

#### Scenario: The damage stamp fails to apply

- **WHEN** the skill-attribution patch does not apply during a tier D window
- **THEN** the observation records the lower fidelity
- **AND** the tier D comparison for that fixture is incomplete

#### Scenario: A tier D trace contains many hits and attempts

- **WHEN** the verifier writes the committed observation
- **THEN** it derives one raw sample for each completed window
- **AND** the sample retains the values needed to reproduce the verdict
- **AND** the sample omits individual hits and frame-level attempts

#### Scenario: An older observation schema is loaded

- **WHEN** a committed observation does not use the current schema version
- **THEN** verification refuses it with its path and schema version

### Requirement: Comparison follows a predeclared protocol

A deterministic quantity SHALL compare exactly. A stochastic quantity SHALL compare the observed
samples with the engine's replicate distribution using a declared minimum sample count, a declared
significance level, and a hard support bound where the engine defines one. Fewer samples than the
minimum SHALL be inconclusive, not a pass. A rejection SHALL name the failed criterion and SHALL NOT
name a cause. A tolerance SHALL NOT be widened after a failure to make the failure pass.

#### Scenario: A per-hit ratio leaves the support band

- **WHEN** one observed hit falls outside the band the engine's steps allow
- **THEN** the comparison fails with the hit and the band

#### Scenario: A window has too few samples

- **WHEN** a tier D observation has fewer windows than the declared minimum
- **THEN** the comparison reports inconclusive
- **AND** it does not report a pass

### Requirement: Committed observations are the baseline

Observation files SHALL be committed under version control and reviewed as diffs. The comparison SHALL
run as a website test against the committed files. A temporary diagnostic trace SHALL NOT take part in
the comparison. An observation whose assembly hash differs from the current source snapshot SHALL be
reported as stale and SHALL NOT count as current evidence. The game-version update procedure SHALL
require a current observation for every committed fixture before publication.

#### Scenario: The game is updated

- **WHEN** the source snapshot records a new assembly hash
- **THEN** every existing observation is reported stale
- **AND** the version update procedure does not complete until each is re-recorded

#### Scenario: A diagnostic trace is absent

- **WHEN** a committed compact observation contains every required sample value
- **THEN** verification uses that observation without the temporary diagnostic trace
