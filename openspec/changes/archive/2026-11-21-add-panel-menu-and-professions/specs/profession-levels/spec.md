## Purpose

Defines Pocket Compendium's Professions panel, which shows the character's profession levels without the game's Skills window.

## ADDED Requirements

### Requirement: The panel shows every profession's level

The Professions panel SHALL show the 13 professions of the game's Professions tab in the tab's order, each with the game's icon and its level from 0 to 100 with two decimals, as the game computes it. A profession at 100 SHALL show "100" in the game's yellow.

#### Scenario: A mid-game character

- **WHEN** a character with Mining at 47.36 and Herbalism at 100 opens the panel
- **THEN** Mining reads 47.36, and Herbalism reads 100 in yellow

#### Scenario: A gain

- **WHEN** the game raises Fishing from 12.09 to 12.29 while the panel shows
- **THEN** Fishing reads 12.29 without reopening the panel

### Requirement: The panel has a list and a compact style

The list style SHALL show each profession as a row with its icon, name and level. The compact style SHALL show each as a tile with its icon and its level on a band, and name it in the tile's tooltip. A style button in the header SHALL switch between them, and the header SHALL also hold a settings button and a lock, as the boss list's does. The compact header SHALL appear only while the pointer is over the panel.

#### Scenario: Switching to compact

- **WHEN** the player clicks the style button of the panel in the list style
- **THEN** the panel shows tiles, and hovering the Mining tile names Mining

### Requirement: The grip sets the panel's width

The panel's grip SHALL set its width. The list SHALL put more than six rows into two columns, as the game's tab does, where two fit. The compact style SHALL put as many tiles on a line as the width holds.

#### Scenario: A narrow list

- **WHEN** the player drags the grip of the list until two columns no longer fit
- **THEN** the 13 rows stand in one column

### Requirement: Watched professions can show alone

Clicking a row or tile SHALL toggle whether its profession is watched, marked with the gold corner. A profession's tooltip SHALL give its name, its level as "47.36 of 100" and "Click to watch." or "Click to stop watching." A pin button in the header SHALL show only the watched professions, in either style, and is gold while it does. With the pin on and nothing watched, the panel SHALL show every profession. Watched professions and the pin SHALL persist across sessions.

#### Scenario: Three watched

- **WHEN** the player watches Cooking, Mining and Fishing and turns the pin on
- **THEN** the panel shows only those three

### Requirement: The panel starts compact and only reads

At first start the panel SHALL show in the compact style. The panel SHALL only read the character's levels.

#### Scenario: First start

- **WHEN** a player starts the version that adds the panel for the first time
- **THEN** the Professions panel shows its 13 tiles at the bottom right
