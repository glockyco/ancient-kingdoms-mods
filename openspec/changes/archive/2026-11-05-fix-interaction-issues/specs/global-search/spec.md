## ADDED Requirements

### Requirement: The palette is usable on touch screens

Every control that opens the site search or the map search SHALL focus the search field while it handles the tap or click that opens it. On a screen narrower than 640px the search SHALL fill the part of the screen that the reader sees, above an on-screen keyboard, with the field in its first row. On wider screens the search dialog SHALL open near the top of the page and grow downward. The field SHALL keep its position while results arrive.

#### Scenario: A reader taps the search button on a phone

- **WHEN** a reader taps the header search button on a phone
- **THEN** the search fills the screen with the field at the top
- **AND** the field has focus before the tap's handling ends, so the keyboard opens

#### Scenario: Results arrive

- **WHEN** a reader types a query and results replace the empty state
- **THEN** the field stays where it was when the search opened

#### Scenario: The keyboard covers part of the screen

- **WHEN** the visible part of the screen shrinks while the search is open
- **THEN** the search ends at the bottom of the visible part, and the result list scrolls within it
