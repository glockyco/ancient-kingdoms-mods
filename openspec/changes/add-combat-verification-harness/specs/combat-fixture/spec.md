## Purpose

Defines the build data, execution data, and materialization guarantees for an observable combat fixture.
A measurement is meaningful only when the game reaches the state that the fixture requests.

## ADDED Requirements

### Requirement: Fixtures and captures share build data without sharing outer records

An authored fixture and a build captured from a player's game SHALL carry the same versioned build data.
The version envelope SHALL identify the serialized schema and game-data versions. It SHALL NOT replace the
build data. A capture schema, model version, and evaluator version SHALL remain separate identities.

Build data SHALL contain progression, attributes, skills for each point pool, equipment, controlled
companions, consumable identity and quantity, declared permanent learned books as `learnedBookIds`,
and the build provenance needed to identify its source. Each item SHALL use its stable asset identifier
rather than its displayed name as its identity.

A fixture record SHALL add execution data. Execution data SHALL include the target, initial state, action
schedule, facing for each action, seed, and consumption policy. A captured build SHALL add completeness
markers for every captured section and container metadata for the capture. Container metadata SHALL identify
the capture container schema, source, and integrity. It SHALL remain outside the shared build data. The
fixture and capture outer records SHALL NOT be required to have identical schemas, and either record SHALL
NOT claim that no adaptation is needed.

#### Scenario: A player reports a mismatch

- **WHEN** a player supplies a build captured from the game
- **THEN** the harness reads its shared build data through the capture adapter
- **AND** it does not silently convert missing or unread sections into empty sections

#### Scenario: A fixture and capture use different outer metadata

- **WHEN** a fixture and a capture contain the same build data
- **THEN** each retains its own execution or capture metadata
- **AND** the shared build data remains comparable without making the outer records identical

#### Scenario: A version envelope is unsupported

- **WHEN** a record names an unsupported serialized schema or game-data version
- **THEN** the harness refuses the record before materialization
- **AND** it reports the unsupported identity

#### Scenario: Capture container integrity fails

- **WHEN** container metadata does not match the captured payload
- **THEN** the harness refuses the capture before reading shared build data
- **AND** it reports the integrity failure

### Requirement: Learned-book declarations are explicit and read-only captures are complete

Shared build data SHALL declare permanent learned books as stable item asset identifiers in
`learnedBookIds`. This declaration SHALL remain separate from allocated attribute points, skill budgets,
inventory consumables, equipped bonuses, and transient effects. An empty `learnedBookIds` declaration
means that no books are learned. A missing or unread declaration SHALL be incomplete.

The versioned planner/game catalog SHALL define each book's current attribute gains and effect
classifications. Build data SHALL NOT copy those gains or classifications. The fixture and capture
adapter SHALL refuse an unknown or duplicate book identity and SHALL NOT silently deduplicate it. A
capture SHALL read the character's actual learned-book state, not inventory ownership, and SHALL NOT
call learning, reset, or any other mutation path to obtain it.

A capture with unresolved book contributions SHALL preserve the observations and diagnostics, but SHALL
refuse every dependent qualification. Live attribute totals SHALL be reported as achieved totals, never
as base attributes or allocated points.

#### Scenario: No books are declared

- **WHEN** a fixture declares an empty `learnedBookIds`
- **THEN** the harness materializes no learned books
- **AND** it records the empty declaration as complete

#### Scenario: The learned-book declaration is missing or unread

- **WHEN** a capture omits or cannot read the learned-book section
- **THEN** the section is marked incomplete
- **AND** a dependent materialization or measurement stops

#### Scenario: A book identity is unknown or repeated

- **WHEN** `learnedBookIds` contains an unknown identity or a duplicate identity
- **THEN** dependent materialization and evaluation are refused
- **AND** the harness retains diagnostics naming the identity without silently deduplicating it

#### Scenario: Inventory ownership is mistaken for learning

- **WHEN** an item is present in inventory but the learned-book state does not contain its identity
- **THEN** the harness records the book as not learned
- **AND** it does not infer a learned book from inventory ownership

