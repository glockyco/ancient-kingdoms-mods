## Purpose

Defines what the harness measures inside the running game and what a parity report guarantees, so a
disagreement between a predicted figure and the game is unambiguous and localised rather than a matter
of opinion.

## ADDED Requirements

### Requirement: A probe reads, and reports whatever it must stop

Measurement SHALL read game state. It SHALL NOT change state, except through the actions a fixture
declares, or to stop a mechanism that rewrites the value under measurement.

A value that another mechanism rewrites between two samples belongs to neither sample. A probe MAY stop
such a mechanism before it reads. The probe SHALL report every value it cleared, and it SHALL NOT
change a value that a fixture declared.

#### Scenario: A measurement completes

- **WHEN** a probe finishes
- **THEN** no state has changed beyond the declared actions and the reported stops

#### Scenario: The subject acts while it is measured

- **WHEN** a probe measures a value that the subject's own actions rewrite
- **THEN** the probe stops those actions before it reads
- **AND** the report names each value it cleared and the value held before

#### Scenario: The subject does not settle

- **WHEN** two consecutive samples disagree after the stop
- **THEN** the probe reports the reading as unattributable instead of a number

#### Scenario: A required object is absent

- **WHEN** the local player or the target is not available
- **THEN** the probe reports that it cannot run rather than substituting a value

### Requirement: Actions are driven through the game's own command path

An action SHALL be issued through the same command the interface sends, so that every gate the game
applies is applied.

The report SHALL record when a requested action was refused, and why.

#### Scenario: An action is refused for cost

- **WHEN** a requested action exceeds the available resource
- **THEN** the game refuses it
- **AND** the report records the refusal rather than counting the action

#### Scenario: An action is refused for an unlearned skill

- **WHEN** a fixture requests a skill the character has not learned
- **THEN** the refusal is recorded and the measurement continues or fails as configured

### Requirement: Probe fidelity is declared with every measurement

The harness SHALL declare which fidelity tier a measurement achieved. Available tiers are aggregate
totals, per-hit amounts without skill attribution, and per-hit amounts with the skill the engine
selected.

A rotation comparison SHALL require the tier that attributes a hit to a skill.

#### Scenario: The attributing mechanism is unavailable

- **WHEN** the mechanism that attributes a hit to a skill cannot be applied
- **THEN** the measurement proceeds at a lower tier
- **AND** the report states the tier reached, and a rotation comparison is not claimed

#### Scenario: A rotation is compared

- **WHEN** a rotation comparison is reported
- **THEN** the measurement recorded which skill the engine chose for each hit

### Requirement: Comparison is per quantity, not a single verdict

A parity report SHALL compare each measured quantity separately and report each result. Quantities
include every stat on the sheet, the observed action interval, the per-hit damage, and the sustained
output.

A report SHALL identify the fixture, the target, the game version, and the model version.

#### Scenario: One quantity disagrees

- **WHEN** a single stat disagrees and the rest match
- **THEN** the report identifies that stat
- **AND** the matching quantities are still reported as compared

#### Scenario: A report is read later

- **WHEN** a stored report is reviewed
- **THEN** the fixture, target, game version, and model version are recoverable from it

### Requirement: Fixtures are tiered so a failure localises

The fixture set SHALL include tiers that exercise the stat sheet without combat, a single hit per skill
class, the action interval across weapon speed and haste, the target's own state under a maintained
effect, and a full rotation.

A report SHALL present tier results in order, so that the lowest failing tier is evident.

#### Scenario: A rotation disagrees while lower tiers match

- **WHEN** the rotation tier fails and the stat, single-hit, interval, and target-state tiers pass
- **THEN** the report attributes the disagreement to the rotation

#### Scenario: A target-state tier is measured

- **WHEN** an effect that alters a target's avoidance or mitigation is applied
- **THEN** the target's own stats are read before and after
- **AND** the landing rate over repeated attempts is reported beside the predicted probability

#### Scenario: The stat tier fails

- **WHEN** the stat sheet tier fails
- **THEN** the higher tiers are reported as unreliable, because they depend on it

### Requirement: Random variation is bounded, not assumed away

The harness SHALL seed the random generator before a measurement and SHALL record the seed.

A comparison SHALL assert on a mean across a stated number of events and on the observed range against
predicted bounds. It SHALL NOT require an exact sequence to match, because the engine shares one
generator across systems.

#### Scenario: A damage comparison is made

- **WHEN** per-hit damage is compared
- **THEN** the number of events, the mean, and the observed range are reported
- **AND** the pass condition is the mean within tolerance and the range within bounds

#### Scenario: An observed value falls outside predicted bounds

- **WHEN** any observed value lies outside the predicted range
- **THEN** the comparison fails regardless of the mean

### Requirement: A recorded baseline gates drift

Measured quantities SHALL be recorded per fixture as a committed baseline. A run SHALL compare against
that baseline and SHALL fail when a quantity has changed.

A baseline SHALL be updated only as a deliberate, reviewed change.

#### Scenario: A game update changes a measured quantity

- **WHEN** a run measures a value that differs from the baseline
- **THEN** the run fails and reports the quantity and both values

#### Scenario: A change is intentional

- **WHEN** a measured change is understood and accepted
- **THEN** the baseline is updated in the same change that explains it

### Requirement: The game is authoritative

Where a measurement disagrees with a prediction, the measurement SHALL be treated as correct and the
model SHALL be corrected.

A predicted quantity SHALL NOT be published while a current measurement contradicts it.

#### Scenario: The model and the game disagree

- **WHEN** a parity report shows a disagreement
- **THEN** the model is corrected before the affected figure is published

#### Scenario: A published figure has no measurement

- **WHEN** a quantity has never been measured against the game
- **THEN** it is published only with its unverified status stated
