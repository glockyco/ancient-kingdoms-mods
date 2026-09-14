## ADDED Requirements

### Requirement: Bard mechanics follow the current game formulas

The skill mechanics card SHALL describe Bard songs as active auras when the game re-evaluates eligible recipients while the song remains active. Leadership SHALL show the additive attribute contribution as `round((WIS + CON + CHA) / 2)`.

#### Scenario: A Bard song page is displayed

- **WHEN** a skill is an active Bard song
- **THEN** the mechanics card identifies the song's duration as the aura lifetime
- **AND** it states that recipient eligibility is re-evaluated while the song remains active

#### Scenario: Leadership is displayed

- **WHEN** the Leadership skill page displays its attribute scaling
- **THEN** it shows `round((WIS + CON + CHA) / 2)`
- **AND** it includes that contribution in the displayed physical and magical damage bonuses
