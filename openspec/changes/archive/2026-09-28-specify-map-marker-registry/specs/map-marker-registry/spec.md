## Purpose

Defines how positioned map records become identifiable marker groups, visible map layers, and consistent map controls.

## ADDED Requirements

### Requirement: Positioned records use one marker partition

The map MUST place each positioned record into one matching marker group. If classifications overlap, the highest partition precedence MUST win; equal highest precedences MUST fail instead of assigning an arbitrary group. Records without positions MUST NOT create point markers.

#### Scenario: Overlapping monster classifications
- **WHEN** a monster is both a boss and fabled
- **THEN** its positioned spawn appears in the fabled marker group once

#### Scenario: Record lacks a position
- **WHEN** a monster record has no map position
- **THEN** it creates no point marker

### Requirement: Marker presentation is consistent across consumers

Each marker group MUST provide one stable identity and presentation for its point layer, sidebar control, map icon, and tooltip label. The map MUST paint marker groups in their declared order, independently of partition precedence. Existing marker URL keys MUST remain stable.

#### Scenario: Monster classification and paint order
- **WHEN** the map displays fabled and boss spawns
- **THEN** they use their respective marker presentations
- **AND** their paint order remains independent of the precedence that selected their groups

### Requirement: NPC roles are facets rather than separate marker identities

The map MUST partition notable and ordinary NPCs without making each service role a separate marker identity. Role controls MUST filter ordinary NPCs by their role flags.

#### Scenario: NPC with two service roles
- **WHEN** an ordinary NPC provides two services and both role controls are active
- **THEN** the NPC appears once in the ordinary NPC point layer

### Requirement: Toggling a marker group changes its visibility

Marker toggles MUST retain the group's render rows and hide or reveal its layer without changing the group's identity. Level filters MUST apply to monster and applicable gathering layers; spark and other gathering markers MUST remain outside the gathering tier filter.

#### Scenario: Toggle boss visibility
- **WHEN** a visitor hides and reveals bosses
- **THEN** the boss markers disappear and reappear without changing marker identities

#### Scenario: Apply a gathering tier filter
- **WHEN** a visitor excludes a gathering tier
- **THEN** applicable gathering markers in that tier disappear
- **AND** radiant spark markers remain subject only to their own visibility control
