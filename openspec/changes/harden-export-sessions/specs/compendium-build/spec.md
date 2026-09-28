## ADDED Requirements

### Requirement: Database composition reads one complete runtime session and separate curated inputs

A build SHALL verify one promoted runtime session against its manifest before reading runtime data. It SHALL read curated `classes.json` and `static_data.json` separately. Those curated inputs SHALL NOT appear in the runtime export manifest. The build SHALL fail before database publication when a session, curated input, locale, or composition identity is missing or incompatible.

#### Scenario: Runtime and curated inputs are compatible

- **WHEN** one manifest-verified runtime session and both required curated inputs are compatible
- **THEN** the build composes them into the database without mutating either source

#### Scenario: Runtime outputs come from different runs

- **WHEN** a runtime file is copied from another run or its digest disagrees with the chosen session
- **THEN** the build fails rather than combining the files
- **AND** the previous successfully built database remains available

#### Scenario: Curated input is missing or incompatible

- **WHEN** curated class or static data is absent or cannot compose with the runtime data
- **THEN** the build fails without replacing the last successfully built database

#### Scenario: The session locale is not the published locale

- **WHEN** the chosen session declares a different locale
- **THEN** the build fails and names the declared and expected locales
