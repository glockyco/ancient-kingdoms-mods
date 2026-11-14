# Spec Delta

## ADDED Requirements

### Requirement: Chambers challenge content is withheld until publication permission

Chambers riddle questions, choices and answers, and rune-puzzle titles, clues, words and solution order SHALL be withheld by default. Only content explicitly permitted by the recorded developer answer SHALL enter published outputs. Missing or invalid gate configuration SHALL fail closed. Generic trial objectives and penalties SHALL remain publishable without challenge content.

#### Scenario: The developer answer is pending

- **WHEN** the site is built before a publication answer is recorded
- **THEN** all riddle and rune-puzzle content is absent from the published database, HTML, payloads, search, browser database, scripts and artwork
- **AND** the page can still explain Riddle, Runes and Manuscript trial mechanics

#### Scenario: Only part of the content is permitted

- **WHEN** the recorded answer permits clue text but not solutions
- **THEN** only permitted fields can be published
- **AND** canonical rune order, answer indices and equivalent solution-revealing fields remain withheld

#### Scenario: Gate state is missing or malformed

- **WHEN** a build cannot resolve a valid challenge-publication configuration
- **THEN** publication fails rather than treating absence as permission

### Requirement: Spoiler controls do not authorize publication

A collapsed spoiler, hidden markup, unused module or client-side switch SHALL NOT bypass the challenge publication gate. Any permitted spoiler presentation SHALL be separately reviewed. Captures and image descriptions SHALL obey the same gate as structured challenge data.

#### Scenario: A hidden component embeds an answer

- **WHEN** a withheld answer occurs in a collapsed panel, page data or script bundle
- **THEN** publication verification fails even if no answer is visible on initial load

#### Scenario: A screenshot contains puzzle clues

- **WHEN** a selected capture includes withheld question text, rune labels, clue text or an answer sequence
- **THEN** that capture cannot be published while the applicable content remains withheld

### Requirement: Challenge withholding uses shared redaction accounting

Challenge content removals and field clearings SHALL pass through the shared redaction machinery and ledger. Gate verification SHALL scan the complete published surface set and SHALL NOT exempt newly added challenge tables or artwork.

#### Scenario: A new challenge field appears

- **WHEN** a game update adds a challenge field not explicitly covered by the permission policy
- **THEN** the field remains withheld
- **AND** its removal or clearing is accounted for rather than silently published

#### Scenario: Permission changes

- **WHEN** reviewed configuration changes which challenge content can be published
- **THEN** recomputed redaction decisions differ and require a deliberate ledger sync
- **AND** a stale ledger fails verification
