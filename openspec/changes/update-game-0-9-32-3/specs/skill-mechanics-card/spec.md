## ADDED Requirements

### Requirement: Bard mechanics follow the current game formulas

The skill mechanics card SHALL describe Bard songs as maintained auras when the game refreshes their effects while the performer continues the song. Leadership SHALL show the additive attribute contribution as `round((WIS + CON + CHA) / 2)`.

#### Scenario: A Bard song page is displayed

- **WHEN** a skill is a maintained Bard song
- **THEN** the mechanics card identifies it as an aura that refreshes while the performer continues the song
- **AND** it does not describe the refreshed effect as a fixed-duration cast

#### Scenario: Leadership is displayed

- **WHEN** the Leadership skill page displays its attribute scaling
- **THEN** it shows `round((WIS + CON + CHA) / 2)`
- **AND** it includes that contribution in the displayed physical and magical damage bonuses
