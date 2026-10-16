## ADDED Requirements

### Requirement: A launched session owns the game before it launches

Before it launches the game, a session SHALL hold exclusive ownership of the installation and the runtime endpoint. It SHALL refuse while another instance answers the endpoint or a game process runs. It SHALL check before and after it takes ownership, and again immediately before launch.

#### Scenario: An instance already answers the endpoint

- **WHEN** a session starts while another instance answers the runtime endpoint
- **THEN** it refuses without launching the game

#### Scenario: Another session owns the installation

- **WHEN** a session starts while another session owns the installation or the endpoint
- **THEN** it refuses, names what is already owned, and launches nothing

### Requirement: A launched session cleans up on every outcome

A session SHALL mark the process it launches and SHALL stop only a process that carries its mark. On success, failure, and cancellation it SHALL stop that process, confirm that the endpoint is released, and release ownership. A cleanup failure SHALL be reported beside the original outcome.

#### Scenario: The work is cancelled after launch

- **WHEN** the caller cancels while the session's work runs
- **THEN** the session stops the process it launched and no other
- **AND** it releases ownership and reports the cancellation

#### Scenario: The endpoint stays occupied after shutdown

- **WHEN** the endpoint still answers after the launched process stops
- **THEN** the session stops the processes that carry its mark and checks again
- **AND** when the endpoint remains occupied, it reports the cleanup failure beside the original outcome

## REMOVED Requirements

### Requirement: A verification run owns its session before it mutates anything

**Reason**: `build-tool verify` is removed. The ownership export relies on is stated in "A launched session owns the game before it launches".

**Migration**: None.

### Requirement: A verification run verifies a player-save backup first

**Reason**: `build-tool verify` is removed, and it was the only command that backed up the save.

**Migration**: The save-files skill describes a verified manual backup.

### Requirement: Each fixture attempt uses a fresh scratch database

**Reason**: Combat fixtures are removed.

**Migration**: None.

### Requirement: A build is identified by assembly hash

**Reason**: Only verification compared the installed assembly with the snapshot, to mark observations as current or stale.

**Migration**: `server-scripts/SNAPSHOT.toml` still records the assembly hash of the decompiled source.

### Requirement: A run cleans up on every outcome

**Reason**: `build-tool verify` is removed. The cleanup export relies on is stated in "A launched session cleans up on every outcome".

**Migration**: None.

### Requirement: A run writes an observation per fixture

**Reason**: Combat fixtures and observations are removed.

**Migration**: None.
