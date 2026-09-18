## ADDED Requirements

### Requirement: A verification run owns its session before it mutates anything

Before scratch mutation or launch, a run SHALL acquire exclusive ownership of the installation and the
runtime endpoint. It SHALL refuse while another instance answers the endpoint, without touching scratch
state. It SHALL send commands only to the process it launched and SHALL stop only that process.

#### Scenario: An instance already answers the endpoint

- **WHEN** a run starts while another instance answers the runtime endpoint
- **THEN** it refuses before creating or changing scratch state
- **AND** it reports that the session is already owned

### Requirement: A verification run verifies a player-save backup first

Before scratch mutation or launch, a run SHALL create a timestamped backup of the player save when it
exists, including write-ahead and shared-memory sidecars, and SHALL confirm each copy's content hash
against its source. A missing save SHALL be recorded as absent. An unverified backup SHALL stop the run.
After the run, the player save SHALL hash to its pre-run value.

#### Scenario: A sidecar hash does not match

- **WHEN** a copied sidecar's hash differs from its source
- **THEN** the run stops before scratch work
- **AND** it names the file

#### Scenario: The run ends

- **WHEN** a run completes, fails, or is cancelled
- **THEN** the player save hashes to its pre-run value
- **AND** a difference is reported as an isolation failure

### Requirement: Each fixture attempt uses a fresh scratch database

A run SHALL create a fresh scratch parent directory and database for every fixture attempt and SHALL
create the fixture's character in it. The run SHALL NOT reuse a scratch database from an earlier
attempt. A scratch directory SHALL be resolved canonically under the owned scratch root before it is
created or removed.

#### Scenario: A second fixture runs

- **WHEN** a run proceeds to its second fixture
- **THEN** the second fixture receives a new scratch database
- **AND** the first fixture's database is not opened again

### Requirement: A build is identified by assembly hash

A run SHALL identify the game build by the content hash of the assembly the decompiled evidence was
produced from and SHALL record the version string and Steam build identifier as labels beside it.
Before measuring, the run SHALL confirm that the installed assembly hashes to the recorded snapshot
value. On a mismatch it SHALL report that the installation and the evidence describe different builds
and SHALL name the step that records a new snapshot.

#### Scenario: The game was updated without refreshing the evidence

- **WHEN** the installed assembly hashes to a different value than the snapshot
- **THEN** the run reports the two builds before any measurement
- **AND** it writes no observation

### Requirement: A run cleans up on every outcome

On success, failure, and cancellation, a run SHALL stop the owned process, remove incomplete scratch
state, verify the player save, and release ownership. A cleanup failure SHALL be reported beside the
original outcome and SHALL make the run incomplete.

#### Scenario: A run is cancelled during materialization

- **WHEN** the caller cancels while a character is being built
- **THEN** the owned process stops and the scratch state is removed
- **AND** the run reports cancellation without an observation

### Requirement: A run writes an observation per fixture

A completed fixture run SHALL write one observation file to the committed observations location,
named by fixture. A run that fails a stage SHALL write no observation for that fixture and SHALL
report the failed stage. The command SHALL NOT compare observations with the engine.

#### Scenario: Materialization readback fails

- **WHEN** a fixture's readback does not match its request
- **THEN** no observation file is written for it
- **AND** the run reports the mismatched field and continues to the next fixture
