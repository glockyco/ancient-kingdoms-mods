## ADDED Requirements

### Requirement: Non-inertial map pan

The interactive map MUST stop pan motion when the reader releases a mouse or touch drag. The camera MUST NOT continue to move or snap back after the release.

#### Scenario: Reader releases a fast touch swipe

- **WHEN** the reader swipes the map with one finger and lifts the finger
- **THEN** the camera stays at the position where the finger lifted
- **AND** the persisted map position does not change after the release

#### Scenario: Reader releases a mouse drag

- **WHEN** the reader drags the map with the mouse and releases the button
- **THEN** the camera stops at the release position
