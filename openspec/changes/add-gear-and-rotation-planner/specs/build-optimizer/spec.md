## Purpose

Defines what the build search guarantees about the builds it returns, so a recommendation can be
trusted without the reader inspecting the search. The search is a heuristic, so this capability
constrains what it may claim.

## ADDED Requirements

### Requirement: The search states search quality separately from prediction accuracy

The search SHALL NOT describe a returned build as optimal or best. It SHALL state that the result is
the best build the search found. It SHALL report measured search-gap evidence against a reference search
on the same objective and named benchmark domain. Search-gap evidence SHALL describe ranking quality,
not the accuracy of the combat model. A prediction accuracy boundary SHALL come only from an adequate
current corpus and independent validation; an unverified domain SHALL have no numeric boundary.

#### Scenario: A result is presented

- **WHEN** the search returns a ranked list
- **THEN** the accompanying text describes the result as the best found rather than as optimal
- **AND** it identifies search-gap evidence separately from prediction accuracy

#### Scenario: A reader asks how accurate the search is

- **WHEN** the planner explains the search
- **THEN** it states the measured gap against a reference search on the same objective and benchmark domain
- **AND** it does not present that gap as model accuracy

#### Scenario: The evaluated domain is unverified

- **WHEN** current corpus or independent validation does not support the build or mechanic domain
- **THEN** the result is marked unverified
- **AND** no numeric prediction boundary is claimed

### Requirement: Discrete branches are enumerated, not searched locally

The search SHALL enumerate each mutually exclusive equipment configuration as a separate branch, and
SHALL run its local search inside each branch.

A branch exists wherever a change requires two slots to change together. The one-handed weapon with
shield configuration and the two-handed weapon configuration are separate branches. Each armour set
piece-count threshold is a separate branch.

#### Scenario: A two-handed weapon is available

- **WHEN** the class can equip a two-handed weapon
- **THEN** the search evaluates the two-handed branch independently of the one-handed branch
- **AND** the returned build is the better of the branch results

#### Scenario: An armour set grants a threshold bonus

- **WHEN** a set grants a bonus at a piece count
- **THEN** the search evaluates a branch that commits to that piece count

### Requirement: The local search uses multiple independent starts

The search SHALL run from more than one starting build. The number of starts SHALL be a recorded
parameter.

A single start is not sufficient, because the objective has multiple local optima.

#### Scenario: The search runs

- **WHEN** a branch is searched
- **THEN** more than one starting build is used
- **AND** the best result across starts is returned for that branch

#### Scenario: Starts disagree

- **WHEN** two starts converge to different results
- **THEN** the better result is returned
- **AND** the disagreement is reported as search evidence rather than hidden as model error

### Requirement: The search covers equipment, attributes, and skill allocation

The search SHALL treat equipment selection, attribute point allocation, and skill point allocation as
one coupled problem. It SHALL NOT fix one of them arbitrarily.

#### Scenario: A tier restricts which skills can be learned together

- **WHEN** the search allocates skill points within a tier that admits a limited number of skills
- **THEN** it enumerates the permitted combinations rather than treating each skill independently

#### Scenario: A skill grants a damage percentage

- **WHEN** a skill allocation raises a damage percentage bonus
- **THEN** the equipment selection is reconsidered against the new stat sheet

#### Scenario: Attribute points affect resource income

- **WHEN** an attribute allocation changes maximum resource or raw damage
- **THEN** the skill allocation is reconsidered against the new resource budget

### Requirement: The evaluation is deterministic without claiming false exactness

Repeated evaluation with the same build, evaluator, data, model, scenario, and objective mode SHALL be
repeatable. Repeatability SHALL NOT by itself prove that a substitution is exact. The evaluator SHALL
use an exact expectation only for a random term whose expectation is established; otherwise it SHALL
label the approximation and its validation status. Only an independently validated domain may carry
a verified numeric prediction boundary. This change SHALL NOT require a Monte Carlo
product or sampling-based ranking.

#### Scenario: A deterministic evaluation repeats

- **WHEN** the same complete inputs are evaluated twice
- **THEN** the result and attribution repeat
- **AND** the report describes this as repeatability, not proof of exactness

