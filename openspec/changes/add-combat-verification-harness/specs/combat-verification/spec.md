## Purpose

Defines what the harness measures inside the running game and what a parity report guarantees, so a
disagreement between a predicted figure and the game is unambiguous and localised rather than a matter
of opinion.

## ADDED Requirements

### Requirement: A probe reads, and reports whatever it must stop

Measurement SHALL read game state. It SHALL NOT change state, except through the actions a fixture
declares, or to stop a mechanism that rewrites the value under measurement.

A value that another mechanism rewrites between two samples belongs to neither sample. A probe MAY stop
such a mechanism before it reads. The probe SHALL report every value it cleared, and it SHALL NOT change a
value that a fixture declared.

Target-state reads SHALL be independent model inputs. They SHALL record their source and provenance, and a
caster value SHALL NOT replace an unavailable target value.

A requested state and an achieved state SHALL be reported separately. A state-dependent measurement SHALL
stop when the achieved state does not satisfy the requested state, rather than comparing a prediction for a
different state.

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

#### Scenario: The achieved target differs from the requested target

- **WHEN** the loaded target does not have the requested level, defenses, effects, or other declared state
- **THEN** the probe reports the requested and achieved state
- **AND** it stops every measurement that depends on that state

### Requirement: Actions are driven through the game's own command path

An action SHALL be issued through the same command the interface sends, so that every gate the game
applies is applied.

A fixture SHALL declare the action start condition, timing, repetition, end condition, and refusal policy.
Companion actions SHALL remain autonomous. The report SHALL record action attempts, accepted actions,
completed actions, and landed hits as separate counts.

The report SHALL record when a requested action was refused and the available evidence for its reason.
An unknown reason SHALL remain unknown, not inferred from the refusal alone.

#### Scenario: An action is refused for cost

- **WHEN** a requested action exceeds the available resource
- **THEN** the game refuses it
- **AND** the report records the refusal rather than counting the action as accepted

#### Scenario: An action is refused for an unlearned skill

- **WHEN** a fixture requests a skill the character has not learned
- **THEN** the refusal is recorded
- **AND** the measurement continues or fails as configured

#### Scenario: A fixture repeats an action

- **WHEN** a fixture reaches its declared repetition or end condition
- **THEN** the report records the start condition, each attempt, each accepted action, each completion, and each landed hit
- **AND** it does not infer a completed action or hit from an attempt

### Requirement: Probe fidelity and diagnostic coverage are declared separately

The harness SHALL declare which fidelity tier a measurement achieved. Available damage fidelity tiers are
aggregate totals, per-hit amounts without skill attribution, and per-hit amounts with the skill the engine
selected.

A fixture SHALL also declare its diagnostic coverage tier. Fixture tiers A through D SHALL remain separate
from damage attribution fidelity: A covers the stat sheet, B covers application and target state, C covers
cadence, and D covers upkeep and a full rotation. Maintained-target-effect coverage SHALL be included in B
for application and state and in D for upkeep. No new letter tier SHALL be introduced.

A rotation comparison SHALL require the damage fidelity tier that attributes a hit to a skill. Passing a
lower fixture tier SHALL narrow the possible failure, but SHALL NOT prove its cause.

#### Scenario: The attributing mechanism is unavailable

- **WHEN** the mechanism that attributes a hit to a skill cannot be applied
- **THEN** the measurement proceeds at a lower damage fidelity tier
- **AND** the report states the fidelity tier reached
- **AND** it does not claim a rotation comparison

#### Scenario: A rotation is compared

- **WHEN** a rotation comparison is reported
- **THEN** the measurement recorded which skill the engine chose for each hit
- **AND** the report states the diagnostic coverage tier separately from damage fidelity

#### Scenario: A maintained effect is covered

- **WHEN** a fixture applies a maintained target effect
- **THEN** application and target-state evidence is reported under tier B
- **AND** upkeep evidence is reported under tier D
- **AND** the report does not present either letter as an attribution-fidelity tier

#### Scenario: A lower tier passes

- **WHEN** a lower fixture tier passes and a higher tier fails
- **THEN** the report identifies the failure as being above the lower tier
- **AND** it does not label a mechanic as the cause without independent evidence

### Requirement: Comparison is per quantity, not a single verdict

A parity report SHALL compare each measured quantity separately and report each result. Quantities
include every stat on the sheet, the observed action interval, the per-hit damage, and the sustained
output.

