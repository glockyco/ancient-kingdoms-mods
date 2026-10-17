## REMOVED Requirements

### Requirement: Mechanics changes are proven against committed snapshots

**Reason**: Literal prose snapshots pin wording rather than the game behavior that determines correctness.
**Migration**: Use numeric, eligibility and state-transition regressions together with direct producer scenarios, relevant game observations and browser inspection. Remove the obsolete snapshot command and its generated prose fixtures.

## ADDED Requirements

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
