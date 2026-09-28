## Purpose

Defines consistent physical map selection, popup behavior, marker-owned visual relationships, and the supported shareable map URL.

## ADDED Requirements

### Requirement: Every physical selection has one marker-owned identity

A click, search result, or restored map URL MUST identify the same physical selection. Monster selections MUST group spawns by monster ID, not spawn ID. A directly selected fishing spot MUST highlight its selection group; an item-source override MUST highlight only the matching source. If a selected entity has no position, its popup MUST remain available without a point highlight.

#### Scenario: Monster spawn selection
- **WHEN** a visitor clicks one positioned spawn of a monster
- **THEN** its popup describes the clicked spawn and the map highlights that monster's positioned spawns

#### Scenario: Excluded-zone entity selection
- **WHEN** a visitor follows a map link to an entity without a permitted map position
- **THEN** its popup remains available without a location marker

#### Scenario: Item selects a fishing source
- **WHEN** an item source identifies one fishing-spot variant
- **THEN** only that variant receives the item-source highlight

### Requirement: Popup dispatch retains every entity family

Desktop cards and mobile drawers MUST show the same information and link actions for each selected physical, zone, item, and quest family. Marker-owned popup routing MUST not replace per-family details with a generic summary. A selected monster without a position but linked to altars MUST highlight its linked altars.

#### Scenario: Open a portal from a map link
- **WHEN** a visitor opens a portal on desktop or mobile
- **THEN** its popup presents that portal's destination and applicable requirements

#### Scenario: Select altar-only monster
- **WHEN** a visitor selects an unpositioned monster with linked altars
- **THEN** the monster popup opens and those altars receive a highlight

### Requirement: Decorations follow their owning physical markers

The map MUST keep patrol paths, wander ranges, relation arcs, altar event radii, trap areas, and portal, trap, and teleporter destinations associated with their source marker families. Decoration production MUST preserve their selection, visibility, and draw order. Every retained decoration declaration MUST create a corresponding production effect; unused declarations MUST be removed.

#### Scenario: Select a patrolling monster
- **WHEN** a visitor selects a monster with patrol waypoints
- **THEN** the map shows its patrol route with the selected monster

#### Scenario: Select a trap with an area
- **WHEN** a visitor selects a trap with an area boundary
- **THEN** its highlighted area and destination remain associated with that trap

### Requirement: Marker URLs retain identity without zone focus

Existing marker visibility keys and `entity`/`etype` selection links MUST keep their meanings. `szone` MUST continue to select a zone popup. The map MUST NOT provide zone-focus filtering or emit a `zone` focus parameter; old links containing `zone` MUST still load without a focus effect.

#### Scenario: Restore a selected zone
- **WHEN** a visitor opens `/map?szone=<zone-id>`
- **THEN** the corresponding zone popup opens

#### Scenario: Open a former focus link
- **WHEN** a visitor opens a map link with `zone=<zone-id>`
- **THEN** the map displays its normal unfiltered marker set
- **AND** no zone-focus control is shown
