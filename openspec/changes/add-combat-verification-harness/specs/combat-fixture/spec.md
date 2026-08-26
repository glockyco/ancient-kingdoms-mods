## Purpose

Defines what a build fixture describes and what materializing one inside the running game guarantees.
A measurement is only meaningful if the character it was taken from is a character a player could
actually have, so this capability constrains what a fixture is allowed to request.

## ADDED Requirements

### Requirement: One descriptor serves authored fixtures and reported builds

A fixture descriptor and a build captured from a player's game SHALL use the same schema.

A descriptor SHALL carry the class, race, level, veteran progression, attribute values, skill levels
for each point pool, every equipment slot with any attached augment, each companion with its own
equipment, the declared consumables, the target, and the version of the game it describes.

#### Scenario: A player reports a mismatch

- **WHEN** a player supplies a build captured from their game
- **THEN** it is accepted as a fixture without conversion
- **AND** it can be materialized and measured by the same path as an authored fixture

#### Scenario: A descriptor omits a required field

- **WHEN** a descriptor does not state a value the measurement depends on
- **THEN** materialization fails and names the missing field
- **AND** no default is substituted

### Requirement: A fixture is reachable in normal play

A fixture SHALL NOT request a state the game cannot produce. Skill levels SHALL respect the point
budget of their pool, the tier gates, and the prerequisite chains. Attribute totals SHALL be consistent
with the class progression for the requested level. Equipment SHALL satisfy the class, level, and
weapon category requirements of its slot, and a two-handed weapon SHALL leave the offhand empty.

#### Scenario: A fixture requests more skill levels than its points allow

- **WHEN** a requested allocation exceeds the points available at the requested level
- **THEN** materialization fails and reports the shortfall
- **AND** no measurement is produced

#### Scenario: A fixture requests an item its class cannot equip

- **WHEN** an equipment entry fails the slot's class, level, or category requirement
- **THEN** materialization fails and names the offending slot

### Requirement: Materialization uses the game's own paths

Character creation, level progression, skill point spending, item granting, and equipping SHALL be
performed through the methods the game itself uses.

Level progression SHALL be driven by awarding experience so that the engine grants attribute points,
skill points, the class attribute progression, veteran points, and companion scaling.

State SHALL NOT be assigned directly where an engine path exists.

#### Scenario: A fixture requests the level cap with full veteran progression

- **WHEN** a fixture requests the maximum level and full veteran progression
- **THEN** experience is awarded until the engine has granted that progression
- **AND** the resulting point totals and companion levels are the engine's own

#### Scenario: A class differs from any existing character

- **WHEN** a fixture requests a class no existing character has
- **THEN** a new character of that class is created through the creation path

### Requirement: Companion rolled values are set directly and constrained to the reachable envelope

A companion's health multiplier, resource multiplier, and base combat value SHALL be assigned directly
rather than obtained by repeated hiring.

Each assigned value SHALL fall inside the range the hire path can produce for that companion's race and
archetype at the owner's level.

A companion SHALL be acquired after the owner has been levelled, so that it receives no part of the
increment the engine adds per level-up. This ordering makes a fixture match the modelled behaviour by
construction, and the increment is excluded deliberately because it is a defect.

A value the engine never reads SHALL be recorded for fidelity but SHALL NOT be treated as affecting
output.

#### Scenario: A companion value is outside the reachable range

- **WHEN** a fixture requests a multiplier or base combat value the hire path cannot produce for that
  race and archetype
- **THEN** materialization fails and reports the reachable range

#### Scenario: A companion archetype ignores its resource multiplier

- **WHEN** a companion's archetype uses the resource pool whose maximum ignores its multiplier
- **THEN** the multiplier is recorded
- **AND** it is excluded from any predicted or reported output

#### Scenario: A companion is acquired before the owner is levelled

- **WHEN** materialization would acquire a companion before completing the owner's progression
- **THEN** the ordering is corrected so the companion is acquired last
- **AND** the companion carries no part of the per-level increment

### Requirement: Look direction is part of the fixture

A fixture SHALL state the facing used for each action, because facing changes both avoidance and
damage.

#### Scenario: Facing is unspecified

- **WHEN** a fixture does not state a facing
- **THEN** materialization fails rather than choosing one

#### Scenario: Facing grants a combat advantage

- **WHEN** the stated facing matches the target's facing
- **THEN** the measurement records that the combat advantage applied

### Requirement: A run is isolated from player data

A verification run SHALL operate on its own scratch database. Fixture characters SHALL NOT be written
into a player's save.

A run SHALL refuse to start unless the resolved database path is inside its own scratch location.

#### Scenario: The resolved path is outside the scratch location

- **WHEN** the database path does not resolve inside the run's scratch location
- **THEN** the run refuses to start and reports the resolved path

#### Scenario: A run crashes partway through

- **WHEN** a run terminates before completing
- **THEN** no player save has been modified

### Requirement: Scratch state is reused but never committed

A materialized scratch database MAY be retained and reused when both the game version and the fixture
definitions are unchanged.

It SHALL be rebuilt when either changes. It SHALL NOT be committed to the repository. Fixture
descriptors and the recorded baseline SHALL be committed.

#### Scenario: The game version changes

- **WHEN** a run finds the recorded game version differs from the installed one
- **THEN** the scratch state is rebuilt before measurement

#### Scenario: A fixture definition changes

- **WHEN** a fixture descriptor changes
- **THEN** that fixture is rematerialized rather than reused
