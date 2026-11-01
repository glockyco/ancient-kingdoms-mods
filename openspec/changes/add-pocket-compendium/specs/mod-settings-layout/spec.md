## Purpose

Defines how players switch Pocket Compendium's features on and off, filter what the boss list shows, and place its panels.

## ADDED Requirements

### Requirement: Every feature has its own switch

Each feature SHALL have its own on and off switch and settings page: boss list, world markers, map pins, Bestiary countdowns, alerts, boss skills, full Bestiary pages and sharing. Every feature SHALL be on at first start. Switching a feature off SHALL remove everything it draws and every change it makes to the game's interface, without a restart.

#### Scenario: Switching world markers off

- **WHEN** the player switches world markers off during play
- **THEN** every world marker and edge arrow disappears at once and the other features keep working

### Requirement: One feature's failure does not stop the others

When a feature fails, Pocket Compendium SHALL switch that feature off for the session, record the failure once in the MelonLoader log, and keep every other feature running.

#### Scenario: Map pins fail

- **WHEN** drawing map pins throws
- **THEN** map pins stop for the session, the log holds one error, and the boss list keeps updating

### Requirement: Filters decide what the boss list shows

The boss list page SHALL filter by tier (bosses, elites, fabled), by level (all, not trivial, within 10 levels of the player, or a custom range), by zone (this zone or all zones) and by discovery (silhouette, show or hide). By default every monster in the current zone shows. Filters SHALL NOT hide watched monsters.

#### Scenario: Near my level

- **WHEN** a level 14 player filters to "Near my level" in Crescent Coast
- **THEN** monsters more than 10 levels away collapse into one line counting them, and watched monsters still show

### Requirement: Undiscovered monsters follow the Bestiary

By default, a monster the player has not discovered in the Bestiary SHALL show as a silhouette without its name. A setting SHALL show or hide undiscovered monsters instead.

#### Scenario: Undiscovered boss

- **WHEN** the player has never met Fabled Bane Killoran and the default applies
- **THEN** its row shows a silhouette and no name

### Requirement: Panels are placed by the player

Every panel SHALL be movable, resizable and lockable. A locked panel SHALL ignore drags. Positions, sizes and locks SHALL persist across sessions.

#### Scenario: Locking the boss list

- **WHEN** the player locks the boss list and then drags it
- **THEN** the panel stays where it is

### Requirement: The game's interface covers the panels

Panels SHALL draw under the game's interface, including its HUD, windows, menus and tooltips. A panel SHALL take the pointer only where no game interface covers it.

#### Scenario: Journal over the boss list

- **WHEN** the player opens the Journal over the boss list and clicks inside the Journal
- **THEN** the Journal covers the list, and the click does not reach the list

### Requirement: Option pickers are even

In the settings window, every option of a picker SHALL have the same width, and the picker SHALL fill its column.

#### Scenario: Three options

- **WHEN** the Undiscovered picker shows Silhouette, Show and Hide
- **THEN** the three options are equally wide
