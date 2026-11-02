## ADDED Requirements

### Requirement: Virtue definitions do not depend on the exporting character

The export SHALL record each virtue's name, rank point thresholds, rank titles, Blessing skill and each rank's English effect text from the game's own tables, and the points the game holds as data. These values SHALL NOT depend on the exporting character's virtues or on the client language. A virtue without a Blessing skill or a text SHALL fail the export.

#### Scenario: The exporting character has a blessing

- **WHEN** one build is exported by a character with an active Humility blessing and again by one without a blessing
- **THEN** both exports write the same virtue data

#### Scenario: The client shows another language

- **WHEN** the client language is Spanish during the export
- **THEN** the exported titles and effect texts are the English ones

#### Scenario: A virtue lacks its Blessing skill

- **WHEN** no Blessing skill names one of the six virtues
- **THEN** the export fails and names that virtue

### Requirement: Shrines are exported as placements

The export SHALL record each shrine in the world with its virtue, zone and authored position, under a placement identifier with the prefix `shrine_{virtue}_{zone}`. Prefabs and other objects outside the world scene SHALL NOT be exported.

#### Scenario: Two shrines for each virtue

- **WHEN** the world holds two shrines of each virtue, each in a different zone
- **THEN** the export writes twelve shrine placements, each naming its virtue and zone under its own identifier
