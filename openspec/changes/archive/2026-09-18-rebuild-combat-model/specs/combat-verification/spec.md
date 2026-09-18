## Purpose

Defines what a verified combat fixture guarantees: the game reached the requested state, the
measurement was recorded with its provenance, and the committed observation agrees with the engine's
predictive distribution under a declared protocol.

## ADDED Requirements

### Requirement: Fixtures and captures share build data without sharing outer records

An authored fixture and a captured character SHALL carry the same versioned logical build data:
progression, attributes with raw, base, allocated, and derived meanings, skills per point pool,
equipment and augments by stable asset identifier, companions with their rolls and equipment,
consumables and ammunition with quantities, and declared `learnedBookIds`. A fixture SHALL add
execution data: target, initial state, action schedule, facing, seed, horizon, boundary policy, and
the tier measurement it requests. A capture SHALL add completeness markers and container metadata.
Neither outer record SHALL be required to match the other. An unsupported schema version SHALL be
refused before use.

#### Scenario: A fixture and a capture hold the same build

- **WHEN** a fixture and a capture contain identical logical build data
- **THEN** both reach the same engine input
- **AND** each keeps its own outer metadata

#### Scenario: A schema version is unsupported

- **WHEN** a record names an unsupported schema version
- **THEN** it is refused before materialization or evaluation

### Requirement: Learned-book declarations are explicit

`learnedBookIds` SHALL list stable item identifiers. An empty list SHALL mean that no books are
learned. A missing or unread list SHALL be incomplete and SHALL stop dependent work. An unknown or
duplicate identifier SHALL be refused without deduplication. A capture SHALL read learned state, not
inventory ownership, and SHALL NOT call a learning or reset path.

#### Scenario: A duplicate identifier is declared

- **WHEN** `learnedBookIds` contains one identifier twice
- **THEN** materialization and evaluation are refused with that identifier

### Requirement: Shape is checked before launch and legality after world entry

A check that needs no game state SHALL run before launch: schema version, required sections for the
requested tier, duplicate slots, and out-of-domain values. A check the game answers SHALL run after
world entry against the game's own definitions: point budgets, tier gates, prerequisites, class and
level requirements, slot categories, and companion roll envelopes. The harness SHALL NOT copy a game
table to answer a game question.

#### Scenario: A descriptor requests unreachable skill levels

- **WHEN** a well-formed descriptor requests more skill levels than its points allow
- **THEN** the shape check accepts it
- **AND** the game-backed check refuses it and names the shortfall

### Requirement: Materialization uses engine paths and proves the achieved state

Character creation, progression, allocation, item granting, equipping, book learning, and hiring SHALL
use the game's own paths. Each mutation SHALL read before and after and SHALL fail with the step and
the unchanged value when it has no effect. A stated equipment section SHALL describe every slot, and an
undeclared slot SHALL be emptied. After materialization the harness SHALL read back every requested
field and SHALL stop dependent measurement on a mismatch, naming the field.

The bounded exception is companion rolls: after hire, the harness MAY assign health multiplier,
resource multiplier, and base combat roll inside the envelope the hire path can produce, and SHALL
read them back. It SHALL NOT assign race.

#### Scenario: A grant has no effect

- **WHEN** an item grant leaves the inventory unchanged
- **THEN** materialization fails and names the item and the step

#### Scenario: Achieved state differs from the request

- **WHEN** readback finds a skill level that differs from the fixture
- **THEN** no observation is written for that fixture
- **AND** the report names the skill and both values

### Requirement: Four diagnostic tiers define required coverage

Tier A SHALL cover stat totals across progression, equipment, augments, set thresholds, caps,
consumables, and learned books for every supported class. Tier B SHALL cover one landed hit for every
damaging skill handler and every damage school, with the target's settled state read from the target.
Tier C SHALL cover the basic-attack interval across weapon delay and haste, including the floor. Tier D
SHALL cover a repeated rotation window per supported class with resource transitions and one
maintained effect, and a bare and an equipped window for every mercenary archetype. Coverage SHALL
be established by executed evidence for each handler, school, class, and archetype, not by a fixture
label.

#### Scenario: A tier B fixture is mislabelled

- **WHEN** a fixture labelled for one handler reaches a different handler in its trace
- **THEN** the coverage check does not credit the labelled handler

#### Scenario: A class has no tier D observation

- **WHEN** a supported class has no current tier D observation
- **THEN** the coverage report names the class as uncovered

### Requirement: An observation records its evidence

An observation file SHALL record the assembly hash with version and Steam build labels, the fixture
name and content hash, the schema versions, the achieved state, the seed, and for each quantity its
unit, window, sampling unit, raw samples, and attempted, accepted, completed, and landed counts. A
damage window SHALL record the attribution fidelity it reached. An observation whose run did not
complete every stage SHALL record the failed stage and SHALL NOT count as evidence.

#### Scenario: The damage stamp fails to apply

- **WHEN** the skill-attribution patch does not apply during a tier D window
- **THEN** the observation records the lower fidelity
- **AND** the tier D comparison for that fixture is incomplete

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

- **WHEN** a tier D window has fewer landed hits than the declared minimum
- **THEN** the comparison reports inconclusive
- **AND** it does not report a pass

### Requirement: Committed observations are the baseline

Observation files SHALL be committed under version control and reviewed as diffs. The comparison SHALL
run as a website test against the committed files. An observation whose assembly hash differs from
the current source snapshot SHALL be reported as stale and SHALL NOT count as current evidence. The
game-version update procedure SHALL require a current observation for every committed fixture before
publication.

#### Scenario: The game is updated

- **WHEN** the source snapshot records a new assembly hash
- **THEN** every existing observation is reported stale
- **AND** the version update procedure does not complete until each is re-recorded
