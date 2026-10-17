## ADDED Requirements

### Requirement: Copy explains player outcomes

The compendium SHALL describe player-visible outcomes, conditions and choices. It SHALL NOT present ordinary internal recomputation or synchronization as a special gameplay rule when the useful outcome is already stated. It SHALL preserve persistence, interruption, payment and timing rules that affect play.

#### Scenario: A veteran bonus is recalculated when summoned

- **WHEN** a page states the bonus a mercenary receives per total veteran point
- **THEN** it does not repeat the stat restoration mechanism as a second benefit
- **AND** it still explains any hire roll that remains fixed and affects hiring choices

### Requirement: Quantities and conditions are explicit

A label or summary SHALL distinguish maximum pools from current resources, healing and regeneration. A chance SHALL identify its event and relevant condition. Duration displays SHALL preserve meaningful seconds rather than silently floor to whole minutes. Calculator defaults SHALL describe a state the corresponding character or caster can have.

#### Scenario: Food increases the maximum pool

- **WHEN** food grants a Hit Points maximum bonus and Health Regeneration
- **THEN** its effect identifies maximum Hit Points separately from Health Regeneration
- **AND** its maximum-pool bonus cannot be mistaken for a heal

#### Scenario: A duration has leftover seconds

- **WHEN** a skill lasts 90 seconds or a respawn takes 150 seconds
- **THEN** the displayed duration preserves the 30 seconds after the whole minutes

#### Scenario: A companion damage example is shown

- **WHEN** a skill is used by a companion whose ranks start at one
- **THEN** its example does not use rank zero

### Requirement: One term identifies one concept across surfaces

The compendium SHALL use consistent player-facing stat, service, skill-type, source and spawn-condition names across pages, tables, filters, search and map displays. Internal identifiers SHALL NOT appear as explanatory labels or accessible names. Game names and quoted game text SHALL remain intact.

#### Scenario: An item grants a skill effect

- **WHEN** the skill page lists the granting item
- **THEN** it describes food, potion, relic or on-hit use in words rather than a raw source-type identifier

#### Scenario: A chest link needs a name

- **WHEN** a table or popup links to a chest placement
- **THEN** its visible or accessible identity uses meaningful player context rather than an internal placement ID

### Requirement: Repetition does not hide meaningful differences

Equivalent source entries SHALL be grouped without losing differences in zone, chance or acquisition condition. Shared rules SHALL be separated from class-specific facts. A comparison with multiple conditions SHALL use a form that makes its alternatives clear. Repeated statistics or headings SHALL be removed only when a complete authoritative display and necessary anchors remain.

#### Scenario: Fishing locations share a resource name

- **WHEN** equivalent sources share a name, zone and chance
- **THEN** their presentation does not repeat indistinguishable rows
- **AND** sources with different zones or chances remain distinguishable

### Requirement: Metadata reflects actual identity and requirements

Titles, search results and descriptions SHALL identify their subject using verified context. Descriptions SHALL state actual learning requirements, skill tiers, acquisition conditions and target scope. They SHALL NOT replace missing specificity with raw IDs or unsupported statements.

#### Scenario: A class skill has a tier and prerequisite

- **WHEN** a Tier 4 skill requires spent class points and a predecessor skill
- **THEN** its description does not show Tier V or imply that character level one alone unlocks it

#### Scenario: Named entities occur in several families

- **WHEN** an item and a skill have the same name
- **THEN** the title or search context distinguishes the two subjects without misclassifying either
