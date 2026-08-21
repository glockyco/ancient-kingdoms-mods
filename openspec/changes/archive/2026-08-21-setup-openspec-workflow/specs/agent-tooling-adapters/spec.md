## Purpose

Governs the generated command and skill files that expose the OpenSpec workflow to coding agents working in this repository. Their value depends on being present in a fresh clone and identical to what the pinned generator produces, so this capability constrains how they are stored and verified.

## ADDED Requirements

### Requirement: Generated adapters are version controlled

The generated OpenSpec commands and skills SHALL be tracked in version control. Ignore rules SHALL NOT exclude generated adapters. Ignore rules MAY exclude locally installed plugin content, which is not generated and not shared.

Rationale: an adapter that exists only in one working tree is invisible to every other clone and to the freshness check.

#### Scenario: Fresh clone

- **WHEN** the repository is cloned
- **THEN** the OpenSpec commands and skills are present without running any generator

#### Scenario: Ignore rule scope

- **WHEN** the ignore rules are evaluated against a generated adapter file
- **THEN** the file is not ignored

#### Scenario: Local plugin content

- **WHEN** plugin content is installed locally into the agent directory
- **THEN** it remains ignored and is never committed

### Requirement: Adapters match the pinned generator

Regenerating the adapters with the repository's OpenSpec version SHALL produce output identical to the tracked files. A verification step SHALL compare regenerated output against the tracked files and SHALL fail when they differ.

The verification SHALL run without network access, without telemetry, and without modifying the working tree.

#### Scenario: Adapters are current

- **WHEN** the verification regenerates the adapters
- **AND** the output matches the tracked files
- **THEN** the verification passes

#### Scenario: Generator output changes

- **WHEN** an OpenSpec upgrade changes generated adapter content
- **AND** the tracked files still hold the previous content
- **THEN** the verification fails and names the differing files

#### Scenario: Verification leaves no changes behind

- **WHEN** the verification completes
- **THEN** the working tree is unchanged

### Requirement: The workflow is discoverable from repository guidance

Repository guidance SHALL point an agent to the OpenSpec workflow for permanent behavior changes, and SHALL name where accepted behavior and active work live.

#### Scenario: Agent plans permanent work

- **WHEN** an agent reads the repository guidance before starting a permanent behavior change
- **THEN** it is directed to the OpenSpec workflow, the specifications directory, and the active changes directory