#### Scenario: Learned state cannot be read without mutation

- **WHEN** capture cannot obtain learned-book state without a learning, reset, or other mutation path
- **THEN** it marks that section unread instead of mutating the character
- **AND** it preserves other readable observations and the reason

#### Scenario: A catalog contribution is unresolved

- **WHEN** the catalog cannot resolve a declared book's gains or effect classifications
- **THEN** dependent qualification is refused
- **AND** the report preserves the unresolved identity and catalog diagnostics

### Requirement: Completeness gates every dependent measurement

A run SHALL distinguish complete, absent, and unread build sections using capture completeness metadata
or the fixture declaration as appropriate. Capture completeness metadata SHALL remain outside shared
build data. The run SHALL identify required sections before starting each measurement.

A required absent or unread section SHALL stop the dependent materialization or measurement unless the
measurement explicitly accepts game-created initial state and records that state as an input. An empty
section SHALL mean that the section was read and contains no entries. No default, inferred value, or
measured replacement SHALL stand in for a missing value.

#### Scenario: A required section is unread

- **WHEN** a capture marks equipment or skills as unread
- **THEN** a measurement that depends on that section stops
- **AND** the run reports the section as incomplete

#### Scenario: An optional section is absent

- **WHEN** a build does not capture companions and the measurement does not use companions
- **THEN** the run can continue without treating the section as empty

#### Scenario: An empty section is captured

- **WHEN** a capture marks equipment as complete with no entries
- **THEN** the harness treats the character as having no declared equipment
- **AND** it does not treat the section as unread

### Requirement: A descriptor is checked for shape before the game runs

A check that needs no game state SHALL run before the game is launched. It SHALL check the schema version,
the completeness of sections required by the selected measurement, duplicate slot names, and values
outside their own domain such as a negative level.

A question that the game answers SHALL NOT be answered by this check. The game supplies those definitions
only after world entry, so the game-backed check runs after the required character exists.

#### Scenario: A descriptor states an unsupported schema version

- **WHEN** a descriptor names a schema version the harness does not support
- **THEN** it is refused before the game is launched

#### Scenario: A descriptor names one slot twice

- **WHEN** two equipment entries name the same slot index
- **THEN** it is refused before the game is launched

#### Scenario: A descriptor is well formed but requests an unreachable state

- **WHEN** a descriptor is well formed and requests skill levels its points cannot reach
- **THEN** the shape check accepts it
- **AND** the game-backed check refuses it after world entry

### Requirement: A fixture is reachable in normal play

A fixture SHALL NOT request a state the game cannot produce. Skill levels SHALL respect the point budget
of their pool, the tier gates, and the prerequisite chains. Attribute totals SHALL be consistent with the
class progression for the requested level.

An equipment entry SHALL name a slot the item fits, and SHALL satisfy the item's class and level
requirements. A slot accepts an item when the item's category satisfies that slot's required category.
A two-handed weapon SHALL leave the offhand empty. Two-handedness SHALL come from the item's category,
not from a fixture flag.

Where the engine itself decides a question, that decision SHALL remain the authority rather than a copied
table in the harness.

#### Scenario: A fixture requests more skill levels than its points allow

- **WHEN** a requested allocation exceeds the points available at the requested level
- **THEN** materialization fails and reports the shortfall
- **AND** no dependent measurement is produced

#### Scenario: A fixture requests an item its class cannot equip

- **WHEN** an equipment entry fails the item's class or level requirement
- **THEN** materialization fails and names the offending slot

#### Scenario: An item fits more than one slot

- **WHEN** an item's category is accepted by several slots
- **THEN** a fixture naming any one of those slots is accepted

#### Scenario: An item is placed in a slot it does not fit

- **WHEN** an equipment entry names a slot whose required category the item does not satisfy
- **THEN** materialization fails and reports the slots the item does fit

### Requirement: Materialization uses the game's own paths

Character creation, level progression, skill spending, item granting, equipping, and learned-book
progression SHALL use the methods the game itself uses. Level progression SHALL award experience so the
engine grants attribute points, skill points, class progression, veteran points, and companion scaling.
A declared learned book SHALL be learned through the normal game learning path rather than by
assigning its identity or gains directly.

