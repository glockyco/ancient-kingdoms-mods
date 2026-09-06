## ADDED Requirements

### Requirement: A verification run owns an isolated database path

The tooling SHALL support a run mode that launches the installation with its database path pointed at a
scratch location owned exclusively by the run.

Before any scratch mutation or game launch, the run SHALL establish exclusive installation and session
ownership. A fresh scratch parent directory SHALL exist before the run creates a database. The caller and a
baseline SHALL NOT supply an arbitrary external database or scratch path.

The run SHALL resolve the exact canonical database path and SHALL reject a symlink or path that escapes the
owned scratch location before destructive work. It SHALL report the resolved path when it refuses.

The runtime-reported canonical database path SHALL equal the exact path owned for the fixture, not merely
lie somewhere inside the scratch root.

#### Scenario: A verification run starts

- **WHEN** a verification run launches the game
- **THEN** the game's database path resolves inside the run's owned scratch location
- **AND** the player save in the installation is not opened for writing

#### Scenario: A scratch parent is prepared

- **WHEN** a run is about to create scratch state
- **THEN** a fresh parent directory exists and is owned by that run
- **AND** no caller- or baseline-selected external path is used

#### Scenario: The canonical path escapes

- **WHEN** the resolved database path is a symlink or does not remain inside the owned scratch location
- **THEN** the run refuses before destructive work
- **AND** it reports the canonical path and the reason

#### Scenario: Redirection cannot be confirmed

- **WHEN** the resolved database path cannot be confirmed to lie inside the scratch location
- **THEN** the run refuses to start
- **AND** it reports the path it resolved

### Requirement: A run refuses to start beside another game instance

A run SHALL confirm that no other instance is answering the runtime endpoint before it changes scratch state
or launches, and SHALL refuse while one is.

Launching does not take the endpoint from an instance that already holds it. A run that starts beside a
stale instance therefore sends every command to that instance while the window on screen belongs to the
new one, and every reading describes a process the run does not control. Such a reading looks like a defect
in the thing being measured.

#### Scenario: An instance already answers the endpoint

- **WHEN** a run starts while another instance is answering the runtime endpoint
- **THEN** it refuses before touching scratch state
- **AND** it reports that an instance is already running

#### Scenario: The run owns the endpoint

- **WHEN** no other instance answers and the run launches the game
- **THEN** the run records ownership of the endpoint before sending commands
- **AND** it sends commands only to the owned process

#### Scenario: A run ends

- **WHEN** a run completes, fails, or is interrupted
- **THEN** it shuts the owned game process down
- **AND** it verifies that the endpoint is free for the next run

### Requirement: A verification run verifies a backup first

The tooling SHALL create and verify a timestamped backup of the player save, when it exists, before any
scratch mutation or game launch. A missing save SHALL be recorded as absent. The backup SHALL include the
main database and any write-ahead and shared-memory sidecars.

Verification SHALL compare a content hash of each copied file against its source. A backup that cannot be
verified SHALL stop the run.

#### Scenario: A sidecar file is present

- **WHEN** the save has a write-ahead or shared-memory sidecar
- **THEN** the sidecar is copied with the main database file
- **AND** each copy's hash is confirmed against its source before the run proceeds

#### Scenario: A backup cannot be verified

- **WHEN** any copied file's hash does not match its source
- **THEN** the run does not proceed to scratch mutation or launch
- **AND** it reports the file and the hash mismatch

#### Scenario: The player save is isolated

- **WHEN** the run confirms that no game operation can reach the player save
- **THEN** the run records that isolation result
- **AND** isolation does not waive backup of an existing save

### Requirement: Failure and cancellation restore and verify lifecycle state

The run SHALL stop its owned process and remove or quarantine incomplete scratch state on success, failure, and cancellation. It SHALL
read back required state after cleanup and SHALL report cleanup or readback failure instead of marking the
run complete.

A reused scratch database SHALL be eligible only when its per-fixture materialization record is verified
for the current build and fixture content. After loading reused state, the run SHALL reapply transient
fixture values and read them back before measurement. An unverified or stale materialization SHALL be
rebuilt rather than reused.

#### Scenario: A run is cancelled

