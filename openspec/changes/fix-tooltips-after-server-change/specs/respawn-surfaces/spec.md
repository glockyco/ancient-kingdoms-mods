## MODIFIED Requirements

### Requirement: Map pins show portraits only

On the local map, each tracked monster SHALL show as a portrait pin. A pin SHALL sit where a monster that is up is, as far as the game shows it, and otherwise on its spawn point or altar. Dead monsters SHALL carry a small time tag and monsters that are up SHALL glow. Hovering a pin SHALL show its name, level and spawn rules in Pocket Compendium's tooltip.

#### Scenario: Hovering a pin

- **WHEN** the player hovers Xylevis's pin on the map
- **THEN** the tooltip says it respawns 35 min after each kill and when the next spawn is

#### Scenario: A boss that left its spawn point

- **WHEN** Forsaken Skeleton is up 15 yd west of its spawn point and the player opens the local map
- **THEN** its pin glows 15 yd west of the spawn point, where the skeleton is
