# Spec Delta

## MODIFIED Requirements

### Requirement: A stopped feature makes itself known

When a feature stops after an error, a card SHALL show until the player closes it, titled with the feature, such as "World markers stopped", over "An error turned it off.", with a Report button that takes the report action and a "Turn on again" button. The card SHALL show each time a feature stops, once for each stop. Neither the game's message band nor the chat SHALL carry a line about the stop. The other features SHALL keep running.

#### Scenario: Map pins stop

- **WHEN** Map pins throws during an update
- **THEN** a card reads "Map pins stopped" over "An error turned it off." with Report and "Turn on again"
- **AND** the boss list keeps updating

#### Scenario: Turning a feature on again

- **WHEN** the player clicks "Turn on again" on the card for Map pins
- **THEN** the card closes and map pins draw again

#### Scenario: The same error again

- **WHEN** Map pins stops, the player turns it on again, and it throws again
- **THEN** one new card shows for Map pins
