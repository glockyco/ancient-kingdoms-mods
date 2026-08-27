## Purpose

Defines how a published value that is written by hand and restates a rule the game enforces is kept
in agreement with that rule, so a curated table cannot quietly contradict the game it describes.

## ADDED Requirements

### Requirement: A curated restatement of a game rule is checked against the game

Where a published value restates a rule the game enforces, a command SHALL compare the published value
against the rule read from the game's own definitions.

The comparison SHALL be exact. It SHALL NOT accept a published value that omits a case the game allows
or that adds a case the game forbids.

#### Scenario: The published value agrees with the game

- **WHEN** every curated entry matches the rule read from the game
- **THEN** the check reports agreement and exits successfully

#### Scenario: The published value omits a case the game allows

- **WHEN** a curated entry lacks a value the game accepts
- **THEN** the check fails and names the entry and the missing value

#### Scenario: The published value adds a case the game forbids

- **WHEN** a curated entry holds a value the game rejects
- **THEN** the check fails and names the entry and the extra value

#### Scenario: A curated entry names something the game does not define

- **WHEN** a curated entry names a subject the game has no definition for
- **THEN** the check fails and names that subject rather than skipping it

### Requirement: A disagreement is a defect in the published value

Where the check reports a disagreement, the game SHALL be treated as correct and the published value
SHALL be corrected.

The check SHALL NOT rewrite the published value. A correction is a reviewed edit, because a curated
value exists precisely where nothing derives it.

#### Scenario: The game and the published value disagree

- **WHEN** the check reports a disagreement
- **THEN** the published value is corrected to match the game

#### Scenario: The check runs after a correction

- **WHEN** the corrected value is checked again
- **THEN** the check reports agreement

### Requirement: The check reads the local decompiled snapshot and stays out of the build

The check SHALL read the rule from the local decompiled source snapshot.

Because that snapshot is not committed, the check SHALL NOT run as part of building or publishing the
compendium. A build in a checkout without a snapshot SHALL succeed and SHALL publish the curated value
as it stands.

#### Scenario: A build runs without a decompiled snapshot

- **WHEN** the compendium is built in a checkout that has no snapshot
- **THEN** the build succeeds and publishes the curated value

#### Scenario: The check runs without a decompiled snapshot

- **WHEN** the check runs in a checkout that has no snapshot
- **THEN** it reports that it cannot read the rule rather than reporting agreement

### Requirement: The reader's dependence on a source region is recorded

The reader SHALL record the region of decompiled source it depends on as a source citation.

A game update that moves or changes that region SHALL therefore be reported by the citation gate,
rather than leaving the reader to parse a region that no longer holds the rule.

#### Scenario: A game update moves the region the reader parses

- **WHEN** the cited region moves in a new snapshot
- **THEN** the citation check reports it for reconciliation

#### Scenario: The reader finds nothing to read

- **WHEN** the cited region no longer contains the rule in a form the reader recognises
- **THEN** the check fails rather than reporting an empty rule as agreement

### Requirement: The per-version procedure runs the check

The procedure for adopting a new game version SHALL run this check, so a rule the update changed is
reported against every curated value that restates it.

#### Scenario: A game update changes the rule

- **WHEN** a new version changes the rule a curated value restates
- **THEN** the update procedure reports the disagreement before the version is published
