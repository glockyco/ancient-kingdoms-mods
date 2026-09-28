## Purpose

Sets the conditions under which a document in this repository is kept and the conditions under
which it is deleted. It exists because a wrong document costs more than a missing one: a reader
who trusts it acts on a false premise, and nothing in the build ever contradicts prose.

## Requirements

### Requirement: A document's claims about the repository are true

A document that asserts something about the current state of the repository SHALL be correct. When
a claim becomes false, the document SHALL be corrected or deleted. It SHALL NOT be left standing.

A document whose claims are mostly correct and whose purpose still holds is corrected. A document
whose central premise has collapsed is deleted, because correcting it would mean rewriting it.

#### Scenario: A referenced path no longer exists

- **WHEN** a document names a file or directory that is absent
- **THEN** the document is corrected or deleted before the next change ships

#### Scenario: A document describes a superseded layout

- **WHEN** a document's description of where things live contradicts the code that puts them there
- **THEN** the code is the truth and the document is wrong

### Requirement: Document type grants no exemption

A note, draft, audit, research finding, or plan SHALL be held to the same accuracy standard as any
other document. Its type MAY explain why it was written, and its date MAY explain when it was
true, but neither preserves it once its claims are false.

Rationale: the exemption is what lets a stale document survive review. A survey of "the state
today" is exactly the kind of document that expires, and labelling it a note does not slow that
down.

#### Scenario: A dated research note is surveyed against reality

- **WHEN** a note recorded the state of the repository at a past date
- **AND** that state has since changed
- **THEN** the note is deleted rather than kept for its type

### Requirement: Unstarted is not stale

An unstarted plan SHALL NOT be deleted solely because its tasks are open. Its wanted work SHALL
remain planned. If the plan is a legacy document, its complete unfinished scope SHALL move to a
dedicated OpenSpec change before that document is deleted.

Absence of progress is not evidence of staleness.

#### Scenario: A plan has no completed tasks

- **WHEN** a plan's tasks are all open
- **AND** its problem statement still describes something the project wants
- **THEN** the wanted work remains planned under an active OpenSpec change

#### Scenario: A plan's problem was solved another way

- **WHEN** the need a plan addresses has been met by different work
- **THEN** the plan is deleted, whether or not its own tasks were completed

### Requirement: A completed plan is closed, and its rationale relocated first

Once planned work has shipped, its implementation and tests become the behavior record. A completed
legacy plan SHALL be deleted. A completed OpenSpec change MAY remain in the OpenSpec archive under
the historical-record exemption, but SHALL NOT remain an active change.

Before deleting, any rationale the implementation cannot express SHALL be relocated to where the
decision lives. Four kinds qualify:

- a rejected alternative and the reason it was rejected;
- a constraint imposed from outside the repository, such as the shape of exported game data;
- a measured result that justified a threshold or constant;
- an explanation of why something is deliberately absent.

Everything else — step lists, checklists, progress logs, and restatements of shipped behaviour —
SHALL be deleted without relocation.

Rationale: an absence is invisible in code. A reader can see that a constant is 1, but not that 1
was chosen over the default after measuring 331 ms against 28 ms; and a reader can see that a
column has no foreign key, but not that the exported data makes one impossible.

#### Scenario: A plan's work shipped and the code is self-describing

- **WHEN** the implementation, its tests, and its source citations already carry every decision
- **THEN** the plan is deleted with nothing relocated

#### Scenario: A plan records a measurement behind a constant

- **WHEN** a plan justifies a threshold with a measured result the code does not state
- **THEN** the measurement moves into a comment beside that constant
- **AND** the plan is then deleted

#### Scenario: A plan explains a deliberate omission

- **WHEN** a plan records why a standard field, join, or integration was left out
- **THEN** that reason moves beside the code that omits it
- **AND** the plan is then deleted

### Requirement: A superseded document is removed, not retained alongside its successor

When a document declares a successor, or a successor declares it supersedes the document, the
superseded document SHALL be deleted once the successor covers everything unique to it. Two
documents describing the same subject SHALL NOT both remain current.

#### Scenario: Frontmatter declares a successor

- **WHEN** a document records that another document supersedes it
- **AND** the successor exists
- **THEN** the superseded document is deleted and its index entry removed

### Requirement: Deleting a document repairs its referrers

Deleting a document SHALL include removing or repointing every reference to it, so no link, index
entry, or task trigger names a file that is gone.

#### Scenario: An indexed document is deleted

- **WHEN** a document listed in an index is deleted
- **THEN** the index entry is removed in the same change
- **AND** no remaining document points at the deleted path

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
