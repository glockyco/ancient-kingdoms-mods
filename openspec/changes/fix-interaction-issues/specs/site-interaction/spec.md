## ADDED Requirements

### Requirement: Fields do not zoom the page

A field that takes typing or a choice SHALL show text of at least 16px unless a mouse is the main pointer and the screen is at least 768px wide. The site SHALL turn off double-tap zoom and keep pinch zoom.

#### Scenario: A reader taps a filter's search field on a phone

- **WHEN** a reader taps the search field of an item list filter on a phone
- **THEN** the field's text is 16px, so iOS does not zoom the page

### Requirement: A finger-opened list keeps the keyboard closed

A filter or zone list that a tap opens SHALL leave focus on the control that opened it. A list that a key or a mouse opens SHALL move focus to its search field.

#### Scenario: A reader opens a filter with a tap

- **WHEN** a reader taps the Type filter of the item list on a phone
- **THEN** the options open and no field has focus

#### Scenario: A reader opens a filter with the keyboard

- **WHEN** a reader presses Enter on the Type filter
- **THEN** the filter's search field has focus

### Requirement: Taps land on what they touch

A tap or click on a control inside a table that scrolls sideways SHALL NOT scroll the table. Keyboard focus on a control that the table's fading edge covers SHALL scroll the control into view.

#### Scenario: A reader taps an item name in a narrow table

- **WHEN** a reader taps an item name that the table's fading edge partly covers
- **THEN** the table does not move, and the item opens

#### Scenario: A keyboard reader tabs to a covered link

- **WHEN** keyboard focus reaches a link under the table's fading edge
- **THEN** the table scrolls the link clear of the edge

### Requirement: The Browse menu keeps an opened group in view

When the Browse menu shows one group at a time, opening a group SHALL keep the group's heading in the menu's visible area.

#### Scenario: A reader opens Mechanics after scrolling the menu

- **WHEN** a reader scrolls the menu to the end of Character and opens Mechanics
- **THEN** the Mechanics heading is at the top of the visible menu
