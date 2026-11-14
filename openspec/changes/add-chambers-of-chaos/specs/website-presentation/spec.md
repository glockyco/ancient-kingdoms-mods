# Spec Delta

## ADDED Requirements

### Requirement: Chambers presentation is selected from real-page alternatives

The Chambers rules page SHALL receive a compare-options review of two to four structurally different real-page implementations before its visual structure or reader-facing wording ships. Every option SHALL answer named player questions using real data and artwork. A text-only rules list SHALL NOT satisfy the visual coverage requirement.

#### Scenario: Comparing proposed page structures

- **WHEN** presentation is reviewed
- **THEN** the comparison includes the current page or its absence, the options, a recommendation and None of these
- **AND** it shows each option in context at phone, desktop and layout-change widths

#### Scenario: An element may not help the player

- **WHEN** a proposed visual or sentence has no clear player action or question
- **THEN** at least one option omits it
- **AND** no option is selected solely by a model or persona reviewer

### Requirement: Chambers visualizations explain the decisions a run requires

The reviewed page SHALL include visual treatments of chamber sequence, trial kinds, enemy level, Health and Power across player level and total veteran points, reward quantity bands, entry-item drop chance by monster level and the run timeline. Excluded items SHALL use existing redacted placeholders without names, icons or links. Real in-run screenshots and game art SHALL accompany equivalent numeric facts and explanations in prerendered content.

#### Scenario: Inspecting scaling without interacting

- **WHEN** the initial HTML is fetched without running scripts
- **THEN** it contains the default scaling facts, input assumptions, reward bands and trial explanation
- **AND** charts are not the only way to recover their numbers or meanings

#### Scenario: Changing calculation inputs

- **WHEN** the reader changes entry level or total veteran points
- **THEN** the relevant charts and numeric explanations update together
- **AND** labels distinguish Health targets, Power and enemy-level probability from actual combat outcomes

### Requirement: Procedural-zone adaptation preserves established entity layouts

Chambers content SHALL fit the existing zone-page structure with procedural membership and real capture artwork in place of unavailable world geography. Ordinary zone, NPC and monster layouts SHALL remain unchanged except for their new factual Chambers relationships and role. No world map or fixed spawn SHALL be invented to fill an empty panel.

#### Scenario: A Chambers zone has no authored map

- **WHEN** its page renders
- **THEN** the page presents its actual entry, rewards and generated encounter context
- **AND** it does not show a broken or fabricated map panel

#### Scenario: An ordinary monster is also in the pool

- **WHEN** its existing page receives the Chambers relationship
- **THEN** the relationship links to the distinct tower context without redesigning its normal stats layout
