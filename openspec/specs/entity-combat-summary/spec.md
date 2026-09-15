# Entity Combat Summary Specification

## Purpose

Define a consistent visual summary for combat-capable entities so readers can compare primary combat values without scanning separate detail sections.

## Requirements

### Requirement: Monster and NPC pages share a combat summary layout

Monster and NPC detail pages SHALL present the entity sprite, health, five elemental resistances, physical damage, magical damage, and defense in the same responsive summary layout. The summary SHALL use the combat values resolved for that page.

#### Scenario: A monster summary is displayed

- **WHEN** a reader opens a monster detail page
- **THEN** the summary displays the monster sprite and resolved primary combat values
- **AND** spawn-specific or level-specific monster values remain unchanged

#### Scenario: An NPC summary is displayed

- **WHEN** a reader opens an NPC detail page
- **THEN** the summary displays the NPC sprite and its level-resolved primary combat values
- **AND** the detailed combat section remains available

### Requirement: Summary metadata remains entity-specific

The shared summary SHALL present metadata that is meaningful for each entity domain. Monster summaries SHALL show available monster type and class values. NPC summaries SHALL show available race and faction values.

#### Scenario: Complete NPC metadata is available

- **WHEN** an NPC has race and faction values
- **THEN** the summary displays both values
- **AND** the faction remains linked to its faction page

#### Scenario: Optional NPC metadata is absent

- **WHEN** an NPC has no race or faction value
- **THEN** the summary omits the missing metadata row
- **AND** it does not display an invented fallback value

### Requirement: Combat summaries remain accessible without client JavaScript

The summary SHALL render its complete content in prerendered HTML and SHALL preserve a readable layout on narrow and wide viewports. Icons SHALL supplement accessible labels rather than replace them.

#### Scenario: A reader uses a narrow viewport

- **WHEN** the summary is displayed below the desktop breakpoint
- **THEN** the sprite remains visually primary
- **AND** the two stat columns remain readable without horizontal scrolling

#### Scenario: Client JavaScript is unavailable

- **WHEN** the prerendered detail page is loaded without client JavaScript
- **THEN** the complete combat summary remains present and readable
