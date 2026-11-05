# Spec Delta

## MODIFIED Requirements

### Requirement: One feature's failure does not stop the others

When a feature fails, Pocket Compendium SHALL switch that feature off, record the failure once in the MelonLoader log, and keep every other feature running. The feature's settings row SHALL read "Stopped after an error." with a Report button, and its switch SHALL show it off. Switching it on SHALL turn the feature on again in the same session.

#### Scenario: Map pins fail

- **WHEN** drawing map pins throws
- **THEN** map pins stop, the log holds one error, and the boss list keeps updating

#### Scenario: Turning a stopped feature on in the settings

- **WHEN** Map pins has stopped and the player switches it on in Respawns
- **THEN** map pins draw again and the row no longer reads "Stopped after an error."

## ADDED Requirements

### Requirement: The notice card can be placed in advance

The General page SHALL have a "Notices" row with a "Show example" button and the help "Shows an example card so you can move it where you want it." The button SHALL show an example card in the place a stop's card uses, in the gold look, reading "Example: notices show here" over "Drag this card where you want it.", with a Done button that closes it.

#### Scenario: Showing the example

- **WHEN** the player clicks "Show example" on the General page
- **THEN** a gold card reads "Example: notices show here" over "Drag this card where you want it." with a Done button

### Requirement: The notice card is placed like a panel

The notice card, the example included, SHALL first appear bottom left above the chat. It SHALL move, keep its place across sessions and lock like a panel, and return to its first place with the panels' Reset.

#### Scenario: Placing the card

- **WHEN** the player clicks "Show example", drags the example card to the top right and clicks Done
- **THEN** the next card for a stopped feature shows at the top right