State SHALL NOT be assigned directly where an engine path exists. The bounded exception for companion
rolled values is defined separately. Learned-book gains SHALL have no direct-assignment exception.

#### Scenario: A declared book is learned through the normal path

- **WHEN** a legal fixture declares a book identity
- **THEN** the harness invokes the game's normal book-learning path
- **AND** it does not assign the book or its catalog gains directly

#### Scenario: Learning does not produce the declared state

- **WHEN** the declared identity is not learned or the observed attribute delta differs from the catalog's expected delta
- **THEN** materialization fails with the book identity and before-and-after values
- **AND** no dependent measurement is produced

#### Scenario: Achieved learned state differs from the declaration

- **WHEN** final readback finds a learned-book identity or resulting live attribute total differs from the fixture
- **THEN** materialization fails and reports the requested and achieved state
- **AND** it does not label the live total as a base attribute or allocated points

#### Scenario: Learned-book achieved state is read back

- **WHEN** materialization completes a fixture with declared learned books
- **THEN** the harness reads back the complete learned-book ID set and the resulting live attribute totals
- **AND** it compares both with the requested state before dependent measurement

#### Scenario: A retained learned-book state is reloaded

- **WHEN** a retained character with learned books is loaded for a measurement
- **THEN** the harness reads back the learned IDs and achieved live attributes before measurement
- **AND** it does not learn or reset a book during reload

#### Scenario: Reload must not apply permanent gains twice

- **WHEN** reload would apply a persisted book gain a second time
- **THEN** the run refuses the retained state
- **AND** it preserves the before-and-after attributes and reload diagnostics

#### Scenario: A fixture requests the level cap with full veteran progression

- **WHEN** a fixture requests the maximum level and full veteran progression
- **THEN** experience is awarded until the engine grants that progression
- **AND** the resulting point totals and companion levels are the engine's own

#### Scenario: A class differs from any existing character

- **WHEN** a fixture requests a class no existing character has
- **THEN** a new character of that class is created through the game's creation path

### Requirement: Item identity and quantity are explicit

An item instance SHALL be identified by its stable asset identifier, durability, augment, and quantity.
The displayed name can be retained as context but SHALL NOT resolve the item. An equipped item SHALL have
quantity one. A stackable item SHALL state a positive quantity.

A fixture SHALL not infer an item, quantity, durability, or augment from another entry. A missing item
section SHALL remain distinct from an empty item section.

#### Scenario: An item is renamed in the game

- **WHEN** the displayed name changes but the stable asset identifier remains
- **THEN** the fixture resolves the same item
- **AND** it does not resolve by the changed displayed name

#### Scenario: A consumable quantity is missing

- **WHEN** a measurement depends on a consumable and its quantity is not stated
- **THEN** the fixture is incomplete
- **AND** materialization stops without choosing a quantity

#### Scenario: An equipped item has a stack quantity

- **WHEN** an equipment entry states a quantity other than one
- **THEN** legality validation refuses the entry
- **AND** it reports that equipment quantity is one

### Requirement: A stated equipment section describes every slot

Where a fixture states its equipment, that statement SHALL describe the whole of it. A slot the fixture
does not name SHALL be emptied. A character created through the game's creator starts with equipment,
so an unmentioned starter item would affect every measurement.

An absent equipment section SHALL leave the slots as created because absent means that the section was
not read. An empty equipment section SHALL state that no equipment is worn.

#### Scenario: A fixture names some slots and not others

- **WHEN** a fixture states equipment for three slots and the character starts with five items
- **THEN** the three declared items are equipped
- **AND** the other two slots are emptied

#### Scenario: A fixture states an empty equipment section

- **WHEN** a fixture states equipment and names no slot
- **THEN** every equipment slot is emptied

#### Scenario: A fixture omits the equipment section

- **WHEN** a fixture has no equipment section and the measurement accepts game-created initial state
- **THEN** the slots remain as created
- **AND** the run reports that equipment was not read

