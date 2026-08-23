## Purpose

Defines how decompiled game source is produced, named, retained, and referenced, so that a citation resolves against a stable path and any decompiled tree can be traced back to the assembly that produced it.

## Requirements

### Requirement: A decompile is stored once

Each decompile SHALL produce one stored tree. The tooling SHALL NOT keep a second copy of the same output under another name.

#### Scenario: A decompile completes

- **WHEN** a decompile finishes
- **THEN** exactly one stored tree holds its output

#### Scenario: The same assembly is decompiled again

- **WHEN** a decompile runs against an assembly that already has a stored tree
- **THEN** no additional copy of that output is created

### Requirement: The stored name is derived, not supplied

A stored tree SHALL be named from values the tooling reads for itself: the identifier the platform records for the installed build, and a digest of the decompiled assembly.

A name SHALL NOT depend on a value the operator types, because that value is not verified against the assembly and the name is what a later reader trusts.

#### Scenario: A tree is stored

- **WHEN** a decompile is stored
- **THEN** its name carries the recorded build identifier and a digest of the assembly

#### Scenario: A supplied version is recorded

- **WHEN** a human-meaningful version accompanies the decompile
- **THEN** it is recorded as metadata inside the tree
- **AND** it does not determine the name

#### Scenario: Two builds share a version string

- **WHEN** two decompiles carry the same supplied version but different assemblies
- **THEN** they occupy separate stored trees

### Requirement: Citations resolve against a stable path

A single path SHALL always refer to the current decompiled source. References recorded elsewhere in the repository SHALL resolve through that path without carrying a version.

Updating to a new decompile SHALL move that path to the new tree without copying the tree.

#### Scenario: A citation is checked

- **WHEN** a recorded reference names a file and line under the stable path
- **THEN** it resolves against the current decompiled source

#### Scenario: A new decompile is stored

- **WHEN** a new tree becomes the current one
- **THEN** the stable path refers to it
- **AND** no tree was copied to achieve that

### Requirement: Output is written only where it is ignored

Before writing, the tooling SHALL confirm that the destination is ignored by version control, and SHALL refuse to write when it is not.

Decompiled game source is not this project's to redistribute, so a mistaken destination is a disclosure rather than an inconvenience.

#### Scenario: The destination is ignored

- **WHEN** the destination is ignored by version control
- **THEN** the tooling writes the output

#### Scenario: The destination is tracked

- **WHEN** the destination would be tracked by version control
- **THEN** the tooling refuses to write and names the destination

### Requirement: Retention is bounded and deliberate

The tooling SHALL retain the current tree and a stated number of previous trees, and SHALL report what it removed. Trees SHALL NOT accumulate without limit.

The previous tree is required, because the update workflow compares a new decompile against it.

#### Scenario: A decompile completes with the limit reached

- **WHEN** storing a new tree would exceed the retention limit
- **THEN** the oldest trees beyond the limit are removed
- **AND** the tooling reports which were removed

#### Scenario: The previous tree is available

- **WHEN** a decompile has just been stored
- **THEN** the tree it replaced remains available for comparison
