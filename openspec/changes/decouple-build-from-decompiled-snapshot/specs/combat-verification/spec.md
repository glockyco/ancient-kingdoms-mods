## ADDED Requirements

### Requirement: Verification payload generation is explicit and source-bound

A dedicated verification command SHALL generate both planner payload forms from a successful database build, compatible exported data, and a matching local decompiled snapshot. The payload SHALL retain the snapshot's game version, Steam build ID, and assembly SHA-256 for comparison with committed observations. A missing or mismatched snapshot SHALL fail the command and SHALL NOT leave a valid-looking replacement payload.

#### Scenario: Matching source and export

- **WHEN** the verification command reads a complete build, compatible export, and matching snapshot
- **THEN** it writes both payload forms with the matching source identity
- **AND** combat verification can compare observation provenance against that identity

#### Scenario: Snapshot is missing or names another game version

- **WHEN** the command cannot read a matching snapshot
- **THEN** it fails and does not publish a partially generated payload
