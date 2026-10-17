## Purpose

Governs the mechanics card shown on each skill page, which reproduces the game's damage pipeline
so a player can predict an outcome. Its value depends entirely on matching the game, so this
capability constrains the names, formulas, and constants it is allowed to display.

## Requirements

### Requirement: Displayed stat names exist in the game

Every stat the mechanics card names SHALL be a stat the game implements. The card SHALL NOT
display a name that is absent from the game's own source.

Stat names SHALL be resolved by explicit lookup, never assembled by concatenating a fragment onto
a suffix, because concatenation can produce a plausible name for a stat that does not exist.

#### Scenario: Physical damage mitigation

- **WHEN** a skill's damage type is physical
- **THEN** the card names Armor Class as the stat that reduces the hit
- **AND** it does not name a physical resist, which the game does not implement

#### Scenario: Elemental damage mitigation

- **WHEN** a skill's damage type is magic, fire, cold, poison, or disease
- **THEN** the card names that type's resist stat, matching the game

#### Scenario: A damage type is renamed upstream

- **WHEN** the exported vocabulary for a damage type changes
- **AND** no matching stat name is defined for the new value
- **THEN** the failure is visible rather than producing an invented stat name

### Requirement: The damage type selects the avoidance formula

The card SHALL name the avoidance mechanic the game applies to that damage type and link to the combat page section that states its formula. Physical damage is avoided by a block-and-miss roll that reads the target's block chance and Armor Class. Elemental damage is avoided by a resist roll that reads the matching resist stat.

#### Scenario: Physical skill

- **WHEN** a skill's damage type is physical
- **THEN** the card names block and miss and the target's Armor Class
- **AND** it links to the combat page section on avoidance

#### Scenario: Elemental skill

- **WHEN** a skill's damage type is elemental
- **THEN** the card names the resist roll and that type's resist stat
- **AND** it links to the combat page section on resistance

### Requirement: Bard mechanics follow the current game formulas

The skill mechanics card SHALL describe Bard songs as timed auras. Leadership SHALL state the additive attribute contribution as half of Wisdom, Constitution, and Charisma added together, rounded.

#### Scenario: A Bard song page is displayed

- **WHEN** a skill is an active Bard song
- **THEN** the mechanics card identifies the song's active duration

#### Scenario: Leadership is displayed

- **WHEN** the Leadership skill page displays its attribute scaling
- **THEN** it states half of Wisdom, Constitution, and Charisma added together, rounded
- **AND** it includes that contribution in the displayed physical and magical damage bonuses

### Requirement: Mechanics changes have behavior evidence

A change to a mechanics calculation or stated rule SHALL be verified against the implementing game code and exercised through a relevant scenario. Permanent regression tests SHALL cover consumer-visible quantities, boundaries, eligibility or state transitions rather than incidental wording. A change to rendered presentation SHALL be checked in the browser.

#### Scenario: A companion example uses an invalid rank

- **WHEN** an example incorrectly treats a companion skill as rank zero
- **THEN** its regression verifies a permitted rank and the resulting damage
- **AND** changing the explanation's wording does not require replacing a prose baseline

#### Scenario: A description is clarified without changing arithmetic

- **WHEN** copy changes while the calculation and its conditions stay the same
- **THEN** behavior regressions continue to verify the same outcomes
- **AND** browser inspection verifies that the quantities and conditions remain understandable
