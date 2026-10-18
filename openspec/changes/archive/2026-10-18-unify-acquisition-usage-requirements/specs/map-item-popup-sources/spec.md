## Purpose

Show a selected map item's sources in the item popup's established compact lists, with values from the shared acquisition reader and focus limited to eligible provider geometry.

## ADDED Requirements

### Requirement: Popup source rows use the shared reader

The item popup SHALL fill its established source lists (dropped by, sold by, gathered from, altar rewards, found in chests, quest rewards, crafted from, merged from and dug up with) from the shared acquisition reader. A row SHALL appear only for an eligible, published source, with the same identity, quantity and probability as the item detail page.

#### Scenario: Same source on page and map

- **WHEN** an item detail page and the map popup show the same source
- **THEN** the provider, delivered quantity and chance agree

#### Scenario: Ineligible placement

- **WHEN** a monster template has a placement whose loot context cannot award the item
- **THEN** that placement does not create a dropped-by row or focus location

#### Scenario: Pack delivered by purchase

- **WHEN** buying a pack delivers several units of the selected item directly
- **THEN** the sold-by row shows the vendor's price and the delivered quantity
- **AND** the popup does not describe a carried pack that must be opened

### Requirement: Drop chances name their Fatecharm

A dropped-by row SHALL show the chance without a Fatecharm. When a matching dungeon Fatecharm changes the chance, hovering, tapping or focusing the chance SHALL show the boosted chance and name and link the Fatecharm item that is consumed.

#### Scenario: Boss with a dungeon Fatecharm

- **WHEN** the reader opens the chance of a boss drop whose loot zone has a Fatecharm
- **THEN** the boosted chance and that Fatecharm item are shown
- **AND** selecting the Fatecharm opens its item selection on the map

### Requirement: Focus follows eligible geometry only

The popup SHALL offer a focus action only for direct provider geometry that is published and eligible. A source whose provider position is suppressed or whose method is nonspatial SHALL keep its row without coordinates or a focus action for that source.

#### Scenario: Source in a position-suppressed zone

- **WHEN** an item's only source lies in a zone whose positions are suppressed
- **THEN** its row remains available
- **AND** no coordinates, bounds or focus action are reconstructed

### Requirement: Source links keep map navigation

An ordinary click on a source link SHALL select that entity within the map. A modifier click SHALL follow its URL. Keyboard access and the popup's bounded scrolling SHALL remain available.

#### Scenario: Source link uses a navigation modifier

- **WHEN** a reader modifier-clicks a source link
- **THEN** its URL navigation remains available
- **AND** ordinary selection still opens the source within the map
