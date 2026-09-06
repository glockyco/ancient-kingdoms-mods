## Purpose

Defines what a captured character export guarantees about its contents, so the planner can plan
against real gear and actual learned progression instead of a hypothetical inventory. The same mod can
read the game's own combat meter, which provides evidence for comparison with a predicted number.

## ADDED Requirements

### Requirement: The export is read-only

Character capture and meter capture SHALL read game state. They SHALL NOT write a networked field,
invoke a gameplay action, change meter state, or change any value the server owns. Learned-book capture
SHALL read the game's actual learned state, not inventory ownership, and SHALL NOT invoke a learning,
reset, or other mutation path to obtain it. Proof of this read-only behavior SHALL come from an
independently recorded runtime qualification of the capture producer, not from a self-declared capture
flag.

#### Scenario: A capture runs during combat

- **WHEN** a capture runs while the player is in combat
- **THEN** no gameplay state changes as a result

#### Scenario: A required object is absent

- **WHEN** the local player or the world scene is not available
- **THEN** the capture reports that it cannot run rather than substituting a default

#### Scenario: Learned state would require mutation to read

- **WHEN** learned-book state cannot be read without invoking a learning or reset path
- **THEN** the capture marks only that section unread and preserves other captured sections
- **AND** dependent evaluation or normalization is refused without blocking read-only inspection

### Requirement: Logical build data is separate from capture metadata

A capture SHALL expose logical build data that an authored fixture and the planner can consume. Logical
build data SHALL include progression, `learnedBookIds`, attributes, skill allocations, equipment,
controlled companions, consumables and ammunition with their identities and quantities. The learned-book
field SHALL distinguish complete-empty from missing or unread state. Shared data SHALL distinguish raw
observed attributes, base or class/race progression contributions, allocated points, and derived totals;
a live total SHALL NOT be labelled as base attributes or allocated points. Future consumption and supply
policies belong to the evaluation scenario or fixture execution data, not to observed build state.
Capture metadata SHALL remain outside that logical build data and SHALL describe when, where, and how
the capture was produced. The capture SHALL carry learned identities and completeness, not copied
book gain values or effect classifications; the versioned planner and game catalog owns those
resolutions. The outer record for a capture MAY differ from the outer record for a fixture or planner
state.

#### Scenario: A fixture and capture use different outer metadata

- **WHEN** a fixture and a capture contain the same logical build data
- **THEN** each retains its own execution or capture metadata
- **AND** the logical build data remains comparable without making the outer records identical

#### Scenario: A planner imports the logical build

- **WHEN** the planner reads a valid capture
- **THEN** it adapts the logical build data without treating capture-only metadata as build state

#### Scenario: A capture has no learned books

- **WHEN** the learned-book section is read successfully and contains no identities
- **THEN** the capture marks it complete and empty
- **AND** the planner evaluates no book gains

#### Scenario: A capture cannot read learned-book state

- **WHEN** the learned-book section is absent or unread
- **THEN** the capture marks it missing
- **AND** dependent evaluation is blocked without substituting an empty list

### Requirement: Producer and evaluator provenance remain distinct

Every capture SHALL carry a capture timestamp, producer identity and version, serialized-schema version,
capture-schema version, model compatibility marker, game build, and game-data identity. An evaluation
that consumes a capture SHALL identify its evaluator identity, model identity, game-data identity,
scenario identity, and objective mode separately while retaining the capture producer provenance. Capture
SHALL NOT be required to create a fixture, run a harness measurement, or manufacture a verification
report.

#### Scenario: A payload is loaded

- **WHEN** the planner loads an export
- **THEN** it verifies the schema and game-build policy before using the logical build data
- **AND** it retains the producer provenance for the imported build

#### Scenario: An evaluation uses a captured build

- **WHEN** an evaluator produces a prediction from a capture
- **THEN** the result names the evaluator, model, game data, scenario, and objective mode
- **AND** it does not present the capture producer as the evaluator

#### Scenario: A player captures without harness infrastructure

- **WHEN** the player invokes character capture without a fixture or verification run
- **THEN** the capture still writes its local payload
- **AND** it does not claim to be harness evidence

#### Scenario: A payload is from an unknown producer schema

- **WHEN** a payload does not carry a recognised serialized or capture schema
- **THEN** the planner rejects it and states the unsupported identity