- **WHEN** cancellation occurs during materialization or measurement
- **THEN** the run stops the owned process and removes or quarantines incomplete scratch state
- **AND** it reads back the cleanup result
- **AND** it reports an incomplete result when cleanup or readback fails

#### Scenario: A verified fixture is reused

- **WHEN** a scratch record proves per-fixture materialization for the current build and fixture content
- **THEN** the run may reuse that materialization
- **AND** it reapplies and reads back transient fixture values after load

#### Scenario: A stale fixture is found

- **WHEN** the scratch record is absent, stale, incomplete, or unverifiable
- **THEN** the run rebuilds that fixture through its materialization path
- **AND** it does not treat the stale state as verified

### Requirement: A build is identified by recomputable identity and distinct data contracts

A run SHALL identify the game build by the content hash of the assembly the repository's decompiled
evidence was produced from. The version string the game reports and the Steam build identifier SHALL be
recorded as labels beside that hash, not used as the sole identity.

The shared build DATA SHALL remain distinct from the version envelope (`BuildEnvelope`). The version
envelope SHALL record versions only; it SHALL NOT be overloaded with the assembly hash or fixture execution
metadata. Fixture execution metadata and capture completeness and container metadata SHALL remain outside
shared build DATA. The fixture and capture records SHALL NOT be required to have identical outer schemas, and
the boundary SHALL NOT imply that conversion is unnecessary.

Before measuring, a run SHALL confirm that the installed assembly still hashes to the recorded value. Where
it does not, the run SHALL report that the installation and the evidence describe different builds, and SHALL
name the step that records a new snapshot.

#### Scenario: The installation matches the recorded evidence

- **WHEN** the installed assembly hashes to the recorded value
- **THEN** the run proceeds and stamps its results with that hash
- **AND** the version string and Steam build identifier are recorded as labels

#### Scenario: The game was updated without refreshing the evidence

- **WHEN** the installed assembly hashes to a different value than the evidence records
- **THEN** the run reports that the two describe different builds before numeric comparison
- **AND** it names the step that records a new snapshot

#### Scenario: No snapshot has been recorded

- **WHEN** no usable build snapshot exists
- **THEN** the run reports that rather than treating the installation as identified
- **AND** it does not produce verified parity evidence

#### Scenario: A recorded snapshot is incomplete

- **WHEN** a snapshot omits the hash, the version, or the build identifier
- **THEN** it is treated as unusable rather than stamping a result with a partial identity

### Requirement: A run reports the game version it measured against

A verification run SHALL record the installed game version with its results, so a measurement can be
attributed to a specific build. Version, build, fixture schema, game-data, model, evaluator, and protocol
identities SHALL remain separate report fields.

#### Scenario: Results are stored

- **WHEN** a run produces results
- **THEN** the installed game version is recorded alongside the recomputable build identity

#### Scenario: The version differs from a recorded baseline

- **WHEN** the installed version differs from the version a baseline was recorded against
- **THEN** the run reports the difference before comparing numeric quantities
- **AND** it does not silently treat the baseline as current

### Requirement: Verification results state complete or diagnostic status

The toolchain SHALL persist whether a run is fully verified, incomplete, failed, or diagnostic. A result
SHALL be fully verified only when all required materialization, readback, live measurement, production
prediction, comparison, reviewed baseline, and provenance stages pass.

A validation-only, incomplete, failed, or diagnostic run SHALL retain its evidence and failure conditions,
but SHALL NOT count as parity or release evidence. An override SHALL NOT change that status.

#### Scenario: A complete run is accepted

- **WHEN** every required stage passes and the lifecycle cleanup and readback pass
- **THEN** the persisted result is marked fully verified
- **AND** it may count as parity and release evidence

#### Scenario: A required stage fails

- **WHEN** materialization, readback, measurement, prediction, comparison, baseline review, provenance, or cleanup fails
- **THEN** the result names the failed stage and its observed condition
- **AND** it is marked failed or incomplete rather than fully verified

#### Scenario: A diagnostic override is used

- **WHEN** an operator uses an override to inspect an incompatible or failing run
- **THEN** the result is marked diagnostic
- **AND** it cannot count as a verified baseline or release evidence
