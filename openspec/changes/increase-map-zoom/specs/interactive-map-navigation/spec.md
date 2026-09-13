## Purpose

Defines the interactive map viewport range and its behavior when users zoom beyond the highest available tile level.

## ADDED Requirements

### Requirement: Closer map inspection

The interactive map MUST allow users to zoom to level 4 and MUST prevent zoom beyond level 4, including after bounds navigation.

#### Scenario: User zooms into a dense area

- **WHEN** the user selects or focuses an entity and then increases the map zoom
- **THEN** bounds navigation initially fits the entity at no more than zoom level 2
- **AND** the viewport can subsequently reach zoom level 4
- **AND** further zoom input does not move the viewport beyond level 4

### Requirement: Existing tile set remains authoritative

The interactive map MUST use the existing tile zoom range when the viewport is above the highest available tile level.

#### Scenario: User zooms beyond the tile maximum

- **WHEN** the viewport zoom is greater than the highest configured tile level
- **THEN** the map enlarges the highest available tiles
- **AND** the map does not request a new tile level