The per-hit damage SHALL be compared as two quantities rather than one: the amount the caster asked for,
and the reduction the engine applied to it. The harness reads both, and a model can be right about one and
wrong about the other, so a single damage figure hides which half disagrees. The first covers the caster's
gear, attributes and skill arithmetic; the second covers variance, the level difference and school
mitigation.

Measured caster totals SHALL NOT replace predicted stat totals in a comparison or report to conceal a
prediction defect. Predicted stat totals SHALL NOT replace measured caster totals. A comparison SHALL use
the planner's production evaluator for predictions, not a test-only or duplicate evaluator.

A comparison of the reduction SHALL be made against a range derived from the engine's steps, and SHALL
fail when any single hit falls outside it. A mean alone SHALL NOT be sufficient, because a model with a
correct mean and a wrong distribution passes it.

A report SHALL identify the fixture, the target, the game version, and the model version.

#### Scenario: One quantity disagrees

- **WHEN** a single stat disagrees and the rest match
- **THEN** the report identifies that stat
- **AND** the matching quantities are still reported as compared

#### Scenario: The caster's arithmetic is right and the mitigation model is wrong

- **WHEN** the amount asked for matches and the reduction does not
- **THEN** the report attributes the disagreement to the reduction and reports the amount as compared

#### Scenario: A prediction is produced

- **WHEN** a quantity is compared with a live measurement
- **THEN** the prediction comes from the planner's production evaluator
- **AND** the report identifies the evaluator and its model version

#### Scenario: A report is read later

- **WHEN** a stored report is reviewed
- **THEN** the fixture, target, game version, and model version are recoverable from it

### Requirement: Book-aware parity uses declared and achieved progression

A verification run SHALL compare both no-book and book-bearing cases. Each case SHALL compare the
attribute totals, every affected stat, and both damage intent and damage reduction against the planner's
production evaluator.
The evaluator SHALL resolve current gains from the versioned planner/game catalog for the declared
`learnedBookIds` and apply those gains once. Learned-book progression is separate from allocated
attribute points, skill budgets, inventory consumables, equipped bonuses, and transient effects. It SHALL
NOT infer books from inventory ownership or grant books silently.

The report SHALL preserve declared and achieved `learnedBookIds`, the catalog identity and gain or effect
resolution, and the resulting achieved live attributes. Live totals SHALL NOT be labelled as base
attributes or allocated points. A requested-versus-achieved mismatch, unknown or duplicate identity, or
unresolved catalog contribution SHALL stop dependent parity and preserve its diagnostics.

A captured build SHALL qualify for parity only when its learned-book section is complete. Qualification
SHALL reference runtime evidence that the capture producer reads actual learned state without learning,
resetting, or otherwise mutating the character. A capture's own read-only declaration and inventory
ownership are not that evidence. The linked planner change owns the capture producer and planner
behavior. The harness consumes the capture without changing the original file and materializes only
its owned scratch character.

#### Scenario: A no-book case reaches parity

- **WHEN** a complete fixture declares an empty `learnedBookIds` and the achieved state is also empty
- **THEN** the run compares its attributes, affected stats, damage intent, and damage reduction with the production evaluator
- **AND** it records the empty declaration and achieved state as complete provenance

#### Scenario: A book-bearing case reaches parity

- **WHEN** a complete fixture declares learned books and readback confirms the same IDs and resulting attributes
- **THEN** the run compares book-aware attributes, affected stats, damage intent, and damage reduction with catalog gains applied once
- **AND** it records the declared and achieved IDs and catalog resolution provenance

#### Scenario: Capture evidence is inventory-only

- **WHEN** a capture reports inventory ownership but not the actual learned-book state and read-only evidence
- **THEN** parity qualification stops as incomplete
- **AND** the report preserves the missing section and its diagnostics

#### Scenario: A catalog contribution cannot be resolved

- **WHEN** the production catalog cannot resolve a declared book's gains or effect classification
- **THEN** book-aware parity is refused
- **AND** the report preserves the catalog identity and unresolved contribution

### Requirement: Fixtures are tiered so a failure localises

The fixture set SHALL include tiers that exercise the stat sheet without combat, a single hit per skill
class, the action interval across weapon speed and haste, the target's own state under a maintained effect,
and a full rotation. Required coverage SHALL include every supported player class and damage school,
relevant damage-handler branches, and every supported mercenary archetype, with meaningful progression,
resource, and bare/equipped cases. Executed state and trace evidence SHALL establish coverage; descriptor
labels or an exact descriptor count SHALL NOT establish it. Additional valid fixtures SHALL be permitted.