### Requirement: Completeness and adapter checks gate dependent evaluation

The export SHALL state which logical-build sections and containers it captured, which it read as empty,
and which it could not read. A section that could not be read SHALL be marked missing rather than
emitted as empty. This completeness state SHALL include learned-book state. A checked adapter SHALL
validate schema support, container integrity, and the selected game-build compatibility policy before it
exposes the logical build to evaluation. A missing required section SHALL block only the dependent
planning or evaluation; it SHALL NOT prevent read-only inspection of the remaining captured sections.

#### Scenario: A storage container was not loaded

- **WHEN** a bank or bag container is not loaded at capture time
- **THEN** the export marks that container as missing
- **AND** owned-gear evaluation that needs it is blocked
- **AND** the planner can still show the captured equipment and provenance

#### Scenario: A section is complete and empty

- **WHEN** every requested entry in a section was read and no entries exist
- **THEN** the export marks that section complete and empty
- **AND** evaluation treats it as an empty section rather than an unread section

#### Scenario: Capture container integrity fails

- **WHEN** container metadata does not match the payload
- **THEN** the adapter rejects the capture before evaluation
- **AND** it reports the integrity failure

#### Scenario: A required build section is missing

- **WHEN** an evaluation needs skills or equipment and the capture marks that section missing
- **THEN** the dependent evaluation stops as incomplete
- **AND** it does not infer, default, or substitute the missing values

### Requirement: Items are identified by stable identifier

Equipment and inventory entries SHALL be identified by the identifier derived from the item's asset
name, which is the identifier the compendium publishes. A displayed name SHALL be carried only as
human-readable context.

The consumer SHALL resolve an item by that identifier, never by its displayed name. The game's own
runtime lookup is keyed by the displayed name, so resolving that way would lose exactly the stability
this requirement exists to provide.

#### Scenario: A display name is unavailable

- **WHEN** an item name cannot be resolved at capture time
- **THEN** the identifier is still emitted
- **AND** the planner resolves the item correctly

#### Scenario: An item was renamed by a game update

- **WHEN** an item's display name changes between versions
- **THEN** a stored export still resolves to the same item

### Requirement: Learned-book state uses stable identities

The export SHALL declare learned books by stable item asset ID in `learnedBookIds`. It SHALL preserve
identity order and duplicates for validation, and the checked adapter SHALL reject unknown or duplicate
identities rather than silently deduplicating them. The export SHALL not infer a learned book from an
owned inventory item. A complete empty declaration means none learned; missing or unread state is
incomplete.

#### Scenario: An inventory book has not been learned

- **WHEN** an item appears in inventory but the game's learned-book state does not contain its identity
- **THEN** the export does not add that identity to `learnedBookIds`
- **AND** the planner does not apply its gain

#### Scenario: A learned identity is unknown or duplicated

- **WHEN** `learnedBookIds` contains an unknown or duplicate identity
- **THEN** the checked adapter refuses dependent normalization and evaluation
- **AND** it preserves diagnostic inspection and reports the identity without silently deduplicating it

### Requirement: The export covers the logical build inputs

The payload SHALL carry the class, level, veteran progression, `learnedBookIds`, attribute values,
learned skill levels, every equipped slot, and every augment attached to an equipped item. It SHALL
carry observed consumable and ammunition identities and quantities. Future use policies SHALL be
supplied explicitly by the scenario rather than inferred during capture. It SHALL carry candidate items
held in inventory and storage, distinguished from equipped items, so a plan can be limited to owned gear.
Book identities SHALL come from actual learned state, not inventory ownership, and book gain values SHALL
be resolved from the versioned catalog rather than copied into the capture.

#### Scenario: A reader plans against owned gear

- **WHEN** an export is loaded and owned-gear planning is selected
- **THEN** the search considers only items the export reports as held or equipped
- **AND** it applies the captured item quantities

#### Scenario: A ranged plan has limited ammunition

- **WHEN** an export selects ammunition with a finite captured quantity
- **THEN** the evaluator uses that quantity for the selected scenario
- **AND** it refuses a horizon that needs more ammunition

#### Scenario: A reader plans against all gear

- **WHEN** owned-gear planning is not selected
- **THEN** the search considers the full published item set
- **AND** it does not treat the capture's inventory as the full catalogue

