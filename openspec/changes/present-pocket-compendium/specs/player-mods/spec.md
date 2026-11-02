## ADDED Requirements

### Requirement: The home page leads to the mod

The home page SHALL link to the mods page from its first screen in both layouts.

#### Scenario: The title-screen layout

- **WHEN** a player opens the home page in its title-screen layout
- **THEN** a button to the mods page sits beside the buttons to the map and the items, on a phone too

#### Scenario: The classic layout

- **WHEN** a player opens the home page in its classic layout
- **THEN** a Pocket Compendium card leads to the mods page beside the Interactive World Map card on wide screens

### Requirement: The mods page leads with what players install the mod for

The mods page SHALL name respawn timers, spawn locations and boss skill cooldowns in its introduction and SHALL list the Boss list, World markers and Boss skills features before the others. It SHALL show the settings window after the install step that tells players to open it.

#### Scenario: A player skims the page

- **WHEN** a player reads only the introduction and the first row of features
- **THEN** they learn that the mod times respawns, marks spawn points and counts down boss skills

#### Scenario: A player installs the mod

- **WHEN** a player reaches the step that says to press F8 for the settings
- **THEN** a picture of the settings window follows it
