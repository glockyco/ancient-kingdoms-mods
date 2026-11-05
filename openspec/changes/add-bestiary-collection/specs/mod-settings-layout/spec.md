# Spec Delta

## MODIFIED Requirements

### Requirement: Features sit in three groups

The groups SHALL be Respawns, with the boss list, map pins, dungeon entrances, world markers, edge arrows, alerts and sharing, Bestiary, with full Bestiary pages, Bestiary countdowns and drops found, and Combat, with boss skills and Fatecharms.

#### Scenario: Finding edge arrows

- **WHEN** the player opens Respawns in the settings window
- **THEN** edge arrows has its own row, apart from world markers

#### Scenario: Finding drops found

- **WHEN** the player opens Bestiary in the settings window
- **THEN** a row reads "Drops found" with "Shows a bar on each monster in the Bestiary that fills as you find its drops."

### Requirement: Undiscovered monsters show in full or as the game shows them

While Undiscovered monsters is on, the boss list, map pins, dungeon cards, world markers and spawn alerts SHALL name a monster without an entry in the game's Bestiary record and show its portrait, its Bestiary page SHALL show in full, and its tile in the Bestiary's list SHALL show its portrait in the game's grey for monsters seen but never killed. While it is off, they SHALL show it as a silhouette named ???, and its Bestiary page and tile SHALL show as the game shows them.

#### Scenario: Undiscovered boss

- **WHEN** the player has not discovered Vyriss the Withered and the default applies
- **THEN** its boss list row shows its portrait and name, and its tile in the Bestiary's list shows its portrait in grey

#### Scenario: Keeping monsters hidden

- **WHEN** the player switches Undiscovered monsters off
- **THEN** Vyriss the Withered's row shows a silhouette named ???, its Bestiary page shows "???" as the game does, and its tile is a black silhouette
