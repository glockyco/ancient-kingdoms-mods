## MODIFIED Requirements

### Requirement: The page holds the feedback actions

The page SHALL offer the report action and the idea action, each at all times, including while a feature is stopped after an error. Under them, the page SHALL read "You choose where: a form on GitHub, the #compendium channel on the game's Discord, or a message to wow_much." The idea action SHALL show the same three places as rows without copying anything, with the GitHub row opening the ideas form.

#### Scenario: A stopped feature

- **WHEN** Map pins stopped after an error and the player opens the page
- **THEN** the report action is available

#### Scenario: Suggesting an idea

- **WHEN** the player uses the idea action
- **THEN** the page reads "Choose where to share your idea:" over a GitHub row that opens the ideas form, a Discord Server row for #compendium and a Discord DM row for wow_much
- **AND** the clipboard keeps what it held
