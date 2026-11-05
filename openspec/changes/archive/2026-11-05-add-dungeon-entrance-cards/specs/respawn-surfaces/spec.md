## ADDED Requirements

### Requirement: Dungeon entrances list their monsters

Hovering a dungeon's entrance on the local map SHALL show a card beside it with the dungeon's tracked bosses, elites and fabled monsters in the boss list's compact style: the dungeon's name, how many are up, and their tiles four to a line in the boss list's state order. A dungeon without tracked monsters SHALL get no card. Dungeon entrances SHALL be a feature with its own switch, apart from map pins.

#### Scenario: Hovering Sunken Temple's entrance

- **WHEN** the player hovers the Sunken Temple gate on Crescent Coast's map
- **THEN** a card titled Sunken Temple shows its eight bosses and elites, those that are up first

### Requirement: A dungeon card works like the boss list

A dungeon card SHALL stay while the pointer is on the entrance, on the card or between them, and SHALL close as soon as the local map stops showing, such as when the player switches to the world map. Its tiles SHALL work as the boss list's tiles do: hovering one gives its tooltip, clicking it toggles the watch and Shift-clicking it opens its Bestiary page.

#### Scenario: Watching from the card

- **WHEN** the player moves from Lost Archives's gate onto Archivist Phaendar's tile and clicks it
- **THEN** Archivist Phaendar is watched

#### Scenario: Switching to the world map

- **WHEN** Sunken Temple's card is open and the player switches to the world map
- **THEN** the card is gone from the world map
