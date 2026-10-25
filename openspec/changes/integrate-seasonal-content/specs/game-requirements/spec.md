## ADDED Requirements

### Requirement: Season conditions follow the game's date windows

A season condition SHALL hold when the supplied current UTC date lies inside the season's window, both endpoints included, and a window that crosses the year boundary SHALL wrap. Without a supplied current time the condition SHALL be unknown. A static page SHALL describe the window rather than evaluate it.

#### Scenario: New year during the Winter Festival

- **WHEN** the supplied current time is January 3 UTC
- **THEN** the Winter Festival condition holds

#### Scenario: Static item page

- **WHEN** a prerendered page shows a seasonal source without a supplied current time
- **THEN** it names the season and its dates
- **AND** it does not state that the source is available or unavailable now
