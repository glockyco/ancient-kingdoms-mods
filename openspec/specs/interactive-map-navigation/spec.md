# Interactive Map Navigation Specification

## Purpose

Defines the interactive map viewport range and its behavior when users zoom beyond the highest available tile level.

## Requirements

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

### Requirement: Non-inertial map pan

The interactive map MUST stop pan motion when the reader releases a mouse or touch drag. The camera MUST NOT continue to move or snap back after the release.

#### Scenario: Reader releases a fast touch swipe

- **WHEN** the reader swipes the map with one finger and lifts the finger
- **THEN** the camera stays at the position where the finger lifted
- **AND** the persisted map position does not change after the release

#### Scenario: Reader releases a mouse drag

- **WHEN** the reader drags the map with the mouse and releases the button
- **THEN** the camera stops at the release position

### Requirement: Map keyboard controls expose focus and names

The map canvas MUST show a clear focus indicator when it accepts keyboard input. Each range-filter thumb MUST expose its own minimum or maximum purpose and a readable value to assistive technology.

#### Scenario: Keyboard focus enters the map

- **WHEN** a visitor tabs to the map canvas
- **THEN** the focused canvas has a visible focus indicator

#### Scenario: Keyboard focus enters a range filter

- **WHEN** a visitor tabs to a monster level or resource tier thumb
- **THEN** assistive technology identifies the filter and whether it controls the minimum or maximum
- **AND** resource tiers expose readable numeric tier values

### Requirement: Map popups retain location and objective details

Quest popups MUST display every required inventory item and identify discovery objectives by their place rather than their notification message. A discovery objective with exported coordinates MUST have a selectable map marker and a control that focuses it. NPC popups MUST display known sub-zones. Resource drop rows MUST display exported yield ranges beside their chances.

#### Scenario: Delivery quest requires an additional item

- **WHEN** a quest has both gather items and secondary required items
- **THEN** its map popup displays both sets

#### Scenario: Discovery has a known location

- **WHEN** a selected quest has an exported discovery location
- **THEN** its popup names the place and provides a control to focus its map marker
