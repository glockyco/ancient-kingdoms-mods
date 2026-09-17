## ADDED Requirements

### Requirement: A run can point the game at an owned scratch database

The command surface SHALL provide a way to point the game's database at a scratch location owned by
the run, beside the installation's own database. The redirect result SHALL report the path the game
held before, the path it holds after, and whether the latter is the run's exact owned canonical path.
A caller SHALL decide whether to proceed from that result, not from the call having returned.

#### Scenario: A run redirects before database open

- **WHEN** the redirect runs before the game has opened its database
- **THEN** the game's database path resolves to the run's exact owned canonical scratch path
- **AND** the result reports the old path, the new path, and the ownership confirmation

#### Scenario: A caller supplies an external path

- **WHEN** a redirect request names a path outside the run's owned scratch root
- **THEN** the request is refused
- **AND** the game database path is not changed

### Requirement: A redirect that cannot take effect is refused

The redirect SHALL refuse after the game has opened its database and SHALL report the path in use. The
game reads its path when it opens the connection, so a later redirect would report a value the game
does not use.

#### Scenario: The database is already open

- **WHEN** the redirect runs after the game has opened its database
- **THEN** it fails with a stated precondition
- **AND** it reports the path currently in use

### Requirement: The database path is the exact owned canonical path

Before the game opens the database, the run SHALL resolve the requested path and its parent
canonically and SHALL reject a path that escapes the owned scratch root or contains a symlink. After
the game reports the path it opened, the run SHALL resolve it again and compare it with the exact owned
canonical path. A textual prefix match SHALL NOT pass. A mismatch SHALL stop the run before
materialization.

#### Scenario: A path escapes through a symlink

- **WHEN** canonical resolution places the requested database outside the owned scratch root
- **THEN** the run refuses the redirect
- **AND** it reports the requested and the resolved path

#### Scenario: The game opens a different path

- **WHEN** the game reports a canonical path different from the path the run owns
- **THEN** the run refuses before using the database

### Requirement: A reported path is translated before it is acted on

A consumer SHALL translate a path the game reports to the host path before it checks, opens, or
removes it, and SHALL compare the translated canonical path with the run's exact owned path. A path
that cannot be translated SHALL fail closed.

#### Scenario: A reported path cannot be translated

- **WHEN** a reported path has no valid host translation
- **THEN** the run refuses to use that path
- **AND** it reports the translation failure
