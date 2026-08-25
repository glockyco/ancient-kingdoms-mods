## Purpose

Defines what the export guarantees about the values it writes: that they describe the game rather than the session that read it, so a second export of one game build produces the same data and a difference means the game changed.

## Requirements

### Requirement: An export of one game build is reproducible

Exporting twice from the same game build SHALL write the same values. A difference between two exports of one build is a defect in the export, not a change in the game.

Rationale: every recorded baseline in this repository compares against the export. The redaction ledger, the citation lockfile and the generated counts all treat a difference as a change in the game. Two exports of build 24925347 differed in 240 item tooltips, 14 gather item names, 12 spawn positions and one published image, so a reviewer could not tell an artefact from a change, and a reviewer who learns to accept the noise accepts a real change with it.

#### Scenario: A second export of one build

- **WHEN** the game build, the configuration and the exported scope are unchanged
- **THEN** a second export writes the same values as the first
- **AND** the identifiers, the row order and the published asset files are unchanged

#### Scenario: The game changes

- **WHEN** a game build changes a value the export publishes
- **THEN** the export reports that difference

### Requirement: A published value does not depend on the exporting session

A value the export writes SHALL be a function of the game's data. It SHALL NOT depend on the character that ran the export, on that character's progress, on the language the client had selected, on where an actor stood, on which way it faced, or on when during the session the export ran.

Where the game offers a value only through a rendering that consults session state, the export SHALL remove that state's contribution rather than record it, and SHALL state in the exported data which contribution it removed.

Rationale: the game renders an item tooltip for the player in front of it, and colours a required level the character has not reached and a required class it cannot use. Neither statement is true of the item, and no single character satisfies every item's class requirement, so no choice of exporting character makes the rendering correct. The compendium has no player, so the answer is to publish the item's description.

#### Scenario: A requirement the exporting character does not meet

- **WHEN** an item states a required level or a required class
- **THEN** the exported tooltip states the requirement
- **AND** it carries no emphasis that depends on the exporting character

#### Scenario: A different character exports

- **WHEN** two exports of one build are taken by characters of different level and class
- **THEN** they write the same values

#### Scenario: A travel item resolves the character's bind point

- **WHEN** a travel item renders the exporting character's bind-point zone
- **THEN** the exported tooltip states the generic bind-point destination
- **AND** it does not name that character's zone

#### Scenario: A fragment item reports the character's inventory

- **WHEN** a fragment item renders how many pieces the exporting character owns
- **THEN** the exported tooltip states `0 / X`, where `X` is the number required to combine the item
- **AND** it does not state that character's progress
- **AND** the baseline carries no completion colour

#### Scenario: An actor has moved

- **WHEN** an actor is not standing where the game placed it
- **THEN** the exported position is the position the game placed it at
- **AND** the row's zone is the zone of that same position

#### Scenario: An actor is not active

- **WHEN** an actor's object is inactive at the moment the export runs
- **THEN** the captured visual asset is the one its structure selects
- **AND** the recorded source names the structure the asset came from

#### Scenario: An actor's sprite is animated

- **WHEN** an actor's sprite is on any frame of its animation
- **THEN** the export captures the controller's initial frame
- **AND** a root-renderer branch prefers the canonical template over a live scene instance when that template exists
- **AND** a layered composite preserves the initialized scene instance

### Requirement: A value is read from a field no lifecycle method overwrites

Where the game holds one value in two fields, and one of them is assigned by a lifecycle method, the export SHALL read the field that method does not assign. Where only an overwritten field exists, the export SHALL fail rather than write whichever value the timing produced.

Rationale: a gather item carries an authored display name and its own object name, and its `Start` method overwrites the first with the second. The exporter reads objects that have not all started, so the exported name recorded whether that method had run: 14 rows differed while their identifiers, read from the other field, were identical in both exports.

#### Scenario: Both fields are present

- **WHEN** an exported value exists in an authored field and in a field a lifecycle method assigns
- **THEN** the export reads the field the lifecycle method does not assign

#### Scenario: The reading is ambiguous

- **WHEN** the only field holding a value is one a lifecycle method overwrites
- **THEN** the export fails and names the field

### Requirement: The export declares the session state its values assume

The export SHALL record the session state that its values depend on, and the build SHALL fail when that state is not the state the published data assumes.

Rationale: a dependency that cannot be removed must at least be visible. The 0.9.31.0 patch made an item tooltip resolve through the client's selected locale, and nothing in the export or the build would have reported an export taken in Japanese. A recorded declaration turns a silent substitution into a failed build.

#### Scenario: The expected state

- **WHEN** the export is taken under the state the published data assumes
- **THEN** the export records that state
- **AND** the build proceeds

#### Scenario: An unexpected state

- **WHEN** the export is taken under a different locale than the published data assumes
- **THEN** the build fails and names the recorded state and the expected one

#### Scenario: A missing declaration

- **WHEN** an export carries no declared session state
- **THEN** the build fails rather than assuming the expected one
