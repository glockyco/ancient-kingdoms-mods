## ADDED Requirements

### Requirement: A run establishes exclusive session ownership before mutation

A run SHALL establish exclusive ownership of the installation and runtime session before it creates,
clears, or reuses scratch state. It SHALL verify that no other instance answers the runtime endpoint.

A run that cannot establish ownership SHALL refuse before touching scratch state. Launching a second
instance does not take the endpoint from the instance that already holds it.

#### Scenario: An instance already answers the endpoint

- **WHEN** a run starts while another instance answers the runtime endpoint
- **THEN** the run refuses before creating or changing scratch state
- **AND** it reports that the session is already owned

#### Scenario: No instance answers the endpoint

- **WHEN** the endpoint is free and the run establishes ownership
- **THEN** the run can continue to backup and scratch preparation
- **AND** the ownership result is recorded for the session

### Requirement: A run verifies the player-save backup before scratch work

Before scratch mutation or game launch, a run SHALL create and hash-verify a timestamped backup of the
installation's player save when that save exists. The backup SHALL include the main database and its
write-ahead and shared-memory sidecars.

The run SHALL compare the content hash of every copied file with its source. A missing save SHALL be
recorded as absent. An unverified or mismatched backup SHALL stop the run before scratch work.

#### Scenario: A sidecar file is present

- **WHEN** the player save has a write-ahead or shared-memory sidecar
- **THEN** the backup includes that sidecar
- **AND** the run confirms its hash against the source

#### Scenario: A backup cannot be verified

- **WHEN** any copied file has a hash that differs from its source
- **THEN** the run refuses before creating or changing scratch state
- **AND** it reports the file whose backup is not verified

### Requirement: A run can point the game at an owned scratch database

The command surface SHALL provide a way to point the game's database at a scratch location owned by the
run, beside the installation's own database. The run SHALL select a fresh parent directory or a retained
fixture directory under its owned scratch root. A caller SHALL NOT provide an arbitrary external path or
baseline path for the redirect.

The redirect result SHALL report the path the game held before the redirect, the path it holds after the
redirect, and whether the latter is the run's exact owned canonical database path. A caller SHALL decide
whether to proceed from that result, not from the redirect call having returned.

#### Scenario: A run redirects before database open

- **WHEN** the redirect runs before the game has opened its database
- **THEN** the game's database path resolves to the run's exact owned canonical scratch path
- **AND** the result reports the old path, the new path, and ownership confirmation

#### Scenario: A fresh parent directory is missing

- **WHEN** the run cannot confirm that the scratch parent directory exists
- **THEN** the redirect fails before it changes the database path
- **AND** the run reports the missing parent

#### Scenario: A caller supplies an external path

- **WHEN** a redirect request names a path outside the run's owned scratch root
- **THEN** the request is refused
- **AND** the game database path is not changed

### Requirement: A redirect that cannot take effect is refused

The redirect SHALL refuse after the game has opened its database, and SHALL report the path currently in
use. The redirect SHALL also fail when it cannot resolve an owned scratch path.

The game reads its database path when it opens the connection. A later redirect would report a new value
while the game continues to use the old database. Refusing is therefore the only valid result.

#### Scenario: The database is already open

- **WHEN** the redirect runs after the game has opened its database
- **THEN** it fails with a stated precondition
- **AND** it reports the path currently in use

#### Scenario: No owned scratch path can be resolved

- **WHEN** the run cannot resolve an owned scratch path beside the game's own database
- **THEN** the redirect fails rather than choosing a different location
- **AND** the game keeps its current path

### Requirement: The database path is the exact owned canonical path

Before the game opens the database, the run SHALL resolve the requested path and its parent to canonical
paths. The run SHALL reject a path that escapes the owned scratch root, differs from the expected fixture
path, or contains a symlink. A path that is merely inside a directory by textual prefix SHALL
NOT pass this check.

After the game reports the path it opened, the run SHALL resolve it again and compare it with the exact
owned canonical path. A mismatch SHALL stop the run before materialization or measurement.

#### Scenario: A path escapes through a symlink

- **WHEN** canonical resolution places the requested database outside the owned scratch root
- **THEN** the run refuses the redirect
- **AND** it reports both the requested and resolved paths

#### Scenario: The game opens a different path

- **WHEN** the game reports a canonical path different from the path the run owns
- **THEN** the run refuses before using the database
- **AND** it reports the resolved path

#### Scenario: The database path matches

- **WHEN** the game reports the exact owned canonical path
- **THEN** the run marks database ownership confirmed
- **AND** it can continue to materialization

### Requirement: A reported path is resolved before it is acted on

A consumer SHALL translate a path reported by the game to the host path before it checks, opens, removes,
or reuses it. The consumer SHALL compare the translated canonical path with the run's exact owned path.

A reported path that cannot be translated or canonicalized SHALL fail closed. The run SHALL NOT treat an
untranslated path as absent and silently disable retained-state checks.

#### Scenario: Retained state is checked

- **WHEN** a run checks whether a recorded database exists
- **THEN** it translates and canonicalizes the recorded path before looking for it
- **AND** it checks that the result is the exact owned path

#### Scenario: A reported path cannot be translated

- **WHEN** a reported path has no valid host translation
- **THEN** the run refuses to use or reuse that path
- **AND** it reports the translation failure

### Requirement: A run cleans up on success, failure, and cancellation

A run SHALL shut down the game process that it owns after success, failure, or cancellation. It SHALL
remove or quarantine incomplete scratch state and SHALL perform the final database readback before it
releases ownership.

A cleanup failure SHALL make the run incomplete. The run SHALL NOT mark an incomplete scratch database as
verified reusable state.

#### Scenario: A run fails during materialization

- **WHEN** materialization fails after the database opens
- **THEN** the run reads back the failure state and cleans up the owned process
- **AND** it does not mark the scratch database reusable

#### Scenario: A run is cancelled

- **WHEN** the caller cancels an active run
- **THEN** the run stops the owned game process and performs cleanup
- **AND** it reports cancellation without claiming a completed measurement

#### Scenario: A run completes

- **WHEN** all requested work and final readback complete
- **THEN** the run shuts down the owned game process
- **AND** it releases the endpoint for the next run

### Requirement: Retained scratch state is reused only after verification

A run SHALL reuse retained scratch state only when its marker identifies the exact owned canonical path,
game identity, fixture identity, complete materialization, and successful readback. A missing, stale,
partial, or path-mismatched marker SHALL force rebuild.

The run SHALL reapply and read back transient values after loading retained state before it starts any
dependent measurement. It SHALL NOT treat validation-only or incomplete state as reusable materialization.

#### Scenario: A retained marker is complete

- **WHEN** the marker matches the game, fixture, canonical path, and achieved-state readback
- **THEN** the run can load that fixture's scratch state
- **AND** it rechecks transient values before measuring

#### Scenario: A retained marker is incomplete

- **WHEN** a marker lacks complete materialization or readback evidence
- **THEN** the run rebuilds the fixture
- **AND** it does not reuse the incomplete state
