## ADDED Requirements

### Requirement: One round button shows and hides the panels

A round button with an open book, in the minimap's own frame on its lower left, SHALL open a menu with a switch for each panel whose feature is on: Bosses with a skull, Gathering with a leaf, and Professions with a hammer. A switch SHALL show or hide only its panel, and the button SHALL be gold while the menu is open. A hidden panel SHALL leave nothing on screen. Whether each panel shows SHALL persist across sessions. The button SHALL show only while at least one of these features is on.

#### Scenario: Hiding the boss list

- **WHEN** the player opens the menu and switches Bosses off
- **THEN** the boss list disappears entirely, and its edge arrows, world markers, map pins and alerts stay

#### Scenario: Every panel feature off

- **WHEN** the boss list, the gathering helper and the professions panel are all switched off in the settings
- **THEN** the minimap shows no button of the mod's

### Requirement: A panel's edge meets its content

A panel SHALL be as wide as what it shows, so no empty strip runs beside its last column of tiles. The grip SHALL NOT narrow a panel below the width its always-shown parts need: the list styles keep room for their header, and the Gathering list keeps four tiles for its tabs. A compact panel whose header shows only on hover SHALL fit its tiles, down to one, and its header SHALL keep the width its title and buttons need, reaching past the tiles when they are fewer.

#### Scenario: Three watched professions

- **WHEN** the compact Professions panel shows only Cooking, Lorekeeping and Mining
- **THEN** the panel ends at the third tile, and pointing at it shows the header with all four buttons above it

#### Scenario: The Gathering list at its narrowest

- **WHEN** the player drags the Gathering list's grip as far left as it goes
- **THEN** the list shows four tiles to a line under its four tabs and its header

### Requirement: Panels start clear of the game's windows

At first start the boss list SHALL sit at the window's left edge above the chat, and the Gathering list and the Professions panel at the bottom right, high enough that their tallest views stay on a 16:9 screen. With the game's windows at their own defaults, no panel SHALL start under the game's frames, quest tracker, skillbar or chat.

#### Scenario: A new player

- **WHEN** a player starts Pocket Compendium for the first time with the game's windows at their defaults
- **THEN** the compact boss list shows above the chat, and the Gathering list and the Professions panel at the bottom right, each clear of the game's windows

## RENAMED Requirements

- FROM: `### Requirement: Features sit in four groups`
- TO: `### Requirement: Features sit in five groups`

## MODIFIED Requirements

### Requirement: Features sit in five groups

The groups SHALL be Respawns, with the boss list, map pins, dungeon entrances, world markers, edge arrows, alerts and sharing, Bestiary, with full Bestiary pages, Bestiary countdowns and drops found, Gathering, with the gathering helper, Professions, with the professions panel, and Combat, with boss skills, Fatecharms and augment marks.

#### Scenario: Finding edge arrows

- **WHEN** the player opens Respawns in the settings window
- **THEN** edge arrows has its own row, apart from world markers

#### Scenario: Finding drops found

- **WHEN** the player opens Bestiary in the settings window
- **THEN** a row reads "Drops found" with "Shows a bar on each monster in the Bestiary that fills as you find its drops."

#### Scenario: Finding augment marks

- **WHEN** the player opens Combat in the settings window
- **THEN** a row below Fatecharms reads "Augment marks" with "Marks each item that has an augment with the augment's icon."

#### Scenario: Finding the gathering helper

- **WHEN** the player opens Gathering in the settings window
- **THEN** the gathering helper has its own row with its switch

#### Scenario: Finding the professions panel

- **WHEN** the player opens Professions in the settings window
- **THEN** the professions panel has its own row with its switch
