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

### Requirement: Undiscovered things follow one setting

The settings window SHALL have a General group for settings that apply across features. Its Undiscovered switch, on at first start, SHALL decide for every surface how a monster without an entry in the game's Bestiary record shows, and how a herb, ore or fish the character has not gathered shows. A player who had switched off undiscovered monsters on the Bestiary pages page SHALL start with this switch off.

#### Scenario: An earlier choice carries over

- **WHEN** a player who had switched off undiscovered monsters on the Bestiary pages page starts the reorganized settings for the first time
- **THEN** Undiscovered in General is off

#### Scenario: The switch's name

- **WHEN** the player opens General in the settings window
- **THEN** the first row reads "Undiscovered" and its help names monsters, herbs, ores and fish

### Requirement: Undiscovered monsters show in full or as the game shows them

While Undiscovered is on, the boss list, map pins, dungeon cards, world markers and spawn alerts SHALL name a monster without an entry in the game's Bestiary record and show its portrait, its Bestiary page SHALL show in full, and its tile in the Bestiary's list SHALL show its portrait in the game's grey for monsters seen but never killed. While it is off, they SHALL show it as a silhouette named ???, and its Bestiary page and tile SHALL show as the game shows them.

#### Scenario: Undiscovered boss

- **WHEN** the player has not discovered Vyriss the Withered and the default applies
- **THEN** its boss list row shows its portrait and name, and its tile in the Bestiary's list shows its portrait in grey

#### Scenario: Keeping monsters hidden

- **WHEN** the player switches Undiscovered off
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