A report SHALL present tier results in order, so that the lowest failing tier is evident. It SHALL mark
higher tiers unreliable when a lower tier they depend on fails.

#### Scenario: A descriptor claims a handler it does not execute

- **WHEN** a coverage label names a handler or school absent from the execution evidence
- **THEN** that descriptor does not satisfy the claimed coverage
- **AND** the required matrix remains incomplete

#### Scenario: A rotation disagrees while lower tiers match

- **WHEN** the rotation tier fails and the stat, single-hit, interval, and target-state tiers pass
- **THEN** the report identifies the rotation tier as the lowest failing tier
- **AND** it does not infer a causal label from that ordering alone

#### Scenario: A target-state tier is measured

- **WHEN** an effect that alters a target's avoidance or mitigation is applied
- **THEN** the target's own stats are read before and after
- **AND** the landing rate over repeated attempts is reported beside the predicted probability

#### Scenario: The stat tier fails

- **WHEN** the stat sheet tier fails
- **THEN** the higher tiers are reported as unreliable, because they depend on it

### Requirement: Random variation is bounded by a predeclared protocol

The harness SHALL seed the random generator before a measurement and SHALL record the seed as
provenance. The seed SHALL NOT be presented as a guarantee of a deterministic sequence, race outcome,
or damage outcome.

Each randomized comparison SHALL use a predeclared, versioned protocol. The protocol SHALL state the
sampling unit, minimum sample sufficiency, confidence and error control across the fixture matrix, stopping
rule, units, and denominators. It SHALL retain the observed sequence and the event count.

Deterministic invariants SHALL use exact comparison unless the report states a justified numeric tolerance.
A comparison SHALL apply the protocol's stated statistic and acceptance rule. Where a theoretical hard
support bound exists, it SHALL also check each observation against that bound. It SHALL NOT require an exact sequence or exact mean and count equality with a stochastic
baseline, because the engine shares one generator across systems.

#### Scenario: A damage comparison is made

- **WHEN** per-hit damage is compared
- **THEN** the number of completed events, sampling unit, mean, units, denominator, and observed range are reported
- **AND** the pass condition applies the declared tolerance, confidence, and error-control protocol

#### Scenario: An observed value falls outside predicted bounds

- **WHEN** any observed value lies outside a justified theoretical hard support bound
- **THEN** the comparison fails regardless of the mean

#### Scenario: A stochastic baseline is compared

- **WHEN** a stochastic measurement is compared with a baseline
- **THEN** the baseline gate uses the predeclared protocol and permitted statistical tolerance
- **AND** it does not require exact means, exact counts, or an identical seed sequence

#### Scenario: A randomized run stops early

- **WHEN** the stopping rule ends sampling before the required sufficiency is reached
- **THEN** the result is incomplete
- **AND** it cannot count as parity or release evidence

### Requirement: A recorded baseline gates drift only when valid

Measured quantities SHALL be recorded per fixture as a committed baseline. A run SHALL compare against
that baseline and SHALL fail when a quantity violates the declared deterministic or statistical drift criterion.

A baseline SHALL be updated only as a deliberate, reviewed change. A baseline capture SHALL NOT bless a
failing, incomplete, incompatible, or otherwise invalid run. Version and hash mismatches SHALL be reported
before numeric comparison. A diagnostic override MAY explain a result, but SHALL NOT make it verified
baseline or release evidence.

#### Scenario: A game update changes a measured quantity

- **WHEN** a measured quantity violates the baseline's declared drift criterion
- **THEN** the run fails and reports the quantity and both values

#### Scenario: A change is intentional

- **WHEN** a measured change is understood and accepted
- **THEN** the baseline is updated in the same change that explains it

#### Scenario: A baseline is incompatible

- **WHEN** a baseline has a schema, game-data, model, build, or protocol identity that does not match the run
- **THEN** the run reports the mismatch before numeric comparison
- **AND** it rejects the baseline for verification

#### Scenario: A run is incomplete or failing

- **WHEN** a run is incomplete, fails a required comparison, or uses a diagnostic override
- **THEN** it cannot update or validate a baseline
- **AND** it cannot count as release evidence

### Requirement: A full verification run has explicit acceptance conditions

