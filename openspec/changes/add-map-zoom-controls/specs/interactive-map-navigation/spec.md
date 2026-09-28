## ADDED Requirements

### Requirement: Visible map zoom controls

The interactive map MUST provide labelled Zoom in and Zoom out buttons on desktop and mobile. Each activation MUST change the map zoom while preserving its current center and MUST respect the existing minimum and maximum zoom levels.

#### Scenario: Zoom in by button

- **WHEN** a reader activates Zoom in below the maximum zoom
- **THEN** the map zoom increases without changing the current center
- **AND** the selected map entity remains selected

#### Scenario: Zoom controls reach a limit

- **WHEN** the map is at its minimum or maximum zoom
- **THEN** the corresponding zoom button is unavailable
- **AND** activating that control cannot move the map beyond the limit

### Requirement: Focusable map region supports keyboard navigation

The map viewport MUST be reachable by keyboard and exposed as a named map region. While that region has focus, Plus or Equal MUST zoom in, Minus MUST zoom out, and arrow keys MUST pan in their indicated directions. These keyboard actions MUST respect the same zoom limits and non-inertial pan behavior as pointer navigation.

#### Scenario: Keyboard user navigates the map

- **WHEN** a reader tabs to the named map region, presses Plus, then presses Right Arrow
- **THEN** the map zooms in and pans right without requiring a pointer
- **AND** the updated viewport is reflected by the map's shareable position

#### Scenario: Map region does not have focus

- **WHEN** a reader presses map navigation keys while focus is outside the map region
- **THEN** the map does not intercept those keys or change its viewport

#### Scenario: Keyboard navigation reaches a zoom limit

- **WHEN** the focused map is at its maximum zoom and a reader presses Plus or Equal
- **THEN** the viewport stays at the maximum zoom