#### Scenario: A random term has a proven expectation

- **WHEN** the model has established the exact expectation for a random term
- **THEN** the evaluator uses that expectation without presenting a sampled estimate

#### Scenario: A random term lacks an exact expectation

- **WHEN** no exact expectation is established for a random term
- **THEN** the evaluator labels the approximation and its validation domain
- **AND** it does not present the result as exact

### Requirement: The player and active mercenaries are optimized

The search SHALL optimize the player and each active mercenary. It SHALL capture a pet for provenance
and meter accounting but SHALL NOT optimize a pet build in this change. A mercenary contributes output
through the same stat pipeline as a player. A reported total output SHALL state which entities it includes
and SHALL retain each companion's supplied state or explicit reachable best-roll assumption as input.
Companion rolls, skills, and autonomous action policy SHALL NOT become new optimization dimensions.

#### Scenario: A build includes mercenaries

- **WHEN** the planned build includes mercenaries with complete required state
- **THEN** their equipment is optimized against the declared companion state and autonomous policy
- **AND** the reported total names the entities it counted

#### Scenario: A companion state is incomplete

- **WHEN** a required companion roll or state value is missing
- **THEN** evaluation that depends on that value stops as incomplete
- **AND** it does not substitute a player or model value

#### Scenario: A reader wants the player alone

- **WHEN** companion output is excluded by choice
- **THEN** the reported figure is labelled as the player's own output
- **AND** pet state remains provenance rather than an optimization choice

### Requirement: Categorised effects are solved within their owning entity

Each controlled entity owns a separate `Skills` list. Category exclusivity SHALL apply within one list
and SHALL NOT make an owner's effect replace a companion's effect.

The search SHALL be able to omit an action when it would replace a stronger effect held by the same
entity. Where a companion selects its own actions and the model cannot schedule them, the search SHALL
evaluate the expectation over that selection and state that the figure is an expectation.

#### Scenario: A player action would replace the player's stronger effect

- **WHEN** two player skills share a buff category and the maintained effect is stronger
- **THEN** the search can return a rotation that omits the weaker player skill
- **AND** the report explains that the omission avoids replacing the stronger effect

#### Scenario: An owner and companion use one category name

- **WHEN** the owner and a companion each contribute an effect in the same named category
- **THEN** both effects contribute from their separate skill lists

#### Scenario: Companion actions cannot be scheduled

- **WHEN** a companion selects ready actions autonomously
- **THEN** the result states that its contribution is an expectation
- **AND** it does not present the in-range expectation as a guaranteed schedule

### Requirement: Owned-gear planning treats inventory as shared

When the search is limited to owned items, it SHALL NOT assign one physical item twice. This holds
across entities and equally within one character, because a category can be accepted by more than one
slot: a character has two ring slots and two ear slots, so one owned ring cannot fill both.

Where an item is available in more than one copy, the search MAY use as many copies as are owned.

When the search is not limited to owned items, entities MAY be optimized independently.

#### Scenario: One copy of an item is owned

- **WHEN** two entities would both take the same single owned item
- **THEN** only one receives it
- **AND** the other receives the best remaining option

#### Scenario: One copy fits two slots on one character

- **WHEN** a single owned item fits two slots of the same character
- **THEN** it is assigned to at most one of them

#### Scenario: Several copies are owned

- **WHEN** a character owns two copies of an item that fits two slots
- **THEN** both slots may be filled

#### Scenario: Planning is not limited to owned items

- **WHEN** the full published item set is available
- **THEN** each entity is optimized without an assignment constraint

### Requirement: Consumables and ammunition are part of the coupled search

The search SHALL include selected consumables and ammunition in the build state. It SHALL enforce
identity, quantity, legality, use policy, and scenario supply. A candidate that needs more ammunition or
consumable uses than the scenario supplies SHALL be refused rather than scored with an implicit
replacement or unlimited supply. Companion evaluations SHALL not consume player ammunition.

#### Scenario: A consumable changes the result

