## Purpose

Defines the one game installation this repository works against, how the tooling finds and validates it, and what the tooling requires of the workstation before it acts.

## Requirements

### Requirement: One supported host and one installation

The tooling SHALL support macOS with the game installed in a CrossOver Steam bottle. It SHALL NOT carry a second launch path for another host.

Every command that reads, launches, updates, or exports from the game SHALL act on the installation named by `ANCIENT_KINGDOMS_PATH`. No command SHALL download or maintain a copy of the game anywhere else.

#### Scenario: The game is launched

- **WHEN** a command launches the game
- **THEN** it launches the installation named by `ANCIENT_KINGDOMS_PATH` through the configured CrossOver wine binary

#### Scenario: The game is updated

- **WHEN** a command updates the game
- **THEN** the update targets that same installation
- **AND** no copy of the game exists outside it

#### Scenario: Another host

- **WHEN** the tooling runs on a host that is not macOS
- **THEN** discovery finds no installation
- **AND** the command fails because the required configuration is absent

### Requirement: Launch configuration is required, not optional

`LocalConfig` SHALL require the wine binary path and the wine prefix. Loading a configuration that omits either SHALL fail and name the missing key and the file.

A command SHALL NOT reach the point of launching the game before an absent launch path is reported.

#### Scenario: A required key is missing

- **WHEN** `Local.props` omits the wine binary path or the wine prefix
- **THEN** loading the configuration fails
- **AND** the failure names the missing key and the file that should carry it

#### Scenario: The configuration is complete

- **WHEN** every required key is present
- **THEN** the configuration loads
- **AND** no later step tests those values for absence

### Requirement: The installation is identified by application id

Discovery SHALL locate the game by reading the Steam application manifest for the configured application id and using the installation directory the manifest records. It SHALL NOT match a hardcoded installation directory name.

A bottle can hold more than one game, so the application id is what distinguishes this one.

#### Scenario: The manifest names the directory

- **WHEN** discovery reads the manifest for the configured application id
- **THEN** it resolves the installation from the directory the manifest records

#### Scenario: The directory is renamed upstream

- **WHEN** the recorded installation directory differs from any name the tooling previously assumed
- **THEN** discovery still resolves the installation

#### Scenario: Another game shares the bottle

- **WHEN** a bottle holds several games
- **THEN** discovery selects the one whose manifest matches the configured application id

### Requirement: Ambiguous and unusable installations are rejected

Discovery SHALL accept a candidate only when its structure shows a usable installation. The presence of the executable file alone SHALL NOT be sufficient.

When more than one bottle holds an installation for the configured application id, discovery SHALL fail and name every candidate. It SHALL NOT select one.

#### Scenario: Several bottles match

- **WHEN** two or more bottles hold an installation for the configured application id
- **THEN** discovery fails and names every candidate it found

#### Scenario: An incomplete installation

- **WHEN** a candidate directory holds the executable but not the managed assemblies the tooling reads
- **THEN** discovery rejects the candidate

#### Scenario: Exactly one usable installation

- **WHEN** one bottle holds a complete installation for the configured application id
- **THEN** discovery returns it

### Requirement: Steam owns the installation

The game SHALL be installed and updated only by the Steam client inside the bottle. The tooling SHALL request an update by asking that client to perform it, and SHALL NOT download game content itself.

A tool that writes game files to a location of its own choosing creates a second copy, and a second copy can hold a different build than the one the exporter runs against.

#### Scenario: An update is requested

- **WHEN** the tooling is asked to update the game
- **THEN** it directs the request to the Steam client inside the bottle
- **AND** the downloaded content lands in that client's own library

#### Scenario: No second copy is produced

- **WHEN** an update completes
- **THEN** exactly one installation of the game exists
- **AND** its Steam application manifest is the one that client maintains

### Requirement: An update proves its result

The tooling SHALL confirm an update from the Steam application manifest rather than from the exit status of the program it invoked. It SHALL report the recorded build identifier after the update, and SHALL wait until the manifest shows the installation is complete.

An exit status reports that a request was accepted, which is not the same as the installation having changed.

#### Scenario: The update completes

- **WHEN** an update finishes
- **THEN** the tooling reports the build identifier recorded in the manifest
- **AND** the manifest shows the installation in a fully installed state

#### Scenario: The update does not finish

- **WHEN** the installation does not reach a fully installed state within the time allowed
- **THEN** the command fails and reports the state it observed

#### Scenario: The build did not change

- **WHEN** the recorded build identifier is the same after the update as before
- **THEN** the tooling reports that the installation was already current

### Requirement: A required external program is named before it is used

Before invoking a program supplied by the workstation, the tooling SHALL confirm the program exists at the path it will use, and SHALL fail with a message naming the program and that path.

The tooling SHALL NOT let a process-start failure serve as the report, because that message describes causes that do not apply and omits the one that does.

#### Scenario: The program is absent

- **WHEN** a command needs an external program that is not present
- **THEN** the command fails before attempting to start it
- **AND** the message names the program and the path it looked in

#### Scenario: The program is present

- **WHEN** the program is present
- **THEN** the command runs it and reports its result unchanged

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
