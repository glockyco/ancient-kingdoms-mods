## Purpose

Defines what the typed runtime command surface guarantees to a caller: that a command which changes
game state names the subject it acted on, and that a command given the same inputs against the same
game state produces the same outcome. A caller uses these commands to take measurements, so an
unnamed or unstable subject makes a measurement unattributable.

## ADDED Requirements

### Requirement: World entry names the character it selected

A command that enters the world SHALL report the selected character's name in its result. It SHALL
report the name whether the caller requested a character or not.

#### Scenario: A caller requests no particular character

- **WHEN** world entry runs without a requested character
- **THEN** the result names the character that was selected

#### Scenario: A caller requests a character

- **WHEN** world entry runs with a requested character
- **THEN** the result names that character

### Requirement: Default character selection is deterministic

When a caller requests no character, selection SHALL depend only on the set of available character
names. Two runs against the same set SHALL select the same character.

Selection SHALL NOT depend on the order in which the game lists characters, because that order is
unspecified and changes when a save rewrites a row.

#### Scenario: The same account is entered twice

- **WHEN** world entry runs twice against an unchanged set of characters
- **THEN** both runs select the same character

#### Scenario: The listed order changes

- **WHEN** the game lists the same characters in a different order
- **THEN** selection is unchanged

#### Scenario: A character is added

- **WHEN** a new character sorts ahead of the previous selection
- **THEN** the new character is selected, because selection depends only on the name set

### Requirement: A requested character that does not exist is refused

When a caller requests a character that the account does not hold, the command SHALL fail with a
stated precondition and SHALL NOT enter the world as a different character.

The failure SHALL list the available character names, so that the caller can correct the request
without a second query.

#### Scenario: The requested name is absent

- **WHEN** a caller requests a character the account does not hold
- **THEN** the command fails with a stated precondition
- **AND** the failure lists the available names

#### Scenario: The requested name differs only by letter case

- **WHEN** a caller requests a name that differs from a held character only by letter case
- **THEN** that character is selected, because the game stores character names under a
  case-insensitive primary key and so treats the two as one name

#### Scenario: The account holds no characters

- **WHEN** the account holds no characters
- **THEN** the command fails with a stated precondition

### Requirement: An occupied world is not silently reused

When the game already holds a local player and the caller requests a different character, the command
SHALL fail with a stated precondition naming both the held character and the requested one.

The command SHALL NOT leave the world and re-enter it, because that path is not exercised by the game's
own flow.

#### Scenario: A different character is already in the world

- **WHEN** the game holds one character and the caller requests another
- **THEN** the command fails with a stated precondition
- **AND** the failure names the held character and the requested character

#### Scenario: The requested character is already in the world

- **WHEN** the game holds the character the caller requested
- **THEN** the command succeeds and names that character

#### Scenario: A caller requests no character and the world is occupied

- **WHEN** the game already holds a local player and no character was requested
- **THEN** the command succeeds and names the held character
