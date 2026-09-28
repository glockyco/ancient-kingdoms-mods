## ADDED Requirements

### Requirement: OpenSpec owns behavior requirements and active change plans

Current behavior requirements SHALL live under `openspec/specs/`. Work that changes behavior SHALL be
planned under `openspec/changes/` until it is archived through the OpenSpec workflow.

A legacy planning document SHALL NOT remain a second owner of current requirements, implementation
status, or pending tasks. Product, architecture, setup, and operating documents MAY remain outside
OpenSpec when those subjects are their continuing purpose.

#### Scenario: New behavior work is proposed

- **WHEN** the repository accepts work that changes permanent behavior
- **THEN** an OpenSpec change owns its proposal, requirements, design decisions, and tasks
- **AND** no legacy planning index is updated as a parallel registry

#### Scenario: Current behavior is documented outside OpenSpec

- **WHEN** a legacy plan is the only source of a shipped behavior requirement
- **THEN** that requirement is reconciled with the implementation and added to the applicable main spec
- **AND** the legacy plan ceases to own it

### Requirement: Every legacy planning record receives an explicit disposition

A legacy planning migration SHALL inventory every record in its scope and classify each unique claim as
current behavior, still-wanted unfinished work, durable rationale, or disposable history. The migration
SHALL record where every retained item moved before deleting its source record.

A record SHALL NOT be copied wholesale merely to preserve it. Checklists, progress logs, obsolete
status, and restatements of code SHALL be deleted under the existing lifecycle requirements.

#### Scenario: A plan contains shipped and unfinished work

- **WHEN** part of a legacy plan is implemented and part remains wanted
- **THEN** shipped requirements move to the applicable main specs
- **AND** the unfinished scope moves to a dedicated OpenSpec change
- **AND** the legacy record is deleted after both dispositions are verified

#### Scenario: A record contains no unique retained content

- **WHEN** code, tests, specifications, and citations already own every valid claim
- **THEN** the record is deleted without creating a replacement document

### Requirement: Still-wanted work receives a complete and scoped change

Each independent unfinished subject retained from a legacy plan SHALL receive its own OpenSpec change.
The change SHALL contain every artifact required by its workflow before the legacy source is deleted.
A migration SHALL NOT combine unrelated backlog subjects into one implementation change.

#### Scenario: One plan contains two independent features

- **WHEN** both features remain wanted and can be delivered independently
- **THEN** each feature receives a separate OpenSpec change
- **AND** neither is hidden as a task in the planning-system migration

#### Scenario: A replacement change is incomplete

- **WHEN** required proposal, specification, design, or task artifacts are missing
- **THEN** the legacy source remains until the replacement is complete or the work is rejected

### Requirement: The migration does not create a second historical archive

A legacy planning record SHALL be deleted after its retained content has an authoritative owner. It
SHALL NOT be moved to another legacy archive for historical preservation.

OpenSpec's own archive MAY retain completed OpenSpec changes according to the OpenSpec lifecycle. Git
history remains the recovery path for deleted legacy planning prose.

#### Scenario: A completed legacy plan is migrated

- **WHEN** its durable rationale and current requirements have authoritative owners
- **THEN** the plan is deleted rather than moved to an archive directory

### Requirement: Legacy planning removal is complete and reference-clean

A legacy planning hub SHALL be removed only after every scoped record has a verified disposition and no
live file, command, hook, or instruction names the removed hub as an authority or expected path.

The final migration check SHALL prove that the legacy directory and index are absent, all replacement
OpenSpec artifacts validate strictly, and repository guidance identifies the remaining authorities
correctly.

#### Scenario: A reference remains

- **WHEN** a live file still names the legacy planning index or directory
- **THEN** the migration is incomplete
- **AND** the legacy path is not removed until the reference is repaired

#### Scenario: The final migration gate runs

- **WHEN** every record disposition is complete
- **THEN** the legacy planning directory is absent
- **AND** no live reference expects it
- **AND** all affected OpenSpec specifications and changes pass strict validation
