## ADDED Requirements

### Requirement: A run can point the game at a scratch database

The command surface SHALL provide a way to point the game's database at a location owned by a run,
beside the installation's own database.

The result SHALL report the path the game held before, the path it holds after, and whether that path
lies inside a scratch location. A caller decides whether to proceed from the reported path rather than
from the call having succeeded, because everything it does afterwards is written to whichever database
the game opened.

#### Scenario: A run redirects before entering the world

- **WHEN** the redirect runs before the game has opened its database
- **THEN** the game's database path resolves to a scratch location
- **AND** the result reports that path and that it is a scratch one

#### Scenario: A caller checks the outcome

- **WHEN** a caller receives the result
- **THEN** it can tell from the result alone which database the game will use

### Requirement: A redirect that cannot take effect is refused

The redirect SHALL refuse once the game has opened its database, and SHALL report the path in use.

The game reads its database path when it opens the connection, so a later redirect would leave the game
working against the database it already opened while reporting the new path. Refusing is therefore the
only honest outcome.

#### Scenario: The database is already open

- **WHEN** the redirect runs after the game has opened its database
- **THEN** it fails with a stated precondition
- **AND** it reports the path currently in use

#### Scenario: No scratch path can be resolved

- **WHEN** a scratch path cannot be resolved beside the game's own database
- **THEN** the redirect fails rather than choosing a location

### Requirement: A reported path is resolved before it is acted on

A consumer of a path the game reported SHALL translate it before acting on it.

The game reports paths in its own terms, which are not the terms of the host the tooling runs on. A check
against an untranslated path answers that a file is absent when it exists, which would disable retained
state silently rather than loudly.

#### Scenario: Retained state is looked for

- **WHEN** a run checks whether the database recorded by an earlier run is present
- **THEN** it translates the recorded path to this host before looking

#### Scenario: A reported path names something the translation does not cover

- **WHEN** a reported path cannot be translated
- **THEN** it is treated as absent rather than as present
