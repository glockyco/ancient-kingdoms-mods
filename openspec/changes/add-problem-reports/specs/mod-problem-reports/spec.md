# Spec Delta

## Purpose

Defines how a player reports a Pocket Compendium problem from the game, what a report carries, and how a feature that stopped after an error makes itself known.

## ADDED Requirements

### Requirement: One action starts a report

The settings window SHALL offer a report action at all times. The action SHALL open the repository's Pocket Compendium issue form in the browser with its details field filled in, copy the same details to the clipboard, and then show where `MelonLoader/Latest.log` is, with a way to open its folder.

#### Scenario: Reporting from the game

- **WHEN** the player uses the report action
- **THEN** the browser shows the Pocket Compendium issue form with the details filled in
- **AND** the clipboard holds the same details
- **AND** the settings window names the log file and can open its folder

#### Scenario: The browser does not open

- **WHEN** the system opens no browser for the link
- **THEN** the clipboard still holds the details and the settings window still names the log file

### Requirement: Details describe the setup

The details SHALL name Pocket Compendium's version and build, the game version, the MelonLoader version, the system as Windows or as Wine on macOS or Linux, the game language, whether the player plays alone, hosts a world or joined one, the other mods MelonLoader loaded with their versions, the features switched off, and each feature stopped by an error with its error's first line.

#### Scenario: A stopped feature on a Mac

- **WHEN** Map pins stopped after an error on a Mac with CrossOver and the player reports
- **THEN** the details name Wine on macOS and list Map pins with the first line of its error

### Requirement: Details stay impersonal

The details SHALL NOT contain a server address, a character name or a file path.

#### Scenario: Reporting from a friend's world

- **WHEN** the player reports while in a world another player hosts
- **THEN** the details say the player joined a world and name neither its address nor the character

### Requirement: Long details still open the form

The link SHALL stay within the length GitHub accepts by shortening error lines first. The clipboard SHALL hold the full details.

#### Scenario: Several stopped features

- **WHEN** three features stopped with long errors
- **THEN** the form opens with shortened error lines and the clipboard holds them in full

### Requirement: The form takes the details

The issue form SHALL have the details field that the report action fills, ask what went wrong and how to see it, and ask for the log file and a screenshot. It SHALL say where a player who opens it outside the game finds the versions and the log. Every report SHALL carry the labels `bug` and `mods`.

#### Scenario: Opening the form from the README

- **WHEN** a player opens the form from the README
- **THEN** the form says where the versions and the log file are

### Requirement: A stopped feature makes itself known

When a feature stops after an error, the game's message band SHALL say once per session that the feature stopped and name the report action. The other features SHALL keep running.

#### Scenario: Map pins stop

- **WHEN** Map pins throws during an update
- **THEN** one message names Map pins and the report action
- **AND** the boss list keeps updating

### Requirement: The log names where the player plays

On each world entry, the log SHALL record whether the player plays alone, hosts a world or joined one.

#### Scenario: Joining a LAN world

- **WHEN** the player joins a LAN world another player hosts
- **THEN** the log has a line saying the player joined a world
