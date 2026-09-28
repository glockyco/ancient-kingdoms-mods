## ADDED Requirements

### Requirement: Runtime artwork comes from real game sprites

The export SHALL record a readable source image and its source identity for each selected visual asset. The manifest SHALL identify its entity, domain, artwork kind, source path, and source dimensions. A missing sprite SHALL NOT be replaced with a generic default item icon.

#### Scenario: An item has a direct icon

- **WHEN** an item has an assigned image sprite
- **THEN** its `item/icon` asset comes from that sprite
- **AND** the manifest names the direct sprite field

#### Scenario: An item resolves an icon by name

- **WHEN** an item lacks a direct sprite but its icon name resolves to a non-default collection icon
- **THEN** the export records that resolved icon and its collection source

#### Scenario: An item has no real icon

- **WHEN** an item has no direct sprite or non-default collection icon
- **THEN** the export creates no `item/icon` manifest row for it

### Requirement: Exported artwork identifies its game-backed family

The export SHALL support primary art for monsters, NPCs, non-mercenary pets, and chests. It SHALL support icons for items, skills, classes, gathering resources, and mercenary pets. An item with a summoned pet or a treasure-map image SHALL carry that asset under its separate `pet` or `treasure_map` kind.

#### Scenario: A mercenary has variable appearance

- **WHEN** the export encounters a mercenary
- **THEN** it exports its static party emblem as `pet/icon`
- **AND** it does not export an arbitrary assembled portrait as `pet/primary`

#### Scenario: A gathering resource has a journal icon

- **WHEN** a gathering resource has a journal icon
- **THEN** the export uses that icon as `gathering_resource/icon`
- **AND** it does not treat a font-glyph index as an image

#### Scenario: An item includes other artwork

- **WHEN** an item has a pet prefab or a treasure-map image
- **THEN** the export records the corresponding `item/pet` or `item/treasure_map` asset separately from its icon
