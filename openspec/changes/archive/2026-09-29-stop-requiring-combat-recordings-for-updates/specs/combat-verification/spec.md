## MODIFIED Requirements

### Requirement: Committed observations are the baseline

Observation files SHALL be committed under version control and reviewed as diffs. The comparison SHALL
run as a website test against the committed files. A temporary diagnostic trace SHALL NOT take part in
the comparison. An observation whose assembly hash differs from the current source snapshot SHALL be
reported as stale and SHALL NOT count as current evidence. A stale observation SHALL NOT block a
game-version update. A full-domain claim SHALL require a current passing observation for every
committed fixture, checked by the explicit strict gate.

#### Scenario: The game is updated

- **WHEN** the source snapshot records a new assembly hash
- **THEN** every existing observation is reported stale
- **AND** the version update can complete without re-recording them

#### Scenario: A full-domain claim is made

- **WHEN** the strict gate runs while any fixture lacks a current passing observation
- **THEN** the gate fails and names each such fixture

#### Scenario: A diagnostic trace is absent

- **WHEN** a committed compact observation contains every required sample value
- **THEN** verification uses that observation without the temporary diagnostic trace
