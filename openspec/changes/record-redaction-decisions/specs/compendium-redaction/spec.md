## MODIFIED Requirements

### Requirement: Redaction decisions are recorded and reviewable

The build SHALL record every redaction decision in a version-controlled ledger. A decision is a removal the configuration states. Each decision SHALL be recorded as its own entry stating its mechanism and its reason.

A derivation is a removal the closure computed from a decision. Derivations SHALL be recorded in groups. Each group SHALL state the mechanism, the reason, the table, the chain of already-removed entities the derivation followed, and the number of rows it removed. A group SHALL NOT record the identifier of each row it covers.

Rationale: a ledger exists so that a change in what is redacted arrives as a reviewable diff. Most derivations are placement rows whose identifiers name a runtime object of one game build, so a patch that edits a zone renumbers all of them. Recording each one produced hundreds of changed lines per patch for content whose removal had not changed, and a reviewer who accepts that wholesale will accept a real change with it. A count states what a reviewer can act on: that a decision now removes more or fewer rows.

A verification step SHALL compare the recorded decisions and groups against those the current data produces and SHALL fail when they differ. Updating the ledger SHALL be a deliberate step, never a side effect of building.

#### Scenario: An entity is removed

- **WHEN** the configuration names an entity, excludes its zone, or hides its crafting
- **THEN** the ledger records that entity as its own entry with its mechanism and reason

#### Scenario: A decision removes rows through the closure

- **WHEN** removing a decision's entity removes further rows
- **THEN** the ledger records one group for each mechanism, reason, table and followed chain
- **AND** each group states how many rows it removed
- **AND** no identifier of a covered row appears in the ledger

#### Scenario: Placements are renumbered by a patch

- **WHEN** a patch changes the identifiers of removed placement rows without changing how many are removed
- **THEN** the ledger does not change

#### Scenario: The excluded set changes

- **WHEN** a data or configuration change alters which entities are removed
- **AND** the ledger still records the previous set
- **THEN** the verification fails and reports the decisions that appeared or disappeared, and the groups whose count changed

#### Scenario: Explaining one entity

- **WHEN** somebody asks why a specific entity is absent from the published output
- **THEN** the answer names the chain the current data produces for it, without reading the pipeline source

#### Scenario: Unchanged build

- **WHEN** the data and configuration are unchanged
- **THEN** rebuilding produces an identical ledger

### Requirement: The build fails when a redacted reference survives

After redaction and the cascade complete, the build SHALL verify that no published content references redacted content, and SHALL fail when it finds one. The verification SHALL cover values of any shape, including text and JSON, so that an undeclared reference form is still caught.

The identifiers the verification scans for SHALL be the removals the current data produces. It SHALL NOT take them from the recorded ledger, because a ledger that has not been synced names the previous removals and the verification would report a clean result for content it never checked.

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
