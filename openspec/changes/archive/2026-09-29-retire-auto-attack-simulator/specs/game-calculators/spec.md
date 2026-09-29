## ADDED Requirements

### Requirement: No unverified combat simulator is published

The site SHALL NOT publish a combat damage simulator whose results are not backed by the verified combat engine. `/tools/combat-simulator` SHALL NOT be published, and no page, search result, or sitemap entry SHALL link to it.

Rationale: the retired page estimated auto-attack damage without tests, a target model, or randomness, so its figures could disagree with the game without any check catching it.

#### Scenario: A visitor opens the retired path

- **WHEN** a visitor requests `/tools/combat-simulator`
- **THEN** the site answers with its not-found response

#### Scenario: A visitor searches for a simulator

- **WHEN** a visitor searches for "combat simulator"
- **THEN** no result links to `/tools/combat-simulator`
