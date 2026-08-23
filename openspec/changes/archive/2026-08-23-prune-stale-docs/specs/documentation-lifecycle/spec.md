## Purpose

Sets the conditions under which a document in this repository is kept and the conditions under
which it is deleted. It exists because a wrong document costs more than a missing one: a reader
who trusts it acts on a false premise, and nothing in the build ever contradicts prose.

## ADDED Requirements

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

A document describing work that has not begun SHALL be kept while that work is still wanted.
Absence of progress is not evidence of staleness.

Rationale: this is the boundary that keeps the accuracy rule from deleting the backlog. A plan is
stale when its premise is gone, not when its checkboxes are empty.

#### Scenario: A plan has no completed tasks

- **WHEN** a plan's tasks are all open
- **AND** its problem statement still describes something the project wants
- **THEN** the plan is kept

#### Scenario: A plan's problem was solved another way

- **WHEN** the need a plan addresses has been met by different work
- **THEN** the plan is deleted, whether or not its own tasks were completed

### Requirement: A completed plan is deleted, and its rationale relocated first

Once the work a plan describes has shipped, the implementation and its tests become the record and
the plan SHALL be deleted. A plan SHALL NOT be retained merely because the work was large or the
document is long.

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
