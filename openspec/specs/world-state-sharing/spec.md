# world-state-sharing Specification

## Purpose
Defines how a host running Pocket Compendium shares exact boss state with clients running it, and what players and hosts without the mod experience.

## Requirements

### Requirement: The host speaks first

A client SHALL send nothing to the host until it has received the host's hello. A client on a host without the mod SHALL therefore send nothing at all.

#### Scenario: Modded client on an unmodded host

- **WHEN** a player with the mod joins a world hosted without the mod
- **THEN** the client sends no sharing message and uses its own estimates

### Requirement: Hosts send exact state

After the hello, a host SHALL send a joining client with the mod the state of every tracked monster, with deadlines on the server clock, then send each change as it happens: kills, spawns, failed rolls and dungeon renewals. The client SHALL show these times as exact, without `~`.

#### Scenario: Kill on the host

- **WHEN** the host kills Xylevis while a modded client is in another zone
- **THEN** the client shows Xylevis with the same countdown as the host

### Requirement: Players without the mod are unaffected

Sharing SHALL NOT disconnect, slow or show anything to a player without the mod. At most, their own log file MAY record one line per message they cannot receive.

#### Scenario: Unmodded client on a modded host

- **WHEN** a player without the mod joins a modded host's world
- **THEN** they stay connected and see nothing new in game

### Requirement: Sharing never overrides a game call

Pocket Compendium SHALL check that its sharing calls do not collide with any call the game or another mod has registered. On a collision it SHALL leave sharing off for the session and record why in the log.

#### Scenario: Collision at start

- **WHEN** a sharing call's identifier is already registered
- **THEN** sharing stays off and the log says so, and every other feature runs

### Requirement: No sharing through chat

Pocket Compendium SHALL NOT send boss state through chat in any channel.

#### Scenario: Dedicated server

- **WHEN** a modded player plays on a dedicated server
- **THEN** the mod sends no chat lines and shows its own estimates

### Requirement: Shared state is per world

Shared state SHALL apply only while the client is in the world it came from, and SHALL NOT change the client's own solo world.

#### Scenario: Returning to a solo world

- **WHEN** a client leaves a shared world and loads their solo world
- **THEN** their solo world's boss deadlines are unchanged

#### Scenario: Joining a server that does not share

- **WHEN** a client leaves a shared world and joins a server without sharing
- **THEN** the client shows its own estimates for that server