A run SHALL count as fully verified only when it materializes each required fixture, reads back and
confirms the achieved state, completes all required live measurements, obtains predictions from the
planner's production evaluator, passes each required comparison, passes the reviewed baseline gate, persists the complete provenance and report, and completes owned-process
cleanup and final isolation readback. Initial baseline qualification SHALL require every applicable stage
except comparison with a prior baseline; it SHALL require explicit review and SHALL not silently pass a missing baseline.

A validation-only, partial, incomplete, diagnostic, or materialization-only run SHALL be labelled with its
actual status and SHALL NOT count as parity or release evidence.

#### Scenario: Every required stage passes

- **WHEN** materialization, readback, live measurement, production prediction, comparison, reviewed baseline,
persistence, cleanup, and isolation readback all pass
- **THEN** the run is marked fully verified
- **AND** its report may be used as parity and release evidence

#### Scenario: A required stage does not pass

- **WHEN** any required stage is missing or fails
- **THEN** the run is marked incomplete or failed with the failed stage named
- **AND** it is not presented as full verification

### Requirement: Verification evidence has complete provenance

The persisted report SHALL identify the assembly build identity, fixture content, fixture schema, target
and achieved state, model and evaluator, game-data identities, action counts for each quantity, observed
sequences, tolerances, statistical protocol, baseline identity, and every normalization output. It SHALL
record the game version as a label beside recomputable identities.

Raw game parity SHALL remain authoritative. A named known-defect normalization MAY be emitted as a separate
result only when it includes evidence for the defect. Normalization SHALL never be hidden calibration and
SHALL never turn raw disagreement into a pass.

#### Scenario: Evidence is reviewed later

- **WHEN** a reviewer opens a persisted result
- **THEN** the reviewer can recover the build, fixture content, model and evaluator, data identities, achieved state, event counts, sequences, tolerances, protocol, and baseline identity

#### Scenario: A known defect is normalized

- **WHEN** a named known defect has independent evidence and a normalized result is requested
- **THEN** the report shows raw parity and normalized output as separate results
- **AND** the normalized output does not change the raw pass or failure

#### Scenario: No defect evidence exists

- **WHEN** a normalization has no named defect and supporting evidence
- **THEN** the report refuses the normalization
- **AND** it retains the raw measurement and comparison result

### Requirement: Accuracy claims use a scoped independent validation gate

An accuracy claim SHALL be limited to a supported domain defined by an adequate current corpus and an
independent validation set. The acceptance boundary SHALL use the declared units, denominators, tolerances,
and statistical protocol for that domain. The harness SHALL NOT impose a global 2.5% bound. There SHALL be
no global accuracy bound unless the corpus and independent validation justify that scope.

Unsupported or unverified inputs SHALL carry no numeric accuracy claim.

#### Scenario: A supported domain passes independent validation

- **WHEN** an adequate current corpus and an independent validation set pass the declared gate
- **THEN** the report states the supported domain and its measured boundary
- **AND** it does not extend the claim beyond that domain

#### Scenario: The validation corpus is inadequate

- **WHEN** the current corpus or independent validation set is inadequate
- **THEN** the report withholds a numeric accuracy claim
- **AND** it states that the domain is unsupported or unverified

### Requirement: A failure reports conditions, not inferred causes

A failed comparison SHALL report the observed conditions, requested and achieved state, quantities, and
relevant evidence. It SHALL NOT assign a causal label from a failed mean, range, tier, or condition alone.

#### Scenario: A statistical gate fails

- **WHEN** a mean, range, confidence, or sufficiency gate fails
- **THEN** the report names the failed condition and its evidence
- **AND** it does not claim an inferred causal mechanism

### Requirement: The game is authoritative

A valid measurement of the declared achieved state SHALL be authoritative for raw game behavior.
A statistically rejected prediction SHALL remain unverified while the disagreement is investigated;
random variation or a failed setup SHALL NOT alone require a formula change. Confirmed raw-model defects
SHALL be corrected. Explicit known-defect-normalized results remain separate.

A predicted quantity SHALL NOT be published as verified while a current measurement contradicts it.

#### Scenario: The model and the game disagree

- **WHEN** a parity report shows a disagreement
- **THEN** the disagreement is resolved with valid evidence before the affected raw figure is published as verified

#### Scenario: A published figure has no measurement

- **WHEN** a quantity has never been measured against the game
- **THEN** it is published only with its unverified status stated
