# Spec Delta

## RENAMED Requirements

- FROM: `### Requirement: Features sit in three groups`
- TO: `### Requirement: Features sit in four groups`
- FROM: `### Requirement: Undiscovered monsters follow one setting`
- TO: `### Requirement: Undiscovered things follow one setting`

## MODIFIED Requirements

### Requirement: Features sit in four groups

The groups SHALL be Respawns, with the boss list, map pins, dungeon entrances, world markers, edge arrows, alerts and sharing, Bestiary, with full Bestiary pages, Bestiary countdowns and drops found, Gathering, with the gathering helper, and Combat, with boss skills, Fatecharms and augment marks.

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
