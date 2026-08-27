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

### Requirement: A descriptor is checked for shape before the game runs

A check that needs no game state SHALL run before the game is launched. It covers the schema version,
the presence of every section a measurement depends on, a slot named more than once, and a value
outside its own domain such as a negative level.

A question the game answers SHALL NOT be answered by this check, because the game's own definitions
become readable only once the world is loaded, which is after a character has been created.

#### Scenario: A descriptor states an unsupported schema version

- **WHEN** a descriptor names a schema version the harness does not support
- **THEN** it is refused before the game is launched

#### Scenario: A descriptor names one slot twice

- **WHEN** two equipment entries name the same slot index
- **THEN** it is refused before the game is launched

#### Scenario: A descriptor is well formed but requests an unreachable state

- **WHEN** a descriptor is well formed and requests skill levels its points cannot reach
- **THEN** the earlier check accepts it
- **AND** the check against the game refuses it once the world is loaded

### Requirement: A fixture is reachable in normal play

A fixture SHALL NOT request a state the game cannot produce. Skill levels SHALL respect the point
budget of their pool, the tier gates, and the prerequisite chains. Attribute totals SHALL be consistent
with the class progression for the requested level.

An equipment entry SHALL name a slot the item fits, and SHALL satisfy the item's class and level
requirements. A slot accepts an item when the item's category satisfies that slot's required category,
and more than one slot can accept the same category, so an item is not tied to a single index. A
two-handed weapon SHALL leave the offhand empty, and two-handedness is a property of the item's
category rather than a separate flag.

Where the engine itself decides a question, that decision SHALL be the authority rather than a
restatement of it.

#### Scenario: A fixture requests more skill levels than its points allow

- **WHEN** a requested allocation exceeds the points available at the requested level
- **THEN** materialization fails and reports the shortfall
- **AND** no measurement is produced

#### Scenario: A fixture requests an item its class cannot equip

- **WHEN** an equipment entry fails the item's class or level requirement
- **THEN** materialization fails and names the offending slot

#### Scenario: An item fits more than one slot

- **WHEN** an item's category is accepted by several slots
- **THEN** a fixture naming any one of them is accepted

#### Scenario: An item is placed in a slot it does not fit

- **WHEN** an equipment entry names a slot whose required category the item does not satisfy
- **THEN** materialization fails and reports the slots the item does fit

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

### Requirement: A stated equipment section describes every slot

Where a fixture states its equipment, that statement SHALL describe the whole of it. A slot the
fixture does not name SHALL be emptied.

A character created through the game's own creator wears starter equipment. A slot left as created
would contribute to every measurement while no fixture named it, and the report would attribute that
contribution to the fixture.

An absent equipment section SHALL leave every slot as it is, because absent means the section was
never read, while an empty section states that nothing is worn.

#### Scenario: A fixture names some slots and not others

- **WHEN** a fixture states equipment for three slots and the character was created wearing five
- **THEN** the three are equipped and the other two are emptied

#### Scenario: A fixture states an empty equipment section

- **WHEN** a fixture states equipment and names no slot
- **THEN** every slot is emptied

#### Scenario: A fixture omits the equipment section

- **WHEN** a fixture has no equipment section
- **THEN** the slots are left as they are, and the report says so

### Requirement: An item is described completely by what a fixture can state

An item instance SHALL be reproducible from its identifier, its durability, and its augment.

The game holds no rolled value on an item instance, so those three describe it completely and a
fixture needs no captured roll to reproduce one.

#### Scenario: The same fixture is materialized twice

- **WHEN** one fixture is materialized in two runs
- **THEN** both runs produce the same items, with no random component

### Requirement: Companion rolled values are set directly and constrained to the reachable envelope

A companion's health multiplier, resource multiplier, and base combat value SHALL be assigned directly
rather than obtained by repeated hiring.

A companion's race SHALL NOT be assigned. The engine draws it from a list the archetype allows, so an
assigned race produces a companion the game never offers. Where a fixture states a race, the drawn race
SHALL be compared against it and a difference SHALL be reported, because the seed the fixture records
is what makes the draw reproducible.

Each assigned value SHALL fall inside the range the hire path can produce for that companion's race and
archetype at the owner's level.

A companion SHALL be acquired after the owner has been levelled, so that it receives no part of the
increment the engine adds per level-up. This ordering makes a fixture match the modelled behaviour by
construction, and the increment is excluded deliberately because it is a defect.

A value the engine never reads SHALL be recorded for fidelity but SHALL NOT be treated as affecting
output.

#### Scenario: A fixture states a race the draw did not produce

- **WHEN** a fixture states a companion race and the engine draws another
- **THEN** materialization fails and reports both races

#### Scenario: A fixture states no companion race

- **WHEN** a fixture states no race for a companion
- **THEN** the drawn race is kept and recorded

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
