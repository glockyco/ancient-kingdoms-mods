## Purpose

Defines what the build search guarantees about the builds it returns, so a recommendation can be
trusted without the reader inspecting the search. The search is a heuristic, so this capability
constrains what it may claim.

## ADDED Requirements

### Requirement: The search states what it does not guarantee

The search SHALL NOT describe a returned build as optimal or best. It SHALL state that the result is
the best build the search found, and it SHALL state the accuracy it claims.

#### Scenario: A result is presented

- **WHEN** the search returns a ranked list
- **THEN** the accompanying text describes the result as the best found rather than as optimal

#### Scenario: A reader asks how accurate the search is

- **WHEN** the planner explains the search
- **THEN** it states the measured gap against a reference search on the same objective

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
- **AND** the disagreement does not appear as instability to the reader

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

### Requirement: The player and active mercenaries are optimized

The search SHALL optimize the player and each active mercenary. It SHALL capture a pet for provenance
and meter accounting but SHALL NOT optimize a pet build in this change. A mercenary contributes output
through the same stat pipeline as a player.

A reported total output SHALL state which entities it includes.

#### Scenario: A build includes mercenaries

- **WHEN** the planned owner fields mercenaries
- **THEN** their equipment is optimized
- **AND** the reported total names the entities it counted

#### Scenario: A reader wants the player alone

- **WHEN** companion output is excluded by choice
- **THEN** the reported figure is labelled as the player's own output

### Requirement: Controlled entities can interfere, and the search accounts for it

Entity contributions SHALL NOT be assumed additive. Entities the owner controls draw from separate skill
lists that share buff categories, so one entity's action can remove another entity's stronger effect.

The search SHALL be able to select the absence of an action. When an action would replace a stronger
effect held by another controlled entity, withholding it SHALL be a reachable result.

Where a companion selects its own actions and the model cannot schedule them, the search SHALL evaluate
the expectation over that selection and the report SHALL state that the figure is an expectation.

#### Scenario: A player action would replace a stronger companion effect

- **WHEN** a player skill and a companion skill share a buff category and the companion effect is
  stronger
- **THEN** the search can return a rotation that omits the player skill
- **AND** the report explains that the omission avoids replacing a stronger effect

#### Scenario: Total output is reported for a party

- **WHEN** several controlled entities contribute categorised effects
- **THEN** the reported total accounts for category exclusivity across all of them

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

### Requirement: Results within the error boundary form an equivalence band

The search SHALL group results that differ by less than the stated error boundary, and SHALL present
them as equivalent alternatives.

#### Scenario: Two builds are close

- **WHEN** two returned builds differ by less than the boundary
- **THEN** they appear in the same band
- **AND** the display does not imply that one is better

### Requirement: Wasted stat allocation is reported

Where a build exceeds a cap, the search SHALL report the excess, because a capped stat contributes
nothing further.

#### Scenario: A build exceeds the attack speed floor

- **WHEN** accumulated haste drives attack interval to its floor
- **THEN** the excess haste is reported as contributing nothing

#### Scenario: A build exceeds the avoidance floor

- **WHEN** accumulated accuracy drives target avoidance to zero
- **THEN** the excess accuracy is reported as contributing nothing against that target


### Requirement: The optimization objective is scenario-bound

The search SHALL optimize sustained output for one explicit build, model, game-data, and evaluation
scenario version tuple. It SHALL NOT reuse a score across different tuples.

#### Scenario: Fight duration changes

- **WHEN** the reader changes the scenario duration
- **THEN** the search re-evaluates candidates under the new duration
- **AND** the result records that duration

#### Scenario: Two results use different scenarios

- **WHEN** a reader compares results with different scenario versions
- **THEN** the planner refuses a direct numerical comparison until one scenario is selected

### Requirement: Unsupported effects cannot win a ranking

The search SHALL exclude a candidate with an unsupported effect and SHALL explain the exclusion. It
SHALL NOT treat an unknown effect as a zero contribution and continue.

#### Scenario: A candidate contains an unsupported damage proc

- **WHEN** that candidate enters the search frontier
- **THEN** it is excluded before ranking
- **AND** the unsupported proc is named

### Requirement: Search-gap evidence defines equivalence

The search SHALL report a measured search-gap bound for its benchmark domain. Candidates whose
objective values differ by no more than that bound SHALL be grouped as equivalent.

#### Scenario: Two candidates fall inside the bound

- **WHEN** the objective difference is no greater than the measured search-gap bound
- **THEN** neither candidate is presented as the unique better build
