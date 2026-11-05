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

The groups SHALL be Respawns, with the boss list, map pins, dungeon entrances, world markers, edge arrows, alerts and sharing, Bestiary, with full Bestiary pages, Bestiary countdowns and drops found, and Combat, with boss skills and Fatecharms.

#### Scenario: Finding edge arrows

- **WHEN** the player opens Respawns in the settings window
- **THEN** edge arrows has its own row, apart from world markers

#### Scenario: Finding drops found

- **WHEN** the player opens Bestiary in the settings window
- **THEN** a row reads "Drops found" with "Shows a bar on each monster in the Bestiary that fills as you find its drops."

### Requirement: A feature's settings sit behind a gear

A feature with settings SHALL keep them on a page of its own, reached from a gear on its row and from its panel's settings button.

#### Scenario: Opening the boss list's settings

- **WHEN** the player clicks the gear on the boss list's row in Respawns
- **THEN** the window shows the boss list's own page, with the way back to Respawns above its title

### Requirement: One feature's failure does not stop the others

When a feature fails, Pocket Compendium SHALL switch that feature off, record the failure once in the MelonLoader log, and keep every other feature running. The feature's settings row SHALL read "Stopped after an error." with a Report button, and its switch SHALL show it off. Switching it on SHALL turn the feature on again in the same session.

#### Scenario: Map pins fail

- **WHEN** drawing map pins throws
- **THEN** map pins stop, the log holds one error, and the boss list keeps updating

#### Scenario: Turning a stopped feature on in the settings

- **WHEN** Map pins has stopped and the player switches it on in Respawns
- **THEN** map pins draw again and the row no longer reads "Stopped after an error."

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

While Undiscovered monsters is on, the boss list, map pins, dungeon cards, world markers and spawn alerts SHALL name a monster without an entry in the game's Bestiary record and show its portrait, its Bestiary page SHALL show in full, and its tile in the Bestiary's list SHALL show its portrait in the game's grey for monsters seen but never killed. While it is off, they SHALL show it as a silhouette named ???, and its Bestiary page and tile SHALL show as the game shows them.

#### Scenario: Undiscovered boss

- **WHEN** the player has not discovered Vyriss the Withered and the default applies
- **THEN** its boss list row shows its portrait and name, and its tile in the Bestiary's list shows its portrait in grey

#### Scenario: Keeping monsters hidden

- **WHEN** the player switches Undiscovered monsters off
- **THEN** Vyriss the Withered's row shows a silhouette named ???, its Bestiary page shows "???" as the game does, and its tile is a black silhouette

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

### Requirement: The interface follows the game's interface scale

Pocket Compendium's panels, windows, start-screen cards and hovers SHALL take the scale of the game's own interface: the game's canvas scale for the screen, multiplied by the game's "Scaling UI" setting relative to its default. They SHALL follow the setting while its slider moves, without a restart. World markers and edge arrows SHALL keep their size. A panel's own size SHALL apply on top of the interface scale.

#### Scenario: A larger interface

- **WHEN** the player moves Scaling UI from its default of 0.9 to 1.2
- **THEN** the boss list, the settings window and the mod's hovers grow by a third, as the game's windows do, and world markers keep their size

#### Scenario: The default on a 16:9 screen

- **WHEN** Scaling UI is at its default on a 1920 by 1080 screen
- **THEN** the mod's panels and windows have the size they had before they followed the setting

#### Scenario: A screen that is not 16:9

- **WHEN** the game runs in a window of 1800 by 1169
- **THEN** the settings window's text has the size of the game's own settings window text at every slider value

### Requirement: The notice card can be placed in advance

The General page SHALL have a "Notices" row with a "Show example" button and the help "Shows an example card so you can move it where you want it." The button SHALL show an example card in the place a stop's card uses, in the gold look, reading "Example: notices show here" over "Drag this card where you want it.", with a Done button that closes it.

#### Scenario: Showing the example

- **WHEN** the player clicks "Show example" on the General page
- **THEN** a gold card reads "Example: notices show here" over "Drag this card where you want it." with a Done button

### Requirement: The notice card is placed like a panel

The notice card, the example included, SHALL first appear bottom left above the chat. It SHALL move, keep its place across sessions and lock like a panel, and return to its first place with the panels' Reset.

#### Scenario: Placing the card

- **WHEN** the player clicks "Show example", drags the example card to the top right and clicks Done
- **THEN** the next card for a stopped feature shows at the top right
