## MODIFIED Requirements

### Requirement: Redaction decisions are recorded and reviewable

The build SHALL record every redaction decision in a version-controlled ledger. Each removed entity's record SHALL state the mechanism that removed it, the reason, and the already-removed entities the decision followed.

Each record SHALL be identified by something that survives a game build. Where a row's own identifier is derived from the runtime object the exporter read, the record SHALL be identified by the placement instead: the zone the row stands in and its position, rounded so that a coordinate carries no more precision than the data supports. Where a row's own identifier is already reproducible, the record SHALL keep it.

The identifiers the compendium publishes SHALL NOT change on account of this. The ledger and the published data may identify the same row differently.

A verification step SHALL compare the recorded decisions against those the current data produces and SHALL fail when they differ. Updating the ledger SHALL be a deliberate step, never a side effect of building.

Rationale: the invariant check proves nothing excluded survived. The ledger proves nothing was excluded by accident. A change in what is redacted then arrives as a reviewable diff rather than as content silently disappearing. Identifying a placement by the runtime object it came from defeated that: one added spawn renumbered ninety-eight others, and a reviewer who accepts hundreds of opaque changes will accept a real one with them. A position is what the placement is.

#### Scenario: An entity is removed

- **WHEN** redaction removes an entity
- **THEN** the ledger records its mechanism, its reason, and the removals it followed

#### Scenario: A placement is recorded

- **WHEN** the removed row's identifier comes from the runtime object the exporter read
- **THEN** the ledger identifies it by its zone and its rounded position
- **AND** the record still names the entity the placement puts in the world

#### Scenario: A patch renumbers placements

- **WHEN** a patch changes the runtime identifiers of removed placements without moving them
- **THEN** the ledger does not change

#### Scenario: A placement appears or moves

- **WHEN** a removed placement is added, moved beyond the recorded precision, or taken away
- **THEN** the ledger changes for that placement alone

#### Scenario: The excluded set changes

- **WHEN** a data or configuration change alters which entities are removed
- **AND** the ledger still records the previous set
- **THEN** the verification fails and reports what appeared and what disappeared

#### Scenario: Explaining one entity

- **WHEN** somebody asks why a specific entity is absent from the published output
- **THEN** the recorded chain answers it without reading the pipeline source

#### Scenario: Unchanged build

- **WHEN** the data and configuration are unchanged
- **THEN** rebuilding produces an identical ledger

### Requirement: The build fails when a redacted reference survives

After redaction and the cascade complete, the build SHALL verify that no published content references redacted content, and SHALL fail when it finds one. The verification SHALL cover values of any shape, including text and JSON, so that an undeclared reference form is still caught.

The identifiers the verification scans for SHALL be the removals the current data produces, in the form the published data carries them. It SHALL NOT take them from the recorded ledger, because a ledger that has not been synced names the previous removals and the verification would report a clean result for content it never checked.

#### Scenario: Surviving reference

- **WHEN** a published value still holds an excluded zone or removed entity identifier
- **THEN** the build fails and reports where the reference was found

#### Scenario: Clean build

- **WHEN** no reference to redacted content remains
- **THEN** the verification passes and the build continues

#### Scenario: A new reference shape appears

- **WHEN** a schema change introduces a reference form the discovery step does not know
- **AND** a published value holds a redacted identifier in that form
- **THEN** the build fails rather than publishing it

#### Scenario: The ledger has not been synced

- **WHEN** the data removes an entity that the recorded ledger does not name
- **AND** a published value holds that entity's identifier
- **THEN** the verification fails