- **WHEN** a legal consumable changes resources or damage during the scenario
- **THEN** the candidate includes its identity, quantity, and use policy
- **AND** the rotation is evaluated with that effect

#### Scenario: Ranged ammunition is insufficient

- **WHEN** a ranged rotation needs more ammunition than the declared supply
- **THEN** that candidate is refused
- **AND** the required and available quantities are reported

#### Scenario: A candidate requests an undeclared item

- **WHEN** an action requests a consumable or ammunition absent from the declared supply
- **THEN** the action or candidate is refused
- **AND** another item is not substituted

### Requirement: Weapon choice and rotation are solved together

The search SHALL treat the weapon decision and the rotation as one joint decision, because a damaging
skill can require a weapon category.

It SHALL NOT select a weapon against a rotation that the weapon makes unavailable.

#### Scenario: A weapon unlocks a damaging skill

- **WHEN** a candidate weapon satisfies the category a high-damage skill requires
- **THEN** the rotation is re-solved with that skill available before the weapon is scored

#### Scenario: A weapon locks out a damaging skill

- **WHEN** a candidate weapon fails a required category
- **THEN** the affected skill is excluded from that branch's rotation

### Requirement: Dynamic state drives displayed evaluation

The displayed evaluation SHALL use the event timeline with state updates in event order. Each action
SHALL consume and generate resources according to its result. The timeline SHALL apply effect gains,
refreshes, and expiry, update target state, and re-evaluate thresholds and action eligibility after each
relevant event. It SHALL NOT replace dynamic state with an initial or steady-state value for the
displayed result.

#### Scenario: An action changes resource availability

- **WHEN** an action consumes resource and a later action depends on that resource
- **THEN** the later action sees the updated resource value
- **AND** the attribution reflects the actual accepted sequence

#### Scenario: An effect expires during a scenario

- **WHEN** a maintained effect reaches its expiry before a later action
- **THEN** later actions use the effect state after the applicable engine cleanup boundary until refresh
- **AND** the displayed uptime reflects the expiry and refresh events

#### Scenario: Target state crosses a threshold

- **WHEN** target health, mitigation, or another modelled target value crosses an action threshold
- **THEN** the timeline updates the target state
- **AND** subsequent eligibility and damage use the updated threshold state

### Requirement: Ranking uses a surrogate whose fidelity is measured

The search MAY rank candidates with a cheaper objective than the one used for display. If it does,
the fidelity of that surrogate SHALL be measured against the display objective, and the number of
candidates carried forward SHALL be justified by that measurement.

Rank correlation alone SHALL NOT be accepted as evidence of fidelity.

#### Scenario: The surrogate changes

- **WHEN** the ranking objective changes
- **THEN** its fidelity against the display objective is re-measured
- **AND** the candidate count is re-justified

#### Scenario: The surrogate misranks

- **WHEN** the measured fidelity shows the best build outside the carried candidate set
- **THEN** the candidate count is raised or the surrogate is corrected before publication

### Requirement: Wasted stat allocation is reported

Where a build exceeds a cap, the search SHALL report the excess, because a capped stat contributes
nothing further to that constrained term. Another uncapped consumer of the same stat SHALL remain
part of the evaluation.

#### Scenario: A build exceeds the attack speed floor

- **WHEN** accumulated haste drives attack interval to its floor
- **THEN** the excess haste is reported as contributing nothing

#### Scenario: A build exceeds the avoidance floor

- **WHEN** accumulated accuracy drives target avoidance to zero
- **THEN** the excess is reported as contributing nothing further to avoidance reduction
- **AND** uncapped accuracy effects, including debuff landing, remain evaluated

### Requirement: The optimization objective is bound to one evaluation identity

The search SHALL optimize sustained output for one explicit build, evaluator identity, model identity,
game-data identity, evaluation scenario version, and objective mode tuple. The objective mode SHALL be
raw game mode or a named known-defect-normalized mode. The search SHALL NOT reuse a score across
different tuples. A normalized mode SHALL require evidence for the named defect, and raw and normalized
results SHALL remain separate.

#### Scenario: Fight duration changes

