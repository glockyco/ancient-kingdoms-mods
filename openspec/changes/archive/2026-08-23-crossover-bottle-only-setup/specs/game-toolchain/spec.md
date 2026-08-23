## Purpose

Defines the one game installation this repository works against, how the tooling finds and validates it, and what the tooling requires of the workstation before it acts.

## ADDED Requirements

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
