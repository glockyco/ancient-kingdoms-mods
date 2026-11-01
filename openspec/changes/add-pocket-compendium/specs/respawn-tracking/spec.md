## Purpose

Defines which monsters Pocket Compendium tracks, the states each tracked monster can be in, and what the tracker may claim on a host and on a client of someone else's server.

## ADDED Requirements

### Requirement: Tracked monsters cover every zone

The tracker SHALL track every boss, elite and fabled monster in the world, including those in zones with no player inside. On a host it SHALL read each monster's state whether or not its zone is active.

#### Scenario: Boss in an inactive zone

- **WHEN** a host player stands in Crescent Coast and watches Seer Kzhal in Twilight Forest, where nobody is
- **THEN** Seer Kzhal is tracked with its current state

### Requirement: Each tracked monster has one named state

Each tracked monster SHALL be in exactly one of these states: Up, In combat, Respawns, Estimated, Chance, Due, Night or day, Guards, Altar, Seen, Not seen. Each state SHALL pair a word or a value with an icon, so colour is never the only signal.

#### Scenario: Night-only boss by day

- **WHEN** Spirit of the Forest is outside its night window
- **THEN** its state is Night or day with a moon icon and the time until its window opens, never Up

### Requirement: A hidden monster is never shown as up

A monster that the game hides outside its time window or event SHALL NOT be shown as Up, whatever its health.

#### Scenario: Hidden window boss at full health

- **WHEN** a host reads Spirit of the Forest at game hour 19, hidden with full health
- **THEN** it shows Night or day, not Up

### Requirement: Chance spawns show the roll, not a return

For a monster that spawns with a chance below 100%, a countdown SHALL be labelled as the next roll with a dice icon, and its list row, its Bestiary plate and its tooltip SHALL give the chance. When the roll time passes, the state SHALL be Due, which says the roll is due and does not claim the monster is up.

#### Scenario: Failed roll

- **WHEN** Forsaken Skeleton's 75% roll fails
- **THEN** the row shows a dice icon and the time to the next roll, and the tooltip says the last roll failed and the chance is 75%

#### Scenario: Elapsed roll in an empty zone

- **WHEN** Seer Kzhal's roll time passes while nobody is in Twilight Forest
- **THEN** the state is Due and the tooltip says a 20% roll happens when someone enters

### Requirement: Host times are exact

On a host, a dead monster's countdown SHALL equal the game's own respawn deadline: corpse time plus respawn time after the kill. A dungeon renewal SHALL clear deadlines in the tracker exactly as it does in the game.

#### Scenario: Boss killed on a host

- **WHEN** a host kills Xylevis, with 5 min corpse time and 30 min respawn time
- **THEN** Xylevis shows Respawns with 35:00 counting down

### Requirement: Client estimates are marked

On a client without host sharing, a time SHALL be shown as an estimate with a leading `~`, derived from a death the player saw or from the server's kill notice. The tooltip SHALL name the source and its age. A monster never seen on that server SHALL show Not seen.

#### Scenario: Kill notice on a dedicated server

- **WHEN** a dedicated server announces Troll King Grimlok's death
- **THEN** the row shows ~1h 05m and the tooltip says the time comes from the server's kill notice

### Requirement: Times are kept per world

Tracked state SHALL be kept separately for each world: each solo world, each hosted world joined and each server. Switching worlds SHALL NOT carry times from one to another.

#### Scenario: Joining a friend's world

- **WHEN** a player leaves their solo world with Xylevis dead and joins a friend's world
- **THEN** Xylevis's state comes from the friend's world, not the solo world

### Requirement: The game's clock is never changed

The tracker SHALL only read and display spawn state. It SHALL NOT change any deadline, roll, window or spawn in the game.

#### Scenario: Tracker running on a host

- **WHEN** the tracker runs for a session on a host
- **THEN** every respawn happens at the same moment as without the mod

### Requirement: Entries never vanish silently

A tracked monster SHALL stay listed until its state changes. Entries from zones the player left SHALL move under their own zone instead of mixing with the current zone.

#### Scenario: Leaving a zone

- **WHEN** a player kills Xylevis and travels to another zone
- **THEN** Xylevis is no longer listed under the current zone, and shows under Crescent Coast if watched or if all zones are shown
