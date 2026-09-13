## Purpose

Defines the interactive map viewport range and its behavior when users zoom beyond the highest available tile level.

## ADDED Requirements

### Requirement: Closer map inspection

The interactive map MUST allow users to zoom to level 6 and MUST prevent zoom beyond level 6.

#### Scenario: User zooms into a dense area

- **WHEN** the user increases the map zoom
- **THEN** the viewport can reach zoom level 6
- **AND** further zoom input does not move the viewport beyond level 6

### Requirement: Existing tile set remains authoritative

The interactive map MUST use the existing tile zoom range when the viewport is above the highest available tile level.

#### Scenario: User zooms beyond the tile maximum

- **WHEN** the viewport zoom is greater than the highest configured tile level
- **THEN** the map enlarges the highest available tiles
- **AND** the map does not request a new tile level
