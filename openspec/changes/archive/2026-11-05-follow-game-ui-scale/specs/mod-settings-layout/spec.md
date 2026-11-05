# Spec Delta

## ADDED Requirements

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
