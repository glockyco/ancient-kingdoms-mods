# Spec Delta

## Purpose

Defines how a player reports a Pocket Compendium problem or suggests an idea from the game, what a report carries, and how a feature that stopped after an error makes itself known.

## ADDED Requirements

### Requirement: The report action prepares a report

The report action SHALL open the repository's problem form in the browser with its details field filled in, copy the same details to the clipboard, and then show where `MelonLoader/Latest.log` is, with a way to open its folder.

#### Scenario: Reporting from the game

- **WHEN** the player uses the report action
- **THEN** the browser shows the problem form with the details filled in
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

### Requirement: The problem form takes the details

The problem form SHALL require only what went wrong, SHALL have the details field that the report action fills, and SHALL offer a field for screenshots or the log file that says where the log is and that it can contain the Windows user name. It SHALL name the compendium channel on the game's Discord as the place to post without a GitHub account. Every problem report SHALL carry the labels `bug` and `mods`.

#### Scenario: Opening the form from the README

- **WHEN** a player opens the problem form from the README
- **THEN** only what went wrong needs an answer, and the form says where the log file is

#### Scenario: A player without a GitHub account

- **WHEN** a player without a GitHub account reads the problem form
- **THEN** the form names the compendium channel on the game's Discord as the place to post instead

### Requirement: The idea action opens the ideas form

The idea action SHALL open the repository's ideas form in the browser. The ideas form SHALL first ask, in its only required field, what the player would like to do in the game and what gets in the way, then offer optional fields for the player's idea and screenshots. It SHALL NOT ask for versions, logs or other details of the player's setup. Every idea SHALL carry the labels `enhancement` and `mods`.

#### Scenario: Suggesting an idea

- **WHEN** the player uses the idea action
- **THEN** the browser shows the ideas form, which asks first what the player would like to do and what gets in the way, and asks for no version or log

### Requirement: The README names where to report

The README SHALL have its own section on problems and ideas that names the About page's report and idea actions, links the issue forms on GitHub, and names the compendium channel on the game's Discord for players without a GitHub account.

#### Scenario: Reading the README

- **WHEN** a player looks in the README for where to report a problem
- **THEN** they find a section that names the About page's actions, links the forms and names the compendium channel on the game's Discord

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
