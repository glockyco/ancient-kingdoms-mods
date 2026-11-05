## RENAMED Requirements

- FROM: `### Requirement: Undiscovered monsters follow the Bestiary`
- TO: `### Requirement: Undiscovered monsters follow one setting`

## MODIFIED Requirements

### Requirement: Every feature has its own switch

Each feature SHALL have its own on and off switch, shown as a row in its group of the settings window with the feature's one sentence, and no row SHALL hold a second switch. The groups SHALL be Respawns, with the boss list, map pins, dungeon entrances, world markers, edge arrows, alerts and sharing, Bestiary, with full Bestiary pages and Bestiary countdowns, and Combat, with boss skills and Fatecharms. A feature with settings SHALL keep them on a page of its own, reached from a gear on its row and from its panel's settings button. Every feature SHALL be on at first start, except that edge arrows SHALL start as they were set while they were part of world markers. Switching a feature off SHALL remove everything it draws and every change it makes to the game's interface, without a restart.

#### Scenario: Switching world markers off

- **WHEN** the player switches world markers off during play
- **THEN** every world marker disappears at once, and edge arrows and the other features keep working

#### Scenario: Opening the boss list's settings

- **WHEN** the player clicks the gear on the boss list's row in Respawns
- **THEN** the window shows the boss list's own page, with the way back to Respawns above its title

#### Scenario: Dungeon cards without map pins

- **WHEN** the player switches map pins off and hovers the Sunken Temple gate on the map
- **THEN** the dungeon's card shows

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

The settings window SHALL have a General group for settings that apply across features. Its Undiscovered monsters switch, on at first start, SHALL decide for every surface how a monster without an entry in the game's Bestiary record shows. While it is on, the boss list, map pins, dungeon cards, world markers and spawn alerts SHALL name such a monster and show its portrait, and its Bestiary page SHALL show in full. While it is off, they SHALL show it as a silhouette named ???, and its Bestiary page SHALL show as the game shows it. A player who had switched off undiscovered monsters on the Bestiary pages page SHALL start with this switch off.

#### Scenario: Undiscovered boss

- **WHEN** the player has not discovered Vyriss the Withered and the default applies
- **THEN** its boss list row shows its portrait and name

#### Scenario: Keeping monsters hidden

- **WHEN** the player switches Undiscovered monsters off
- **THEN** Vyriss the Withered's row shows a silhouette named ???, and its Bestiary page shows "???" as the game does

### Requirement: Option pickers are even

In the settings window, every option of a picker SHALL have the same width, and the picker SHALL fill its column.

#### Scenario: Three options

- **WHEN** the Sort by picker shows State, Distance and Level
- **THEN** the three options are equally wide
