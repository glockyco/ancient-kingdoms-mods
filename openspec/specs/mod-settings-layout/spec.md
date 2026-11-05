# mod-settings-layout Specification

## Purpose
Defines how players switch Pocket Compendium's features on and off, filter what the boss list shows, and place its panels.

## Requirements

### Requirement: Every feature has its own switch

Each feature SHALL have its own on and off switch, shown as a row in its group of the settings window with the feature's one sentence, and no row SHALL hold a second switch. Every feature SHALL be on at first start, except that edge arrows SHALL start as they were set while they were part of world markers. Switching a feature off SHALL remove everything it draws and every change it makes to the game's interface, without a restart.

#### Scenario: Switching world markers off

- **WHEN** the player switches world markers off during play
- **THEN** every world marker disappears at once, and edge arrows and the other features keep working

#### Scenario: Dungeon cards without map pins

- **WHEN** the player switches map pins off and hovers the Sunken Temple gate on the map
- **THEN** the dungeon's card shows

### Requirement: Features sit in three groups

The groups SHALL be Respawns, with the boss list, map pins, dungeon entrances, world markers, edge arrows, alerts and sharing, Bestiary, with full Bestiary pages and Bestiary countdowns, and Combat, with boss skills and Fatecharms.

#### Scenario: Finding edge arrows

- **WHEN** the player opens Respawns in the settings window
- **THEN** edge arrows has its own row, apart from world markers

### Requirement: A feature's settings sit behind a gear

A feature with settings SHALL keep them on a page of its own, reached from a gear on its row and from its panel's settings button.

#### Scenario: Opening the boss list's settings

- **WHEN** the player clicks the gear on the boss list's row in Respawns
- **THEN** the window shows the boss list's own page, with the way back to Respawns above its title

### Requirement: One feature's failure does not stop the others

When a feature fails, Pocket Compendium SHALL switch that feature off for the session, record the failure once in the MelonLoader log, and keep every other feature running.

#### Scenario: Map pins fail

- **WHEN** drawing map pins throws
- **THEN** map pins stop for the session, the log holds one error, and the boss list keeps updating

### Requirement: Filters decide what the boss list shows

The boss list page SHALL filter by tier (bosses, elites, fabled), by level (all, not trivial, within 10 levels of the player, or a custom range), by zone (this zone or all zones) and by discovery (show or hide). By default every monster in the current zone shows. Filters SHALL NOT hide watched monsters.

#### Scenario: Near my level

- **WHEN** a level 14 player filters to "Near my level" in Crescent Coast
- **THEN** monsters more than 10 levels away collapse into one line counting them, and watched monsters still show

### Requirement: The skill panel shows the chosen tiers

The boss skills settings SHALL choose which tiers the skill panel shows, bosses, elites and fabled monsters, all on at first start. A monster whose only skill is its basic attack SHALL NOT appear, because it has nothing to count down, and the settings SHALL say so.

#### Scenario: Elites switched off

- **WHEN** the player switches elites off and fights an elite with special skills
- **THEN** the skill panel does not show it

### Requirement: Undiscovered monsters follow one setting

The settings window SHALL have a General group for settings that apply across features. Its Undiscovered monsters switch, on at first start, SHALL decide for every surface how a monster without an entry in the game's Bestiary record shows. A player who had switched off undiscovered monsters on the Bestiary pages page SHALL start with this switch off.

#### Scenario: An earlier choice carries over

- **WHEN** a player who had switched off undiscovered monsters on the Bestiary pages page starts the reorganized settings for the first time
- **THEN** Undiscovered monsters in General is off

### Requirement: Undiscovered monsters show in full or as the game shows them

While Undiscovered monsters is on, the boss list, map pins, dungeon cards, world markers and spawn alerts SHALL name a monster without an entry in the game's Bestiary record and show its portrait, and its Bestiary page SHALL show in full. While it is off, they SHALL show it as a silhouette named ???, and its Bestiary page SHALL show as the game shows it.

#### Scenario: Undiscovered boss

- **WHEN** the player has not discovered Vyriss the Withered and the default applies
- **THEN** its boss list row shows its portrait and name

#### Scenario: Keeping monsters hidden

- **WHEN** the player switches Undiscovered monsters off
- **THEN** Vyriss the Withered's row shows a silhouette named ???, and its Bestiary page shows "???" as the game does

### Requirement: Panels are placed by the player

Every panel SHALL be movable, resizable and lockable. A locked panel SHALL ignore drags. Positions, sizes and locks SHALL persist across sessions. In the list style, the boss list's grip SHALL set its width and its maximum height. In the compact style, the grip SHALL set only the width, and with it the tiles per line, and the panel SHALL show every line of tiles.

#### Scenario: Locking the boss list

- **WHEN** the player locks the boss list and then drags it
- **THEN** the panel stays where it is

#### Scenario: Resizing compact tiles

- **WHEN** the player drags the compact boss list's grip to make room for one more tile per line
- **THEN** each line holds one more tile and the panel grows or shrinks to show every line

### Requirement: The game's interface covers the panels

Panels SHALL draw under the game's interface, including its HUD, windows, menus and tooltips. A panel SHALL take the pointer only where no game interface covers it.

#### Scenario: Journal over the boss list

- **WHEN** the player opens the Journal over the boss list and clicks inside the Journal
- **THEN** the Journal covers the list, and the click does not reach the list

### Requirement: Option pickers are even

In the settings window, every option of a picker SHALL have the same width, and the picker SHALL fill its column.

#### Scenario: Three options

- **WHEN** the Sort by picker shows State, Distance and Level
- **THEN** the three options are equally wide