#### Scenario: A measurement needs declared equipment

- **WHEN** a fixture has no equipment section and the measurement needs exact equipment
- **THEN** the dependent measurement stops as incomplete
- **AND** the run does not substitute the starter equipment

### Requirement: Consumables have declared contents and use policy

Build data SHALL state each declared consumable by stable asset identifier and quantity. Execution data
SHALL state whether the run uses each consumable, when it uses it, and what the run does when the game
refuses the use. A run SHALL NOT add, remove, or replenish an undeclared consumable.

#### Scenario: A consumable use is scheduled

- **WHEN** an action schedule uses a declared consumable
- **THEN** the run uses the stated quantity at the stated schedule point
- **AND** a refusal follows the declared refusal policy

#### Scenario: A run needs an undeclared consumable

- **WHEN** an action requests a consumable absent from the declared inventory
- **THEN** the action is refused
- **AND** the run does not substitute another item

### Requirement: Execution and target state are explicit inputs

A fixture SHALL state the initial state needed by its measurement, including caster resources and effects,
target identity and state, positions or movement policy, and any world condition that changes the result.
The target state SHALL be a separate input from the caster build. Each target-state value SHALL carry its
source or capture provenance.

A missing initial-state or target field that a measurement needs SHALL stop that measurement. The harness
SHALL NOT copy a caster value into the target or infer a target value from the model.

#### Scenario: A target defense is not captured

- **WHEN** a measurement depends on target defense and the target state does not contain it
- **THEN** the measurement stops as incomplete
- **AND** it does not use the caster's defense or a predicted defense

#### Scenario: A target state is captured independently

- **WHEN** a target value comes from a game readback
- **THEN** the run retains that value and its provenance as an independent input
- **AND** it does not overwrite it with a model value

### Requirement: The action schedule states timing and refusal policy

Each scripted player action SHALL state its action identity, start condition, timing, repetition or end
condition, facing, and refusal policy. The schedule SHALL state the measurement start and end boundaries.
Companion actions SHALL remain autonomous and SHALL NOT be represented as scripted player actions.

The run SHALL keep requested, accepted, completed, and hit actions distinct. A refused action SHALL NOT
be counted as accepted, completed, or hit.

#### Scenario: A schedule omits its end boundary

- **WHEN** a measurement needs a bounded action window and the schedule has no end condition
- **THEN** the fixture is incomplete
- **AND** the run does not start the dependent measurement

#### Scenario: A companion acts during a player schedule

- **WHEN** a companion chooses an action during the schedule
- **THEN** the run records it as autonomous companion activity
- **AND** it does not treat it as a scripted player action

#### Scenario: The game refuses a requested action

- **WHEN** the game refuses a scheduled action
- **THEN** the run applies the stated refusal policy
- **AND** it preserves the refusal separately from accepted and completed actions

### Requirement: Materialization verifies achieved state before dependent measurement

Every mutating materialization step SHALL read the relevant value before and after the engine action. A
step that produces no expected change SHALL fail loudly with the step and requested value. After loading
a retained character, the run SHALL read back the complete achieved state and compare it with the request.

A requested-versus-achieved mismatch SHALL stop every dependent measurement. A measured total SHALL NOT
replace a predicted total to conceal a mismatch. A run SHALL preserve the mismatch as provenance for the
failed materialization.

#### Scenario: An engine command silently refuses

- **WHEN** a mutation command returns without the requested effect
- **THEN** the before and after readback detects the refusal
- **AND** materialization fails with the step and value

#### Scenario: A retained character differs from its fixture

- **WHEN** final readback finds a requested level, skill, item, or quantity differs from the fixture
- **THEN** dependent measurement stops
- **AND** the run does not claim parity from the achieved but different state

### Requirement: Companion rolled values are bounded and read back

A companion's health multiplier, resource multiplier, and base combat value SHALL be assigned directly
rather than obtained by repeated hiring. Each assigned value SHALL fall inside the range the hire path
can produce for the companion's race and archetype at the owner's level.