### Requirement: Companion roll and state contents are captured or explicitly excluded

The payload SHALL carry each active mercenary and pet where it is available. For each captured companion,
it SHALL carry the entity identity and kind, race as observed or drawn, archetype, level or progression,
equipped items and augments, learned skills, current resources and effects, and the rolled health
multiplier, resource multiplier, and base combat value when the game exposes them. A value that the game
does not expose SHALL be marked unavailable rather than inferred. Where companion state is not captured,
the payload SHALL mark it excluded. Pet state is captured for provenance and meter accounting; this
change SHALL NOT optimize a pet build.

#### Scenario: A mercenary is active

- **WHEN** the player has an active mercenary at capture time
- **THEN** its identity, observed race, archetype, progression, equipment, skills, and exposed rolled and current state appear in the payload

#### Scenario: A companion roll is not exposed

- **WHEN** the game does not expose one rolled companion value
- **THEN** that value is marked unavailable
- **AND** the planner does not substitute a player or model value

#### Scenario: No companion is active

- **WHEN** no companion is active
- **THEN** the payload records that state rather than omitting the companion section

#### Scenario: Pet state is captured

- **WHEN** a pet is active during capture
- **THEN** its state is retained for provenance and meter accounting
- **AND** it is not offered as an optimizer build

### Requirement: Measured combat output is capturable

The mod SHALL expose three separate operations: read-only character capture, read-only meter capture,
and explicit meter reset. A character or meter capture SHALL NOT reset the meter. The meter capture
SHALL read the damage total and active-time denominator for the player, pet, and each active mercenary.
It SHALL retain elapsed-window and event-count evidence when available. Missing window or count
evidence SHALL be marked unavailable, not reconstructed from a rate or invented.

A reported measured rate SHALL state its denominator and whether the elapsed measurement window is
known, because active time and elapsed time differ. A meter capture SHALL report observations and SHALL NOT claim model
accuracy by itself.

#### Scenario: A benchmark run is measured

- **WHEN** a reader resets the meter, attacks a training dummy, and reads the result
- **THEN** the damage total, active seconds, derived rate, and available window/count evidence are reported
- **AND** missing evidence blocks comparisons that require it
- **AND** the denominator is named

#### Scenario: A measured rate is compared against a prediction

- **WHEN** a measured rate is compared against a predicted rate
- **THEN** the comparison records the target, logical build, producer provenance, evaluator, model, game-data identity, scenario, and objective mode
- **AND** finite-run variance and model error remain separate when they apply

### Requirement: The player transport is one local file

A character capture SHALL write one versioned JSON file and report its exact local path. The browser
SHALL be able to read that file without a server or HotRepl connection. Capture SHALL NOT upload data.
Capture SHALL NOT require harness infrastructure or generate harness evidence as a side effect. HotRepl
MAY register the same file as an automation artifact, but it SHALL not change the player transport.

#### Scenario: A player captures a build

- **WHEN** the player invokes character capture in the mod
- **THEN** one JSON file is written
- **AND** the player is shown its exact local path

#### Scenario: Automation captures the same build

- **WHEN** HotRepl invokes character capture
- **THEN** the same file contract is returned as an automation artifact
- **AND** no upload or harness report is required

### Requirement: Owned items include quantities and containers

The capture SHALL report candidate items held in equipped slots, inventory, and storage. It SHALL
preserve stable identity, quantity, container, slot when equipped, augment state, and current durability.
An owned-gear search SHALL distinguish physical copies.

#### Scenario: One item is equipped and another copy is stored

- **WHEN** the two copies share an item identifier
- **THEN** the payload contains two physical-copy records with different locations

#### Scenario: A stack is captured

- **WHEN** an ammunition or consumable stack has a quantity greater than one
- **THEN** the payload records its quantity and container

### Requirement: Meter reset is explicit and mutating

Meter reset SHALL be a separate command labelled as mutating. It SHALL never run implicitly during
character capture or meter capture.

#### Scenario: A reader captures a build twice

- **WHEN** no reset command occurs between captures
- **THEN** neither capture changes the meter

#### Scenario: A reader requests meter reset

- **WHEN** the explicit reset command succeeds
- **THEN** the result reports which entity meters were reset
