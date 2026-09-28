## ADDED Requirements

### Requirement: Profession icons follow readable game UI sources

A profession icon SHALL be exported only when its matching game UI slot contains a readable, non-placeholder sprite. Each exported icon SHALL identify its profession and its UI source. Missing UI state SHALL NOT be replaced with a guessed icon.

#### Scenario: The game exposes all profession icons

- **WHEN** each of the 13 profession UI slots supplies a readable sprite
- **THEN** the export records 13 `profession/icon` assets with distinct profession identifiers

#### Scenario: The game UI is unavailable

- **WHEN** the profession UI singleton or a slot has no readable icon
- **THEN** the export identifies the missing runtime source
- **AND** it does not publish a fabricated icon for that profession

#### Scenario: The same game state is exported twice

- **WHEN** the same build and profession UI state are exported twice
- **THEN** every exported profession icon has the same source identity, dimensions, and content bytes
