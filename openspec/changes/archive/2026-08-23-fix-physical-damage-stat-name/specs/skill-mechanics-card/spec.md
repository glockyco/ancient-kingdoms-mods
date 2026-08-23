## Purpose

Governs the mechanics card shown on each skill page, which reproduces the game's damage pipeline
so a player can predict an outcome. Its value depends entirely on matching the game, so this
capability constrains the names, formulas, and constants it is allowed to display.

## ADDED Requirements

### Requirement: Displayed stat names exist in the game

Every stat the mechanics card names SHALL be a stat the game implements. The card SHALL NOT
display a name that is absent from the game's own source.

Stat names SHALL be resolved by explicit lookup, never assembled by concatenating a fragment onto
a suffix, because concatenation can produce a plausible name for a stat that does not exist.

#### Scenario: Physical damage mitigation

- **WHEN** a skill's damage type is physical
- **THEN** the mitigation formula names `defense`
- **AND** it does not name `physicalResist`, which the game does not implement

#### Scenario: Elemental damage mitigation

- **WHEN** a skill's damage type is magic, fire, cold, poison, or disease
- **THEN** the mitigation formula names that type's resist stat, matching the game

#### Scenario: A damage type is renamed upstream

- **WHEN** the exported vocabulary for a damage type changes
- **AND** no matching stat name is defined for the new value
- **THEN** the failure is visible rather than producing an invented stat name

### Requirement: The damage type selects the avoidance formula

The card SHALL present the avoidance mechanic the game applies to that damage type. Physical
damage is avoided by a block-and-miss roll that reads the target's block chance. Elemental damage
is avoided by a resist roll that reads the matching resist stat. The card SHALL label and formulate
each accordingly.

#### Scenario: Physical skill

- **WHEN** a skill's damage type is physical
- **THEN** the card shows a block-and-miss heading
- **AND** the formula reads the target's block chance, not a resist stat

#### Scenario: Elemental skill

- **WHEN** a skill's damage type is elemental
- **THEN** the card shows a resist-chance heading
- **AND** the formula reads that type's resist stat

### Requirement: Mechanics changes are proven against committed snapshots

The rendered text of every mechanics card is covered by a committed snapshot. A change to the card
SHALL be accompanied by a snapshot run, and any diff SHALL be justified before the baseline is
updated. A snapshot baseline SHALL NOT be updated to accommodate output that contradicts the game.

Rationale: the snapshots detected this defect on the day it shipped. Updating them would have
recorded a stat that does not exist as the expected result.

#### Scenario: Output diverges from the baseline

- **WHEN** a change alters any mechanics card text
- **THEN** the snapshot check reports the affected skills
- **AND** the baseline is updated only after the new text is verified against the game source

#### Scenario: A fix restores previous output

- **WHEN** a change repairs a regression in the card
- **THEN** the snapshot check returns to zero differences without editing any fixture
