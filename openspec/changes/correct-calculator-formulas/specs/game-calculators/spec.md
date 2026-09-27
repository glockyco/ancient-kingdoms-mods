## Purpose

Keeps the compendium's interactive calculators faithful to the formulas the game code applies, so a player can trust a previewed number.

## ADDED Requirements

### Requirement: Calculators use the game's formula

An interactive calculator SHALL compute its result with the inputs, coefficients, and rounding that the cited game code uses. A calculator input SHALL be the quantity the game reads.

#### Scenario: The code changes a coefficient

- **WHEN** a calculator's cited source uses a coefficient that differs from the calculator
- **THEN** the calculator uses the coefficient from the source

### Requirement: The altar preview scales monsters like the event

The Forgotten Altar preview SHALL add the player level, `round(total veteran points / 40)`, and the monster's base level, minus 30. The rounding SHALL match `Mathf.RoundToInt`, which rounds a half to the nearest even number.

#### Scenario: Veteran points reach a half level

- **WHEN** the total veteran points are 20, 60, or 100
- **THEN** the preview adds 0, 2, or 2 levels respectively

#### Scenario: Veteran points pass a half level

- **WHEN** the total veteran points are 30
- **THEN** the preview adds 1 level

### Requirement: The herbalism calculator uses the game's plant tiers

The Herbalism calculator SHALL compute success as 100% for tier I, `0.3 + 2 × skill` for tier II, `0.15 + skill` for tier III, `1.05 × skill` for tier IV, and `skill` for tier V, each capped at 100%.

#### Scenario: A tier IV plant at 60% skill

- **WHEN** Herbalism skill is 60% and the plant is tier IV
- **THEN** the calculator shows a 63% success chance
