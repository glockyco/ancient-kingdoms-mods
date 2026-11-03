## ADDED Requirements

### Requirement: Tracking adds no recurring long frame

While the player plays in a world, the tracker SHALL search the scene for monsters only when a tracking session starts. It SHALL learn of an altar or placeholder spawn that the game starts later from the start itself, so tracking adds no long frame that recurs while the player walks.

#### Scenario: Walking with every feature on

- **WHEN** a host player walks through The Lone-Lands with every Pocket Compendium feature on
- **THEN** no frame stalls once a second, and the long frames match those of the same walk with every feature off

#### Scenario: An altar boss spawns

- **WHEN** an altar wave spawns Crypt Lord Kharzul near the player
- **THEN** the boss list shows him up at its next refresh, and shows the altar again once the game destroys him

#### Scenario: An altar boss alive before tracking starts

- **WHEN** Crypt Lord Kharzul is alive and the player switches the boss list off and on again
- **THEN** the boss list shows him up