- **WHEN** the reader changes the scenario duration
- **THEN** the search re-evaluates candidates under the new duration
- **AND** the result records that duration and its full evaluation identity

#### Scenario: Evaluator or data changes

- **WHEN** a candidate is evaluated with a different evaluator, model, or game-data identity
- **THEN** the search does not reuse its prior score
- **AND** the result records the new identity

#### Scenario: Objective mode changes

- **WHEN** the reader changes from raw game mode to a named known-defect-normalized mode
- **THEN** the search evaluates the candidates again
- **AND** it retains raw and normalized results as separate outputs

#### Scenario: Normalization lacks evidence

- **WHEN** a normalized mode has no named known defect and supporting evidence
- **THEN** the search refuses that mode
- **AND** it retains any raw diagnostic result

### Requirement: Recommendations prefer intended behaviour

A recommendation SHALL NOT gain a ranking advantage from a known game defect. Where a defect changes
the recommendation, the search SHALL use an evidenced named normalization or withhold that
recommendation. Raw results unaffected by known defects MAY support recommendations. Raw diagnostic
output SHALL NOT recommend defect exploitation. A known-defect-
normalized mode MAY support a recommendation only when the defect and evidence are recorded. Every
ranking and recommendation SHALL label its objective mode.

#### Scenario: Raw output rewards a defect

- **WHEN** raw game mode ranks a defect-exploiting build above an intended-behaviour build
- **THEN** the raw ordering is retained as a diagnostic
- **AND** the optimizer does not recommend the defect-exploiting build

#### Scenario: A supported normalized output is ranked

- **WHEN** a named known defect has supporting evidence
- **THEN** normalized mode may rank builds for intended behaviour
- **AND** the result retains the raw output separately

### Requirement: Unsupported effects cannot win a ranking

The search SHALL exclude a candidate with an unsupported effect and SHALL explain the exclusion. It
SHALL NOT treat an unknown effect as a zero contribution and continue.

#### Scenario: A candidate contains an unsupported damage proc

- **WHEN** that candidate enters the search frontier
- **THEN** it is excluded before ranking
- **AND** the unsupported proc is named

### Requirement: Captured builds pass checked adapters and completeness gates

A capture adapter SHALL validate its serialized and capture schemas, container integrity, producer
provenance, and game-data compatibility before the search consumes its logical build data. The search
SHALL distinguish complete, empty, missing, and excluded sections. A missing required section SHALL
block dependent evaluation, but it SHALL not prevent inspection of available build data. The search
SHALL not infer or substitute missing values.

#### Scenario: A captured skills section is unread

- **WHEN** an imported build marks skills as missing
- **THEN** a skill-dependent evaluation stops as incomplete
- **AND** the editor can still show other captured sections

#### Scenario: An empty inventory is complete

- **WHEN** an imported build marks inventory complete with no entries
- **THEN** owned-gear planning treats inventory as empty
- **AND** it does not treat the inventory as missing

#### Scenario: An adapter rejects a capture

- **WHEN** schema, integrity, provenance, or compatibility checks fail
- **THEN** the search refuses the capture before scoring
- **AND** it reports the failed check

### Requirement: Search-gap evidence defines ranking equivalence

The search SHALL report a measured search-gap bound for its named benchmark domain. Candidates whose
objective values differ by no more than that bound SHALL be grouped as ranking-equivalent alternatives
for the same evaluator, model, data, scenario, and objective mode. This band SHALL not be used as a
model-accuracy claim, and there SHALL be no global 2.5 percent bound.

#### Scenario: Two candidates fall inside the bound

- **WHEN** the objective difference is no greater than the measured search-gap bound for the same tuple
- **THEN** neither candidate is presented as the unique better build

#### Scenario: Candidates use different tuples

- **WHEN** two candidates use different scenario, evaluator, model, data, or objective-mode identities
- **THEN** the search does not group them as ranking-equivalent
- **AND** it requires one evaluation tuple before comparison

#### Scenario: The benchmark domain is not supported

- **WHEN** the search-gap benchmark lacks a current bounded corpus
- **THEN** the search withholds a numeric search-gap band
- **AND** it does not convert another domain's gap into a guarantee
