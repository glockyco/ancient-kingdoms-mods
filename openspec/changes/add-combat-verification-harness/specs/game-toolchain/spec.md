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

### Requirement: A build is identified by a value that can be recomputed

A run SHALL identify the game build by the content hash of the assembly the repository's decompiled
evidence was produced from. The version string the game reports SHALL be recorded as a label beside it,
not used as the identifier, because nothing can recompute a version string from the installation.

Before measuring, a run SHALL confirm that the installed assembly still hashes to the recorded value.
Where it does not, the run SHALL report that the installation and the evidence describe different
builds, and SHALL name the step that records a new snapshot.

#### Scenario: The installation matches the recorded evidence

- **WHEN** the installed assembly hashes to the recorded value
- **THEN** the run proceeds and stamps its results with that hash

#### Scenario: The game was updated without refreshing the evidence

- **WHEN** the installed assembly hashes to a different value than the evidence records
- **THEN** the run reports that the two describe different builds
- **AND** it names the step that records a new snapshot

#### Scenario: No snapshot has been recorded

- **WHEN** no usable build snapshot exists
- **THEN** the run reports that rather than treating the installation as identified

#### Scenario: A recorded snapshot is incomplete

- **WHEN** a snapshot omits the hash, the version, or the build identifier
- **THEN** it is treated as unusable rather than stamping a result with a partial identity

### Requirement: A run reports the game version it measured against

A verification run SHALL record the installed game version with its results, so a measurement can be
attributed to a specific build.

#### Scenario: Results are stored

- **WHEN** a run produces results
- **THEN** the installed game version is recorded alongside them

#### Scenario: The version differs from a recorded baseline

- **WHEN** the installed version differs from the version a baseline was recorded against
- **THEN** the run reports the difference before comparing
