# Spec Delta

## ADDED Requirements

### Requirement: The Bestiary's list shows the drops found

While "Drops found" is on, each monster's tile in the Bestiary's list SHALL carry a bar along its top edge, filled by the share of the monster's drops that the game records as found, counted over the drops its Bestiary page shows. The bar SHALL be gold once every drop is found. A tile whose monster has no drop found SHALL show no bar.

#### Scenario: Some drops found

- **WHEN** the game records 2 of the 5 drops Archivist Phaendar's page shows as found
- **THEN** his tile carries a bar filled two fifths of its width

#### Scenario: Every drop found

- **WHEN** the game records all 4 of Gukavep's drops as found
- **THEN** his tile carries a full gold bar

### Requirement: A tile's hover counts the drops found

While "Drops found" is on, hovering a monster's tile in the Bestiary's list or selecting it with a gamepad SHALL show, in the game's tooltip frame, the monster's name and then "2 of 5 drops found", or "All 4 drops found" once every drop is found. While "Undiscovered monsters" is off, a monster without an entry in the game's Bestiary record SHALL show no hover.

#### Scenario: Hovering a monster with drops to find

- **WHEN** the player hovers Archivist Phaendar's tile with 2 of his 5 drops found
- **THEN** the hover reads "Archivist Phaendar" over "2 of 5 drops found"

#### Scenario: Hovering a complete monster

- **WHEN** the player hovers Gukavep's tile with all 4 of his drops found
- **THEN** the hover reads "Gukavep" over "All 4 drops found"
