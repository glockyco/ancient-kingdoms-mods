## Purpose

The interactive map's item popup shows where the selected item comes from, including item containers that have no location of their own. Readers can inspect each source without mistaking a virtual source for a map marker.

## ADDED Requirements

### Requirement: Pack containers appear as item sources

The item popup MUST list every pack that supplies the selected item. Each entry MUST show the pack name and the amount of the selected item, and MUST let readers inspect that pack as an item.

#### Scenario: An item comes from a pack

- **WHEN** the selected item occurs in one or more packs
- **THEN** the popup shows a Found in Packs section with each pack's name and item amount
- **AND** selecting a pack opens that pack's item selection

#### Scenario: No pack source

- **WHEN** the selected item has no pack sources
- **THEN** the popup does not show an empty Found in Packs section

### Requirement: Random containers appear as item sources

The item popup MUST list every random container that supplies the selected item. Each entry MUST show the container name and the selected item's probability, and MUST let readers inspect that container as an item.

#### Scenario: An item comes from random loot

- **WHEN** the selected item occurs in one or more random containers
- **THEN** the popup shows a Found in Random Loot section with each container's name and percentage chance
- **AND** selecting a container opens that container's item selection

#### Scenario: No random source

- **WHEN** the selected item has no random-container sources
- **THEN** the popup does not show an empty Found in Random Loot section

### Requirement: Virtual sources do not promise a map location

The popup MUST show pack and random sources even when they are the item's only sources. A virtual container alone MUST NOT enable an action to focus physical map locations.

#### Scenario: A container-only item

- **WHEN** an item has pack or random sources but no physical map source
- **THEN** the popup shows its container sources
- **AND** it does not offer a physical-location focus action solely because of those containers