A companion's race SHALL NOT be assigned. The engine SHALL draw it from the allowed race list. If a
fixture states a race, the run SHALL compare it with the drawn race and report a mismatch. The fixture
seed SHALL be recorded as provenance for the draw, but it SHALL NOT promise the same draw across runs.

A companion SHALL be acquired after the owner completes progression. The hire path's per-level increment
SHALL NOT be added a second time. After loading, the run SHALL reapply transient assigned values and read
them back before any dependent measurement.

A value the engine never reads SHALL be recorded for fidelity but SHALL NOT affect predicted or measured
output. The harness SHALL cover every supported companion archetype when that archetype is in the
measurement domain.

#### Scenario: A fixture states a race the draw did not produce

- **WHEN** a fixture states a companion race and the engine draws another
- **THEN** materialization fails and reports both races
- **AND** it does not claim that the seed guarantees the requested race

#### Scenario: A fixture states no companion race

- **WHEN** a fixture states no race for a companion
- **THEN** the drawn race is kept and recorded
- **AND** the run treats the seed as provenance rather than a reproducibility guarantee

#### Scenario: A companion value is outside the reachable range

- **WHEN** a fixture requests a multiplier or base combat value outside the hire envelope
- **THEN** materialization fails and reports the reachable range

#### Scenario: A companion is acquired before the owner is levelled

- **WHEN** materialization would acquire a companion before owner progression completes
- **THEN** the run acquires the companion after progression
- **AND** the companion receives no per-level increment from the earlier progression

#### Scenario: A transient companion value is lost on load

- **WHEN** a retained character reloads without its assigned transient value
- **THEN** the run reapplies the value
- **AND** it reads back the value before measuring

### Requirement: Look direction is part of the fixture

A fixture SHALL state the facing used for each action, because facing changes avoidance and damage.

#### Scenario: Facing is unspecified

- **WHEN** a fixture does not state facing for an action
- **THEN** the action is incomplete
- **AND** materialization or measurement fails rather than choosing a facing

#### Scenario: Facing grants a combat advantage

- **WHEN** the stated facing matches the target's facing
- **THEN** the execution data records that the combat advantage applied

### Requirement: A run is isolated from player data

A verification run SHALL operate on its own scratch database. Fixture characters SHALL NOT be written
into a player's save. The run SHALL establish exclusive session ownership and verify the required backup
before scratch mutation or game launch.

A run SHALL refuse to start unless the resolved database path is the exact canonical path owned by that
run. A path that escapes the owned scratch directory, uses a symlink, or differs from the
owned canonical path SHALL fail closed.

#### Scenario: The resolved path is outside the scratch location

- **WHEN** the database path does not resolve to the run's exact owned canonical path
- **THEN** the run refuses to start and reports the resolved path

#### Scenario: Another instance owns the session

- **WHEN** another game instance answers the runtime endpoint
- **THEN** the run refuses before touching scratch state
- **AND** it reports that the session is not owned

#### Scenario: A run crashes partway through

- **WHEN** the game process crashes before completing
- **THEN** the surviving runner performs cleanup and isolation readback
- **AND** an interrupted runner leaves no reusable completion marker
- **AND** scratch isolation protects the player save without relying on cleanup

### Requirement: Verified materialization is the only retained scratch state

A run SHALL retain scratch state only with a marker that identifies the game build, fixture definition,
complete achieved state, and successful readback. A run SHALL rebuild state when any marker differs or
when the marker is missing or incomplete.

After reuse, the run SHALL reapply and read back transient values before a dependent measurement. Scratch
state SHALL NOT be committed to the repository. Fixture descriptors and reviewed baselines SHALL remain
repository data.

#### Scenario: The game version changes

- **WHEN** a run finds the recorded game identity differs from the installed identity
- **THEN** the scratch state is rebuilt before measurement

#### Scenario: A fixture definition changes

- **WHEN** a fixture definition or its name changes
- **THEN** that fixture is rematerialized rather than reused

#### Scenario: A retained marker is incomplete

- **WHEN** a retained database lacks a complete achieved-state and readback marker
- **THEN** the run rebuilds that fixture
- **AND** it does not treat the database as materialized
