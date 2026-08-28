## Purpose

Defines what a captured character export guarantees about its contents, so the planner can plan
against real gear instead of a hypothetical inventory. The same capture reads the game's own combat
meter, which is the only evidence that a predicted number matches the game.

## ADDED Requirements

### Requirement: The export is read-only

Character capture and meter capture SHALL read game state. They SHALL NOT write a networked field,
invoke a gameplay action, change meter state, or change any value the server owns.

#### Scenario: A capture runs during combat

- **WHEN** a capture runs while the player is in combat
- **THEN** no gameplay state changes as a result

#### Scenario: A required object is absent

- **WHEN** the local player or the world scene is not available
- **THEN** the capture reports that it cannot run rather than substituting a default

### Requirement: The payload carries provenance and a version

Every export SHALL carry a capture timestamp, serialized-schema version, capture-schema version,
model compatibility marker, game build, and game-data identity.

The consumer SHALL refuse an unknown serialized or capture schema instead of parsing it partially. A
game-build difference SHALL be reported and handled by an explicit compatibility policy.

#### Scenario: A payload is loaded

- **WHEN** the planner loads an export
- **THEN** it verifies the schema version and the game build before using the contents

#### Scenario: A payload is from an unknown producer

- **WHEN** a payload does not carry a recognised schema version
- **THEN** the planner rejects it and states why

### Requirement: The payload reports its own completeness

The export SHALL state which sections it captured and which it could not. A section that could not be
read SHALL be marked as missing rather than emitted as empty.

#### Scenario: A storage container was not loaded

- **WHEN** a bank or bag container is not loaded at capture time
- **THEN** the export marks that section as missing
- **AND** the planner does not treat the absent items as unavailable

#### Scenario: A section is complete

- **WHEN** every requested section was read
- **THEN** the export records that it is complete

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

### Requirement: The export covers what a build needs

The payload SHALL carry the class, the level, the veteran progression, attribute values, learned skill
levels, every equipped slot, and any augment attached to an equipped item.

The payload SHALL carry candidate items held in inventory and storage, distinguished from equipped
items, so a plan can be limited to owned gear.

#### Scenario: A reader plans against owned gear

- **WHEN** an export is loaded and owned-gear planning is selected
- **THEN** the search considers only items the export reports as held or equipped

#### Scenario: A reader plans against all gear

- **WHEN** owned-gear planning is not selected
- **THEN** the search considers the full published item set

### Requirement: Companion state is captured or explicitly excluded

The payload SHALL carry active mercenary and pet state where it is available, including their
equipped items. Where companion state is not captured, the payload SHALL mark it as excluded.

#### Scenario: Mercenaries are active

- **WHEN** the player has active mercenaries at capture time
- **THEN** their identity and equipped items appear in the payload

#### Scenario: No companion is active

- **WHEN** no companion is active
- **THEN** the payload records that rather than omitting the section

### Requirement: Measured combat output is capturable

The mod SHALL expose three separate operations: read-only character capture, read-only meter capture,
and explicit meter reset. A character or meter capture SHALL NOT reset the meter. The meter capture
SHALL read the damage total and active-time denominator for the player, pet, and each active mercenary.

A reported measured rate SHALL state which denominator it used, because active time and elapsed time
differ.

#### Scenario: A benchmark run is measured

- **WHEN** a reader resets the meter, attacks a training dummy, and reads the result
- **THEN** the captured damage total, active seconds, and derived rate are reported
- **AND** the denominator is named

#### Scenario: A measured rate is compared against a prediction

- **WHEN** a measured rate is compared against a predicted rate
- **THEN** the comparison records the target, the build, and the model version


### Requirement: The player transport is one local file

A character capture SHALL write one versioned JSON file and report its exact local path. The browser
SHALL be able to read that file without a server or HotRepl connection. Capture SHALL NOT upload data.

#### Scenario: A player captures a build

- **WHEN** the player invokes character capture in the mod
- **THEN** one JSON file is written
- **AND** the player is shown its exact path

#### Scenario: Automation captures the same build

- **WHEN** HotRepl invokes character capture
- **THEN** the same file contract is returned as an automation artifact

### Requirement: Owned items include quantities and containers

The capture SHALL report candidate items held in equipped slots, inventory, and storage. It SHALL
preserve stable identity, quantity, container, slot when equipped, augment state, and current
durability. An owned-gear search SHALL distinguish physical copies.

#### Scenario: One item is equipped and another copy is stored

- **WHEN** the two copies share an item identifier
- **THEN** the payload contains two physical-copy records with different locations

#### Scenario: A stack is captured

- **WHEN** an ammunition stack has a quantity greater than one
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
