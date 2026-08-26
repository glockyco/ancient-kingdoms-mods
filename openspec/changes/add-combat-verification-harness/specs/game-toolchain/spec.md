## ADDED Requirements

### Requirement: A verification run redirects game state away from player data

The tooling SHALL support a run mode that launches the installation with its database path pointed at a
scratch location owned by the run.

The run SHALL refuse to start unless the resolved database path lies inside that scratch location. The
run SHALL report the resolved path when it refuses.

#### Scenario: A verification run starts

- **WHEN** a verification run launches the game
- **THEN** the game's database path resolves inside the run's scratch location
- **AND** the player save in the installation is not opened for writing

#### Scenario: Redirection cannot be confirmed

- **WHEN** the resolved database path cannot be confirmed to lie inside the scratch location
- **THEN** the run refuses to start
- **AND** it reports the path it resolved

### Requirement: A run that can reach player data verifies a backup first

Where a run mode cannot fully isolate itself from the player save, the tooling SHALL create and verify a
timestamped backup of that save, including any write-ahead and shared-memory sidecars, before acting.

Verification SHALL compare a content hash of each copied file against its source.

#### Scenario: A sidecar file is present

- **WHEN** the save has a write-ahead or shared-memory sidecar
- **THEN** the sidecar is copied with the main database file
- **AND** each copy's hash is confirmed against its source

#### Scenario: A backup cannot be verified

- **WHEN** any copied file's hash does not match its source
- **THEN** the run does not proceed

### Requirement: A run reports the game version it measured against

A verification run SHALL record the installed game version with its results, so a measurement can be
attributed to a specific build.

#### Scenario: Results are stored

- **WHEN** a run produces results
- **THEN** the installed game version is recorded alongside them

#### Scenario: The version differs from a recorded baseline

- **WHEN** the installed version differs from the version a baseline was recorded against
- **THEN** the run reports the difference before comparing
